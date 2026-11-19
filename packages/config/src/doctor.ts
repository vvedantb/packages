import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// `vvedantb-doctor` inspects a repo for drift from the shared CI/tooling house rules and
// exits non-zero with a clear list when it finds any. It walks the workspace packages
// (pnpm-workspace.yaml and npm `workspaces`), reads only package.json, config file names,
// a workspace file and the CI workflow text, and makes no network calls. Each check has a
// stable id; a repo can waive a named check with a written reason (see `loadWaivers`), and
// a waived check prints as waived, not silently skipped.
//
// Exit codes (CLI): 0 no drift, 1 drift found, 2 bad usage.

export type DoctorIo = {
  log: (message: string) => void;
  error: (message: string) => void;
  cwd: () => string;
};

export type CheckStatus = "pass" | "fail" | "waived";

export interface CheckResult {
  /** Stable id used for waivers and `--json`. */
  id: string;
  title: string;
  status: CheckStatus;
  /** Problem lines (empty when the check passes). */
  details: string[];
  /** The written reason, when the check is waived. */
  waiver?: string;
}

/** The ordered ids of every check the doctor runs. */
export const CHECK_IDS = [
  "no-eslint",
  "no-prettier",
  "no-plain-tsc",
  "tsrs-present",
  "oxlint-dep",
  "oxlint-script",
  "config-version",
  "ci-reusable-workflow",
  "ci-runner",
  "ci-commands",
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  prettier?: unknown;
  vvedantbDoctor?: { waivers?: Record<string, unknown>; ciCommands?: Record<string, unknown> };
}

export interface PackageEntry {
  /** Absolute directory holding the package.json. */
  dir: string;
  /** Path relative to the repo root, forward slashes. The root is ".". */
  rel: string;
  json: PackageJson;
}

export interface RepoModel {
  root: string;
  packages: PackageEntry[];
}

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".expo", "out"]);

function subdirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !SKIP_DIRS.has(entry.name))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && (trimmed[0] === '"' || trimmed[0] === "'") && trimmed.at(-1) === trimmed[0]) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readJson(path: string): PackageJson | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
  } catch {
    return undefined;
  }
}

/** Workspace globs from pnpm-workspace.yaml, parsed without a YAML dependency. */
function parsePnpmWorkspace(root: string): string[] {
  const file = join(root, "pnpm-workspace.yaml");
  if (!existsSync(file)) return [];
  const globs: string[] = [];
  let inPackages = false;
  // A leading byte-order mark would hide `packages:` on the first line.
  const text = readFileSync(file, "utf8").replace(/^﻿/, "");
  for (const raw of text.split(/\r?\n/)) {
    if (/^packages\s*:/.test(raw)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    const item = raw.match(/^\s+-\s+(.+?)\s*$/);
    if (item?.[1]) {
      globs.push(stripQuotes(item[1]));
      continue;
    }
    if (raw.trim() === "") continue;
    // A dedented or indented non-list line ends the `packages:` block.
    inPackages = false;
  }
  return globs;
}

/** Workspace globs from a root package.json `workspaces` field. */
function npmWorkspaceGlobs(json: PackageJson | undefined): string[] {
  const field = json?.workspaces;
  if (Array.isArray(field)) return field;
  if (field?.packages) return field.packages;
  return [];
}

function segmentMatch(segment: string, name: string): boolean {
  if (!segment.includes("*")) return segment === name;
  const pattern = segment.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*");
  return new RegExp(`^${pattern}$`).test(name);
}

/** Directories under `base` matching the `/`-split glob segments. */
function walkGlob(base: string, segments: string[]): string[] {
  if (segments.length === 0) return [base];
  const [segment, ...rest] = segments;
  if (segment === undefined) return [base];
  const results: string[] = [];
  if (segment === "**") {
    results.push(...walkGlob(base, rest));
    for (const child of subdirs(base)) results.push(...walkGlob(join(base, child), segments));
    return results;
  }
  for (const child of subdirs(base)) {
    if (segmentMatch(segment, child)) results.push(...walkGlob(join(base, child), rest));
  }
  return results;
}

function matchGlob(root: string, pattern: string): string[] {
  return walkGlob(root, pattern.split("/").filter((s) => s.length > 0));
}

/** Expand workspace globs to the absolute directories they match, honouring `!` excludes. */
function expandWorkspaces(root: string, globs: string[]): string[] {
  const include = new Set<string>();
  const exclude = new Set<string>();
  for (const glob of globs) {
    const negated = glob.startsWith("!");
    const target = negated ? exclude : include;
    for (const dir of matchGlob(root, negated ? glob.slice(1) : glob)) target.add(dir);
  }
  return [...include].filter((dir) => !exclude.has(dir));
}

/** Read the repo: the root package.json and every workspace package.json. */
export function loadRepo(root: string): RepoModel {
  const rootJson = readJson(join(root, "package.json"));
  const packages: PackageEntry[] = [{ dir: root, rel: ".", json: rootJson ?? {} }];

  const globs = [...new Set([...parsePnpmWorkspace(root), ...npmWorkspaceGlobs(rootJson)])];
  for (const dir of expandWorkspaces(root, globs)) {
    if (dir === root) continue;
    const json = readJson(join(dir, "package.json"));
    if (!json) continue;
    packages.push({ dir, rel: relative(root, dir).replaceAll("\\", "/"), json });
  }
  return { root, packages };
}

function depNames(json: PackageJson): string[] {
  const names: string[] = [];
  for (const field of DEP_FIELDS) {
    const map = json[field];
    if (map) names.push(...Object.keys(map));
  }
  return names;
}

function depRange(json: PackageJson, name: string): string | undefined {
  for (const field of DEP_FIELDS) {
    const map = json[field];
    if (map && name in map) return map[name];
  }
  return undefined;
}

function hasFile(dir: string, names: readonly string[]): string | undefined {
  for (const name of names) {
    if (existsSync(join(dir, name))) return name;
  }
  return undefined;
}

const ESLINT_CONFIG_FILES = [
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.mjs",
  ".eslintrc.json",
  ".eslintrc.yml",
  ".eslintrc.yaml",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
];

const PRETTIER_CONFIG_FILES = [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.json5",
  ".prettierrc.yml",
  ".prettierrc.yaml",
  ".prettierrc.toml",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".prettierrc.mjs",
  "prettier.config.js",
  "prettier.config.cjs",
  "prettier.config.mjs",
];

function isEslintDep(name: string): boolean {
  return (
    name === "eslint" ||
    name.startsWith("eslint-") ||
    name.startsWith("@eslint/") ||
    name.startsWith("@typescript-eslint/")
  );
}

function isPrettierDep(name: string): boolean {
  return name === "prettier" || name.startsWith("prettier-") || name.startsWith("@prettier/");
}

function runs(command: string, bin: string): boolean {
  return new RegExp(`(?:^|[\\s&|;(])${bin}(?=\\s|$|[&|;)])`).test(command);
}

function result(id: CheckId, title: string, details: string[]): CheckResult {
  return { id, title, status: details.length > 0 ? "fail" : "pass", details };
}

export function checkNoEslint(repo: RepoModel): CheckResult {
  const details: string[] = [];
  for (const pkg of repo.packages) {
    for (const name of depNames(pkg.json)) {
      if (isEslintDep(name)) details.push(`${pkg.rel} depends on ${name}`);
    }
    const file = hasFile(pkg.dir, ESLINT_CONFIG_FILES);
    if (file) details.push(`${pkg.rel === "." ? "" : `${pkg.rel}/`}${file}: ESLint config file`);
  }
  return result("no-eslint", "No ESLint dependency or config", details);
}

export function checkNoPrettier(repo: RepoModel): CheckResult {
  const details: string[] = [];
  for (const pkg of repo.packages) {
    for (const name of depNames(pkg.json)) {
      if (isPrettierDep(name)) details.push(`${pkg.rel} depends on ${name}`);
    }
    const file = hasFile(pkg.dir, PRETTIER_CONFIG_FILES);
    if (file) details.push(`${pkg.rel === "." ? "" : `${pkg.rel}/`}${file}: Prettier config file`);
    if (pkg.json.prettier !== undefined) details.push(`${pkg.rel} package.json has a "prettier" key`);
  }
  return result("no-prettier", "No Prettier dependency or config", details);
}

function isTypecheckOrLintScript(name: string): boolean {
  return name === "typecheck" || name === "lint" || name.startsWith("typecheck:") || name.startsWith("lint:");
}

export function checkNoPlainTsc(repo: RepoModel): CheckResult {
  const details: string[] = [];
  for (const pkg of repo.packages) {
    for (const [name, command] of Object.entries(pkg.json.scripts ?? {})) {
      if (isTypecheckOrLintScript(name) && runs(command, "tsc")) {
        details.push(`${pkg.rel} script "${name}" runs plain tsc: ${command}`);
      }
    }
  }
  return result("no-plain-tsc", "No typecheck or lint script runs plain tsc", details);
}

function repoHasTypeScript(repo: RepoModel): boolean {
  for (const pkg of repo.packages) {
    if (depNames(pkg.json).includes("typescript")) return true;
    if (hasFile(pkg.dir, ["tsconfig.json"])) return true;
    const scripts = pkg.json.scripts ?? {};
    if (Object.keys(scripts).some((name) => name === "typecheck" || name.startsWith("typecheck:"))) return true;
  }
  return false;
}

export function checkTsrsPresent(repo: RepoModel): CheckResult {
  if (!repoHasTypeScript(repo)) return result("tsrs-present", "tsrs is the typechecker where the repo has TypeScript", []);
  const hasTsrs = repo.packages.some((pkg) => depNames(pkg.json).includes("tsrs"));
  const details = hasTsrs ? [] : ["repo has TypeScript but no package declares a tsrs dependency"];
  return result("tsrs-present", "tsrs is the typechecker where the repo has TypeScript", details);
}

export function checkOxlintDep(repo: RepoModel): CheckResult {
  const hasOxlint = repo.packages.some((pkg) => depNames(pkg.json).includes("oxlint"));
  const details = hasOxlint ? [] : ["no package declares an oxlint dependency"];
  return result("oxlint-dep", "oxlint is a dependency", details);
}

export function checkOxlintScript(repo: RepoModel): CheckResult {
  const hasLint = repo.packages.some((pkg) =>
    Object.values(pkg.json.scripts ?? {}).some((command) => runs(command, "oxlint")),
  );
  const details = hasLint ? [] : ["no package has a script that runs oxlint"];
  return result("oxlint-script", "A lint script runs oxlint", details);
}

/** The leading major.minor of a version range, or undefined for a non-numeric range (workspace:*, *, latest). */
export function rangeMinorFloor(range: string): { major: number; minor: number } | undefined {
  const match = range.match(/(\d+)\.(\d+)(?:\.\d+)?/);
  if (!match?.[1] || match[2] === undefined) return undefined;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

/** True when `range`'s minimum is older than `running`'s major.minor. */
export function isOlderMinor(range: string, running: string): boolean {
  const floor = rangeMinorFloor(range);
  const runningFloor = rangeMinorFloor(running);
  if (!floor || !runningFloor) return false;
  if (floor.major !== runningFloor.major) return floor.major < runningFloor.major;
  return floor.minor < runningFloor.minor;
}

export function checkConfigVersion(repo: RepoModel, runningVersion: string): CheckResult {
  const details: string[] = [];
  for (const pkg of repo.packages) {
    const range = depRange(pkg.json, "@vvedantb/config");
    if (range && isOlderMinor(range, runningVersion)) {
      details.push(`${pkg.rel} has @vvedantb/config ${range}, older than the running ${runningVersion}`);
    }
  }
  return result("config-version", "@vvedantb/config is current to the running minor", details);
}

const CI_WORKFLOW_REF = "vvedantb/packages/.github/workflows/ci-app.yml";

export function checkCiReusableWorkflow(repo: RepoModel): CheckResult {
  const dir = join(repo.root, ".github", "workflows");
  if (!existsSync(dir)) {
    return result("ci-reusable-workflow", "CI calls the shared ci-app.yml workflow", ["no .github/workflows directory"]);
  }
  let found = false;
  for (const name of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(name)) continue;
    try {
      if (readFileSync(join(dir, name), "utf8").includes(CI_WORKFLOW_REF)) found = true;
    } catch {
      // Unreadable workflow file: ignore and keep scanning.
    }
  }
  const details = found ? [] : [`no workflow calls ${CI_WORKFLOW_REF}`];
  return result("ci-reusable-workflow", "CI calls the shared ci-app.yml workflow", details);
}

function workflowFiles(root: string): { name: string; text: string }[] {
  const dir = join(root, ".github", "workflows");
  if (!existsSync(dir)) return [];
  const files: { name: string; text: string }[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!/\.ya?ml$/.test(name)) continue;
    try {
      files.push({ name, text: readFileSync(join(dir, name), "utf8") });
    } catch {
      // Unreadable workflow file: ignore and keep scanning.
    }
  }
  return files;
}

/** The plain `boat` runner label. Every boat.dev job runs on `boat-large` (8 cores, 15 GB). */
const SMALL_RUNNER = "boat";

/**
 * Fails on a job that names the small `boat` runner, as `runs-on: boat` or as the `runs_on: boat`
 * input of a reusable workflow. GitHub-hosted labels and `boat-large` pass.
 */
export function checkCiRunner(repo: RepoModel): CheckResult {
  const details: string[] = [];
  for (const file of workflowFiles(repo.root)) {
    file.text.split(/\r?\n/).forEach((line, index) => {
      const match = line.match(/^\s*(?:-\s+)?(runs[-_]on)\s*:\s*(.+?)\s*(?:#.*)?$/);
      if (!match?.[1] || match[2] === undefined) return;
      const labels = match[2]
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((label) => stripQuotes(label));
      if (labels.includes(SMALL_RUNNER)) {
        details.push(`.github/workflows/${file.name}:${index + 1} ${match[1]} is ${SMALL_RUNNER}; use boat-large`);
      }
    });
  }
  return result("ci-runner", "No job runs on the small boat runner", details);
}

/** The lines of every `commands: |` block in the workflows that call the shared ci-app.yml. */
export function ciCommands(repo: RepoModel): { file: string; command: string }[] {
  const found: { file: string; command: string }[] = [];
  for (const file of workflowFiles(repo.root)) {
    if (!file.text.includes(CI_WORKFLOW_REF)) continue;
    let blockIndent = -1;
    for (const line of file.text.split(/\r?\n/)) {
      const indent = line.length - line.trimStart().length;
      if (blockIndent >= 0) {
        if (line.trim() === "") continue;
        if (indent > blockIndent) {
          const command = line.trim();
          if (!command.startsWith("#")) found.push({ file: file.name, command });
          continue;
        }
        blockIndent = -1;
      }
      if (/^\s*commands\s*:\s*[|>][-+]?\s*$/.test(line)) blockIndent = indent;
    }
  }
  return found;
}

const STANDARD_SCRIPTS = new Set(["lint", "typecheck", "test"]);

/**
 * True for the commands every repo runs: `pnpm lint`, `pnpm typecheck` and `pnpm test`, with
 * `npm run` or `bun run` in place of `pnpm`, and with an optional `--filter <package>`.
 * Anything else (a script with a suffix, a `node` script, a build) is an extra.
 */
export function isStandardCiCommand(command: string): boolean {
  const words = command.trim().split(/\s+/);
  const runner = words.shift();
  if (runner !== "pnpm" && runner !== "npm" && runner !== "bun") return false;
  if (words[0] === "--filter" || words[0] === "-F") words.splice(0, 2);
  else if (words[0]?.startsWith("--filter=")) words.shift();
  if (words[0] === "run") words.shift();
  const [script] = words;
  return words.length === 1 && script !== undefined && STANDARD_SCRIPTS.has(script);
}

/**
 * Fails on a CI command that is not one of the standard three and has no written reason, and on
 * a reason for a command that CI no longer runs. This stops one repo from carrying a check that
 * no other repo has without a record of why.
 */
export function checkCiCommands(repo: RepoModel, reasons: Record<string, string>): CheckResult {
  const details: string[] = [];
  const seen = new Set<string>();
  for (const { file, command } of ciCommands(repo)) {
    seen.add(command);
    if (isStandardCiCommand(command) || reasons[command] !== undefined) continue;
    details.push(`.github/workflows/${file} runs "${command}" with no reason in ciCommands`);
  }
  for (const command of Object.keys(reasons)) {
    if (!seen.has(command)) details.push(`ciCommands has a reason for "${command}", which CI does not run; remove it`);
  }
  return result("ci-commands", "Every CI command beyond lint, typecheck and test has a written reason", details);
}

export interface DoctorCheckOptions {
  runningVersion: string;
  waivers?: Record<string, string>;
  /** Written reasons for CI commands beyond the standard three, keyed by the exact command. */
  ciCommandReasons?: Record<string, string>;
}

/** Run every check against the repo at `root`, applying waivers. */
export function runDoctorChecks(root: string, options: DoctorCheckOptions): CheckResult[] {
  const repo = loadRepo(root);
  const waivers = options.waivers ?? {};
  const results: CheckResult[] = [
    checkNoEslint(repo),
    checkNoPrettier(repo),
    checkNoPlainTsc(repo),
    checkTsrsPresent(repo),
    checkOxlintDep(repo),
    checkOxlintScript(repo),
    checkConfigVersion(repo, options.runningVersion),
    checkCiReusableWorkflow(repo),
    checkCiRunner(repo),
    checkCiCommands(repo, options.ciCommandReasons ?? {}),
  ];
  return results.map((r) => {
    const reason = waivers[r.id];
    return reason === undefined ? r : { ...r, status: "waived" as const, waiver: reason };
  });
}

export interface LoadedWaivers {
  waivers: Record<string, string>;
  /** Written reasons for extra CI commands, keyed by the exact command. */
  ciCommands: Record<string, string>;
  warnings: string[];
}

const KNOWN_IDS: ReadonlySet<string> = new Set(CHECK_IDS);

/**
 * Waivers and CI command reasons from `.vvedantb-doctor.json`
 * (`{ "waivers": { "<id>": "<reason>" }, "ciCommands": { "<command>": "<reason>" } }`) or the root
 * package.json `vvedantbDoctor.waivers`. The file wins over package.json. A waiver needs a
 * non-empty reason and a known id; one that does not is dropped with a warning.
 */
export function loadWaivers(root: string): LoadedWaivers {
  const warnings: string[] = [];
  const raw: Record<string, unknown> = {};
  const rawCommands: Record<string, unknown> = {};

  const pkg = readJson(join(root, "package.json"));
  Object.assign(raw, pkg?.vvedantbDoctor?.waivers ?? {});
  Object.assign(rawCommands, pkg?.vvedantbDoctor?.ciCommands ?? {});

  const file = join(root, ".vvedantb-doctor.json");
  if (existsSync(file)) {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as {
        waivers?: Record<string, unknown>;
        ciCommands?: Record<string, unknown>;
      };
      Object.assign(raw, parsed.waivers ?? {});
      Object.assign(rawCommands, parsed.ciCommands ?? {});
    } catch {
      warnings.push(".vvedantb-doctor.json is not valid JSON; ignoring it");
    }
  }

  const waivers: Record<string, string> = {};
  for (const [id, reason] of Object.entries(raw)) {
    if (!KNOWN_IDS.has(id)) {
      warnings.push(`waiver for unknown check "${id}" ignored`);
      continue;
    }
    if (typeof reason !== "string" || reason.trim() === "") {
      warnings.push(`waiver for "${id}" has no written reason; not applied`);
      continue;
    }
    waivers[id] = reason.trim();
  }
  const ciCommands: Record<string, string> = {};
  for (const [command, reason] of Object.entries(rawCommands)) {
    if (typeof reason !== "string" || reason.trim() === "") {
      warnings.push(`ciCommands entry "${command}" has no written reason; not applied`);
      continue;
    }
    ciCommands[command.trim()] = reason.trim();
  }
  return { waivers, ciCommands, warnings };
}

function readRunningVersion(): string {
  try {
    const json = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version?: string;
    };
    return json.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const USAGE = `Usage: vvedantb-doctor [root] [--json]

  root     Repo root to inspect. Default: current directory.
  --json   Print the results as JSON.

Checks (each has a stable id): ${CHECK_IDS.join(", ")}.
Waive a check in .vvedantb-doctor.json ({ "waivers": { "<id>": "<reason>" } }) or the
root package.json "vvedantbDoctor".waivers. A waived check prints as waived.
Give each CI command beyond lint, typecheck and test a reason in the same file:
{ "ciCommands": { "<command>": "<reason>" } }.

Exit code: 0 no drift, 1 drift found, 2 bad usage.`;

/** Run the CLI. Returns the process exit code. */
export function runDoctor(argv: readonly string[], io: DoctorIo): number {
  let root = io.cwd();
  let json = false;
  let gotRoot = false;
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      io.log(USAGE);
      return 0;
    }
    if (arg === "--json") {
      json = true;
    } else if (arg.startsWith("--")) {
      io.error(`Unknown option: ${arg}\n${USAGE}`);
      return 2;
    } else if (!gotRoot) {
      root = resolve(io.cwd(), arg);
      gotRoot = true;
    } else {
      io.error(`Unexpected argument: ${arg}\n${USAGE}`);
      return 2;
    }
  }

  const runningVersion = readRunningVersion();
  const { waivers, ciCommands: ciCommandReasons, warnings } = loadWaivers(root);
  const results = runDoctorChecks(root, { runningVersion, waivers, ciCommandReasons });
  const failed = results.filter((r) => r.status === "fail");

  if (json) {
    io.log(JSON.stringify({ root, runningVersion, ok: failed.length === 0, warnings, results }, null, 2));
    return failed.length > 0 ? 1 : 0;
  }

  for (const warning of warnings) io.error(`warning: ${warning}`);
  for (const r of results) {
    if (r.status === "waived") {
      io.log(`waived  ${r.id}  ${r.title} — ${r.waiver ?? ""}`);
    } else if (r.status === "pass") {
      io.log(`ok      ${r.id}  ${r.title}`);
    } else {
      io.error(`DRIFT   ${r.id}  ${r.title}`);
      for (const line of r.details) io.error(`          ${line}`);
    }
  }

  if (failed.length > 0) {
    io.error(`\n${failed.length} check(s) found drift in ${root}. Fix them or waive with a reason.`);
    return 1;
  }
  io.log(`\nNo drift in ${root}.`);
  return 0;
}

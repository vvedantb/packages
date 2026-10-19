import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { builtinModules, createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Checks a packaged Electron app.asar for runtime modules the build left out. Two modes:
// - list: reads the archive with @electron/asar and requires node_modules/<package>/package.json for every
//   package that the built files on disk import.
// - resolve: plain Node cannot read an asar, so the CLI runs itself inside the packaged binary with
//   ELECTRON_RUN_AS_NODE=1 and resolves every bare import of the files inside the asar from there.

export type CheckAsarIo = {
  log: (message: string) => void;
  error: (message: string) => void;
  cwd: () => string;
  env: Readonly<Record<string, string | undefined>>;
  /** This CLI's own file, which `resolve` runs again inside the Electron binary. */
  selfPath: string;
};

export type AsarCheckHookContext = {
  /** Absolute path of app.asar (readable as a directory inside the Electron binary). */
  asar: string;
};

/**
 * Default export of a `--hook` module, run inside the Electron binary after the import check (`resolve` mode).
 * Returns problems, each printed as `FAIL <problem>`; nothing or an empty list means it passed.
 */
export type AsarCheckHook = (
  context: AsarCheckHookContext,
) => readonly string[] | void | Promise<readonly string[] | void>;

/** Set in the environment of the run inside the Electron binary. */
export const CHECK_ASAR_CHILD_ENV = "VVEDANTB_CHECK_ASAR_CHILD";

const USAGE = `Usage:
  vvedantb-check-asar list [app.asar] [--default-asar <path>]... [--scan <dir>]... [--require <package>]... [--root <dir>]
  vvedantb-check-asar resolve [binary] [app.asar] [--default-binary <path>] [--scan <dir>]... [--skip-dir <name>]... [--hook <module>] [--root <dir>]

  list      Read app.asar with @electron/asar. Every package imported by the JS under each
            --scan dir (relative to --root) and every --require package needs
            node_modules/<package>/package.json in the archive.
            app.asar: the argument, else $ASAR, else the first --default-asar that exists.
  resolve   Run inside the packaged binary (ELECTRON_RUN_AS_NODE=1). Every bare import of the
            JS under each --scan dir (relative to app.asar; --skip-dir names are skipped at any
            depth) must resolve from app.asar. Then the --hook module's default export runs.
            binary: the argument, else --default-binary. app.asar: the argument, else
            <binary dir>/resources/app.asar.
  --root    Base for relative --default-asar, --default-binary, --scan (list) and --hook. Default: cwd.`;

type ListOptions = { asar?: string; defaultAsars: string[]; scans: string[]; requires: string[]; root: string };
type ResolveOptions = { positional: string[]; defaultBinary?: string; scans: string[]; skipDirs: string[]; hook?: string; root: string };

type Parsed<T> = { ok: true; options: T } | { ok: false; message: string };

const LIST_FLAGS = new Set(["--default-asar", "--scan", "--require", "--root"]);
const RESOLVE_FLAGS = new Set(["--default-binary", "--scan", "--skip-dir", "--hook", "--root"]);

function parseFlags(argv: readonly string[], known: ReadonlySet<string>): Parsed<{ positional: string[]; flags: Map<string, string[]> }> {
  const positional: string[] = [];
  const flags = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    if (!known.has(arg)) return { ok: false, message: `Unknown option: ${arg}` };
    const value = argv[i + 1];
    if (value === undefined) return { ok: false, message: `${arg} needs a value` };
    flags.set(arg, [...(flags.get(arg) ?? []), value]);
    i += 1;
  }
  return { ok: true, options: { positional, flags } };
}

function single(flags: Map<string, string[]>, name: string): Parsed<string | undefined> {
  const values = flags.get(name) ?? [];
  if (values.length > 1) return { ok: false, message: `${name} can be given once` };
  return { ok: true, options: values[0] };
}

/** Maps an import specifier to its package name, or null if the runtime provides it (`list` mode). */
export function packageName(specifier: string): string | null {
  if (specifier.startsWith("node:") || specifier.startsWith(".") || specifier.startsWith("/")) return null;
  const parts = specifier.split("/");
  const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? specifier);
  return PROVIDED.has(name) || PROVIDED.has(specifier) ? null : name;
}

const PROVIDED: ReadonlySet<string> = new Set(["electron", ...builtinModules]);

/** Finds import and require specifiers in built JavaScript (`list` mode). */
export function findSpecifiers(source: string): Set<string> {
  const found = new Set<string>();
  // A specifier never holds spaces or commas, so text such as ["the", "from", "will"] in a bundled word list is not an import.
  const patterns = [/\bfrom\s*["']([^"'\s,]+)["']/g, /\bimport\s*["']([^"'\s,]+)["']/g, /\b(?:require|import)\(\s*["']([^"'\s,]+)["']\s*\)/g];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) if (match[1] !== undefined) found.add(match[1]);
  }
  return found;
}

const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

/** Finds bare import and require specifiers (not electron, not a Node built-in), subpaths kept (`resolve` mode). */
export function findBareImports(source: string): Set<string> {
  const found = new Set<string>();
  for (const match of source.matchAll(IMPORT_SPECIFIER)) {
    const spec = match[1];
    if (spec === undefined || spec.startsWith(".") || spec.startsWith("/")) continue;
    if (spec.startsWith("node:") || spec === "electron") continue;
    if (builtinModules.includes(spec.split("/")[0] ?? spec)) continue;
    found.add(spec);
  }
  return found;
}

const JS_FILE = /\.(c|m)?js$/;

/** JS files under `dir`, recursively. A missing dir has none. */
function listJsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && JS_FILE.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

/** JS files under `dir`, skipping directories named in `skip` at any depth. Throws if `dir` is missing. */
function resolveJsFiles(dir: string, skip: ReadonlySet<string>): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return skip.has(entry.name) ? [] : resolveJsFiles(path, skip);
    return JS_FILE.test(entry.name) ? [path] : [];
  });
}

function parseList(argv: readonly string[], io: CheckAsarIo): Parsed<ListOptions> {
  const parsed = parseFlags(argv, LIST_FLAGS);
  if (!parsed.ok) return parsed;
  const { positional, flags } = parsed.options;
  if (positional.length > 1) return { ok: false, message: `Unexpected argument: ${positional[1] ?? ""}` };
  const root = single(flags, "--root");
  if (!root.ok) return root;
  return {
    ok: true,
    options: {
      asar: positional[0],
      defaultAsars: flags.get("--default-asar") ?? [],
      scans: flags.get("--scan") ?? [],
      requires: flags.get("--require") ?? [],
      root: resolve(io.cwd(), root.options ?? "."),
    },
  };
}

function parseResolve(argv: readonly string[], io: CheckAsarIo): Parsed<ResolveOptions> {
  const parsed = parseFlags(argv, RESOLVE_FLAGS);
  if (!parsed.ok) return parsed;
  const { positional, flags } = parsed.options;
  if (positional.length > 2) return { ok: false, message: `Unexpected argument: ${positional[2] ?? ""}` };
  const root = single(flags, "--root");
  if (!root.ok) return root;
  const defaultBinary = single(flags, "--default-binary");
  if (!defaultBinary.ok) return defaultBinary;
  const hook = single(flags, "--hook");
  if (!hook.ok) return hook;
  const scans = flags.get("--scan") ?? [];
  if (scans.length === 0) return { ok: false, message: "resolve needs at least one --scan" };
  return {
    ok: true,
    options: {
      positional,
      defaultBinary: defaultBinary.options,
      scans,
      skipDirs: flags.get("--skip-dir") ?? [],
      hook: hook.options,
      root: resolve(io.cwd(), root.options ?? "."),
    },
  };
}

async function runList(options: ListOptions, io: CheckAsarIo): Promise<number> {
  const asar = options.asar || io.env["ASAR"] || options.defaultAsars.map((path) => join(options.root, path)).find(existsSync);
  if (!asar || !existsSync(resolve(io.cwd(), asar))) {
    io.error(`app.asar not found (tried ${asar ?? options.defaultAsars.join(", ")}). Pass a path or set ASAR.`);
    return 1;
  }
  const { listPackage } = await import("@electron/asar");
  const entries = new Set(listPackage(resolve(io.cwd(), asar), { isPack: false }).map((entry) => entry.replaceAll("\\", "/").replace(/^\//, "")));
  const required = new Set(options.requires);
  for (const dir of options.scans) {
    for (const file of listJsFiles(join(options.root, dir))) {
      for (const specifier of findSpecifiers(readFileSync(file, "utf8"))) {
        const name = packageName(specifier);
        if (name) required.add(name);
      }
    }
  }
  const sorted = [...required].sort();
  const missing = sorted.filter((name) => !entries.has(`node_modules/${name}/package.json`));
  io.log(`Checked ${sorted.length} packages in ${asar}: ${sorted.join(", ")}`);
  if (missing.length > 0) {
    io.error(`Missing from app.asar: ${missing.join(", ")}`);
    return 1;
  }
  io.log("check-asar-modules: OK");
  return 0;
}

function runResolveParent(options: ResolveOptions, io: CheckAsarIo): number {
  const given = options.positional[0] ?? (options.defaultBinary === undefined ? undefined : resolve(options.root, options.defaultBinary));
  if (given === undefined) {
    io.error(`resolve needs a binary or --default-binary\n${USAGE}`);
    return 2;
  }
  const binary = resolve(io.cwd(), given);
  const asar = resolve(io.cwd(), options.positional[1] ?? join(dirname(binary), "resources", "app.asar"));
  if (!existsSync(asar)) {
    io.error(`No asar at ${asar}. Package the app first.`);
    return 1;
  }
  const forwarded = [
    ...options.scans.flatMap((dir) => ["--scan", dir]),
    ...options.skipDirs.flatMap((name) => ["--skip-dir", name]),
    ...(options.hook === undefined ? [] : ["--hook", resolve(options.root, options.hook)]),
  ];
  const result = spawnSync(binary, [io.selfPath, "resolve", asar, ...forwarded], {
    stdio: "inherit",
    env: { ...io.env, ELECTRON_RUN_AS_NODE: "1", [CHECK_ASAR_CHILD_ENV]: "1" },
  });
  return result.status ?? 1;
}

async function runHook(file: string, context: AsarCheckHookContext): Promise<string[]> {
  // The module is the app's; the checks below stand in for its declared type.
  const mod: { default?: AsarCheckHook } = await import(pathToFileURL(file).href);
  const hook = mod.default;
  if (typeof hook !== "function") return [`hook ${file} has no default export function`];
  const result = await hook(context);
  if (result === undefined) return [];
  if (!Array.isArray(result)) return [`hook ${file} must return a list of problems`];
  return result.map(String);
}

/** The run inside the Electron binary: argv is `[app.asar, ...flags]` with an absolute asar and hook. */
async function runResolveChild(options: ResolveOptions, io: CheckAsarIo): Promise<number> {
  const asar = options.positional[0] ?? "";
  const problems: string[] = [];
  const requireFromAsar = createRequire(join(asar, "package.json"));
  const skip = new Set(options.skipDirs);

  // 1. Every unbundled JS import must resolve from inside the asar.
  const files = options.scans.flatMap((dir) => resolveJsFiles(join(asar, dir), skip));
  const specs = new Set<string>();
  for (const file of files) {
    for (const spec of findBareImports(readFileSync(file, "utf8"))) specs.add(spec);
  }
  for (const spec of specs) {
    try {
      requireFromAsar.resolve(spec);
    } catch (error) {
      problems.push(`unresolved import "${spec}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  io.log(`checked ${files.length} JS files, ${specs.size} unbundled imports`);

  // 2. The app's own checks (native files, booting a bundled path, ...).
  if (options.hook !== undefined) problems.push(...(await runHook(options.hook, { asar })));

  if (problems.length > 0) {
    for (const problem of problems) io.error(`FAIL ${problem}`);
    return 1;
  }
  io.log("CHECK_ASAR_OK");
  return 0;
}

/** Run the CLI. Resolves to the process exit code: 0 passed, 1 failed (or no asar), 2 bad arguments. */
export async function runCheckAsar(argv: readonly string[], io: CheckAsarIo): Promise<number> {
  const [mode, ...rest] = argv;
  if (mode === undefined || mode === "--help" || mode === "-h") {
    io.log(USAGE);
    return mode === undefined ? 2 : 0;
  }
  if (mode !== "list" && mode !== "resolve") {
    io.error(`Unknown mode: ${mode}\n${USAGE}`);
    return 2;
  }
  if (mode === "list") {
    const parsed = parseList(rest, io);
    if (!parsed.ok) {
      io.error(`${parsed.message}\n${USAGE}`);
      return 2;
    }
    return runList(parsed.options, io);
  }
  const parsed = parseResolve(rest, io);
  if (!parsed.ok) {
    io.error(`${parsed.message}\n${USAGE}`);
    return 2;
  }
  return io.env[CHECK_ASAR_CHILD_ENV] === "1" ? runResolveChild(parsed.options, io) : runResolveParent(parsed.options, io);
}

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type PlannedChange = {
  /** Path relative to the consumer repo root, with forward slashes. */
  path: string;
  content: string;
  action: "create" | "update";
};

export type SyncOptions = {
  cwd: string;
  /** Report drift without writing. */
  check?: boolean;
};

export type SyncResult = {
  changes: PlannedChange[];
  /** Problems that stopped a file from being planned (for example bad JSON). */
  errors: string[];
};

const TEMPLATE_DIR = new URL("../files/claude/commands/", import.meta.url);
const COMMAND_FILES = ["stage.md", "changelog.md", "push.md", "ship.md"] as const;

/** Installs the Claude Code CLI when missing. Sudo first, then a `~/.local` prefix. */
export const CLAUDE_INSTALL_SNIPPET =
  'if ! command -v claude >/dev/null 2>&1; then (sudo npm install -g @anthropic-ai/claude-code) || (mkdir -p "$HOME/.local" && npm install -g --prefix "$HOME/.local" @anthropic-ai/claude-code && export PATH="$HOME/.local/bin:$PATH"); fi';

/** Recommended `install` for `.cursor/environment.json`. */
export const ENVIRONMENT_INSTALL = `${CLAUDE_INSTALL_SNIPPET}; pnpm install`;

const CONVEX_EXTENDS = "@vvedantb/config/tsconfig/convex.json";

type ClaudeSection = { heading: string; body: string };

const CLAUDE_SECTIONS: readonly ClaudeSection[] = [
  {
    heading: "## Git / ship",
    body: [
      "- NEVER create a new branch, push, or open a PR unless the user asks.",
      "- If already on main and the user asks to ship: commit and push directly to main.",
    ].join("\n"),
  },
  {
    heading: "## Always",
    body: [
      "- Think first; simplest solution wins.",
      "- Prefer simplicity. No premature abstractions.",
    ].join("\n"),
  },
  {
    heading: "## Domain docs (read when relevant)",
    body: "- (add pointers to this app's docs)",
  },
  {
    heading: "## Product facts",
    body: "- (app-specific; @vvedantb/config sync will not overwrite this section)",
  },
];

const CLAUDE_TITLE = "FOLLOW ALL OF THESE RULES";

function readIfExists(file: string): string | null {
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

function isDirectory(dir: string): boolean {
  return existsSync(dir) && statSync(dir).isDirectory();
}

function toChange(
  rel: string,
  existing: string | null,
  content: string,
): PlannedChange | null {
  if (existing === content) return null;
  return { path: rel, content, action: existing === null ? "create" : "update" };
}

function planCommands(cwd: string): PlannedChange[] {
  const out: PlannedChange[] = [];
  for (const name of COMMAND_FILES) {
    const template = readFileSync(new URL(name, TEMPLATE_DIR), "utf8");
    const rel = `.claude/commands/${name}`;
    const change = toChange(rel, readIfExists(join(cwd, rel)), template);
    if (change) out.push(change);
  }
  return out;
}

function buildClaudeSkeleton(): string {
  const sections = CLAUDE_SECTIONS.map((s) => `${s.heading}\n${s.body}`);
  return `${CLAUDE_TITLE}\n\n${sections.join("\n\n")}\n`;
}

function planClaudeMd(cwd: string): PlannedChange | null {
  const rel = "CLAUDE.md";
  const existing = readIfExists(join(cwd, rel));
  if (existing === null) return toChange(rel, null, buildClaudeSkeleton());

  const lines = new Set(existing.split(/\r?\n/).map((line) => line.trim()));
  const missing = CLAUDE_SECTIONS.filter((s) => !lines.has(s.heading));
  if (missing.length === 0) return null;

  const base = existing.endsWith("\n") ? existing : `${existing}\n`;
  const appended = missing.map((s) => `${s.heading}\n${s.body}\n`).join("\n");
  return toChange(rel, existing, `${base}\n${appended}`);
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse JSON with comments and trailing commas (tsconfig style). */
export function parseJsonc(text: string): unknown {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i] ?? "";
    const next = text[i + 1];
    if (ch === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
    } else if (ch === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      out += ch;
      i += 1;
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

function planEnvironment(
  cwd: string,
  errors: string[],
): PlannedChange | null {
  const rel = ".cursor/environment.json";
  const existing = readIfExists(join(cwd, rel));
  if (existing === null) {
    return toChange(rel, null, formatJson({ name: "app", install: ENVIRONMENT_INSTALL }));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(existing);
  } catch (error) {
    errors.push(`${rel}: invalid JSON (${error instanceof Error ? error.message : "unknown"})`);
    return null;
  }
  if (!isRecord(parsed)) {
    errors.push(`${rel}: expected a JSON object`);
    return null;
  }

  const current = typeof parsed["install"] === "string" ? parsed["install"] : null;
  const hasClaude =
    current !== null &&
    current.includes("@anthropic-ai/claude-code") &&
    current.includes("sudo npm install") &&
    current.includes("$HOME/.local");
  const hasPnpm = current !== null && current.includes("pnpm install");
  if (hasClaude && hasPnpm) return null;

  const install =
    current === null
      ? ENVIRONMENT_INSTALL
      : [hasClaude ? null : CLAUDE_INSTALL_SNIPPET, current, hasPnpm ? null : "pnpm install"]
          .filter((part) => part !== null)
          .join("; ");
  return toChange(rel, existing, formatJson({ ...parsed, install }));
}

function convexTsconfigContent(): string {
  return formatJson({
    extends: CONVEX_EXTENDS,
    include: ["./**/*"],
    exclude: ["./_generated"],
  });
}

function planConvexTsconfig(
  cwd: string,
  dir: string,
  errors: string[],
): PlannedChange | null {
  const rel = `${dir}/tsconfig.json`;
  const existing = readIfExists(join(cwd, rel));
  if (existing === null) return toChange(rel, null, convexTsconfigContent());

  let parsed: unknown;
  try {
    parsed = parseJsonc(existing);
  } catch (error) {
    errors.push(`${rel}: cannot parse (${error instanceof Error ? error.message : "unknown"})`);
    return null;
  }
  if (!isRecord(parsed)) {
    errors.push(`${rel}: expected a JSON object`);
    return null;
  }

  const current = parsed["extends"];
  const list = Array.isArray(current) ? current : [current];
  if (list.includes(CONVEX_EXTENDS)) return null;

  const nextExtends = Array.isArray(current) ? [CONVEX_EXTENDS, ...current] : CONVEX_EXTENDS;
  const { extends: _old, ...rest } = parsed;
  return toChange(rel, existing, formatJson({ extends: nextExtends, ...rest }));
}

/** Compute every change a sync would make in `cwd`, without writing. */
export function planSync(cwd: string): SyncResult {
  const changes: PlannedChange[] = [];
  const errors: string[] = [];
  const push = (change: PlannedChange | null): void => {
    if (change) changes.push(change);
  };

  changes.push(...planCommands(cwd));
  push(planClaudeMd(cwd));
  push(planEnvironment(cwd, errors));
  for (const dir of ["packages/backend/convex", "convex"]) {
    if (isDirectory(join(cwd, dir))) push(planConvexTsconfig(cwd, dir, errors));
  }
  return { changes, errors };
}

/** Plan, then write unless `check` is set. */
export function runSync(options: SyncOptions): SyncResult {
  const result = planSync(options.cwd);
  if (options.check) return result;
  for (const change of result.changes) {
    const file = join(options.cwd, change.path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, change.content);
  }
  return result;
}

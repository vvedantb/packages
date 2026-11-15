import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

// Fails when a test file reads source, CSS or markdown text. A test must call real code or render a
// real component: a test that reads a file and matches it with a regex breaks on a refactor and passes
// on a real bug. Use the `vvedantb/no-source-text-in-tests` oxlint rule instead where the repo runs oxlint.
//
// Flagged, in `*.test.*` and `*.spec.*` files:
//   - readFileSync, readFile, readdirSync, readdir or createReadStream whose arguments name source,
//     CSS, markdown or script files (a `src` path part, a source variable or a source extension);
//   - `?raw` imports and `import.meta.glob` with `as: "raw"` or `query: "?raw"`.
// Not flagged: JSON fixtures, build output, generated files.
// To allow one read that feeds code under test, put `allow-source-read: <reason>` in a comment on the
// same or the previous line.

export type CheckNoSourceTextIo = {
  log: (message: string) => void;
  error: (message: string) => void;
  cwd: () => string;
};

export type SourceTextViolation = { line: number; message: string };

export const DEFAULT_SKIP_DIRS = ["node_modules", "dist", "build", ".git", ".expo", ".next", "android", "ios", "out", "release"];

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const READ_CALL = /\b(readFileSync|readFile|readdirSync|readdir|createReadStream)\s*\(/g;
const SOURCE_ARG = /(?:^|[^\w])(?:src|source|sources|srcDir|sourceDir)\b|\.(?:css|scss|md|mdx|[cm]?[jt]sx?)\b/i;
const RAW_IMPORT = /from\s+["'][^"']*\?raw["']|import\.meta\.glob\([^)]*(?:\?raw|as:\s*["']raw["'])/;
const ALLOW = /allow-source-read:/;

/** The text of a call's arguments, up to the matching close bracket. */
function callArguments(text: string, start: number): string {
  let depth = 1;
  let i = start;
  for (; i < text.length && depth > 0; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") depth -= 1;
  }
  return text.slice(start, i - 1);
}

const lineOf = (text: string, index: number): number => text.slice(0, index).split("\n").length;

/** Each source-text read in one test file's text, in line order. */
export function findSourceTextReads(text: string): SourceTextViolation[] {
  const lines = text.split("\n");
  const allowed = (line: number): boolean => ALLOW.test(lines[line - 1] ?? "") || ALLOW.test(lines[line - 2] ?? "");
  const found: SourceTextViolation[] = [];
  for (const match of text.matchAll(READ_CALL)) {
    const line = lineOf(text, match.index);
    if (allowed(line)) continue;
    const args = callArguments(text, match.index + match[0].length);
    if (SOURCE_ARG.test(args)) found.push({ line, message: `${match[1]} reads source, CSS or markdown text` });
  }
  lines.forEach((content, i) => {
    if (RAW_IMPORT.test(content) && !allowed(i + 1)) found.push({ line: i + 1, message: "?raw import of source text" });
  });
  return found.sort((a, b) => a.line - b.line);
}

function testFiles(dir: string, skip: ReadonlySet<string>): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (skip.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return testFiles(path, skip);
    return TEST_FILE.test(name) ? [path] : [];
  });
}

const USAGE = `Usage: vvedantb-check-no-source-text [root] [--skip <name>]... [--skip-file <name>]...

  root              Directory to scan. Default: current directory.
  --skip <name>     Extra directory name to skip. Defaults: ${DEFAULT_SKIP_DIRS.join(", ")}.
  --skip-file <n>   Test file name to skip, for example the test of a checker that holds bad samples.

Exit code: 0 clean, 1 findings, 2 bad usage.`;

/** Run the CLI. Returns the process exit code. */
export function runCheckNoSourceText(argv: readonly string[], io: CheckNoSourceTextIo): number {
  let root = io.cwd();
  const skipDirs = new Set(DEFAULT_SKIP_DIRS);
  const skipFiles = new Set<string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--help" || arg === "-h") {
      io.log(USAGE);
      return 0;
    }
    if (arg === "--skip" || arg === "--skip-file") {
      const value = argv[i + 1];
      if (value === undefined) {
        io.error(`${arg} needs a value\n${USAGE}`);
        return 2;
      }
      (arg === "--skip" ? skipDirs : skipFiles).add(value);
      i += 1;
    } else if (arg.startsWith("--")) {
      io.error(`Unknown option: ${arg}\n${USAGE}`);
      return 2;
    } else {
      root = resolve(io.cwd(), arg);
    }
  }

  const files = testFiles(root, skipDirs).filter((file) => !skipFiles.has(basename(file)));
  let count = 0;
  for (const file of files) {
    for (const { line, message } of findSourceTextReads(readFileSync(file, "utf8"))) {
      io.error(`${relative(root, file).replaceAll("\\", "/")}:${line}: ${message}`);
      count += 1;
    }
  }
  if (count > 0) {
    io.error(`\n${count} source-text read(s) in ${files.length} test file(s). A test must call real code.`);
    return 1;
  }
  io.log(`no-source-text-in-tests: ${files.length} test files, no source-text reads`);
  return 0;
}

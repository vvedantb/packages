#!/usr/bin/env node
// Fails when a test file reads source, CSS or markdown text.
//
// A test must call real code or render a real component. A test that reads a
// file and matches it with a regex or `toContain` breaks on a refactor and
// passes on a real bug. See CLAUDE.md, "Testing".
//
// The check flags, in `*.test.*` and `*.spec.*` files:
//   - `readFileSync`, `readFile`, `readdirSync`, `readdir` or `createReadStream`
//     where the arguments name source, CSS, markdown or script files;
//   - `?raw` imports and `import.meta.glob` with `as: "raw"` or `query: "?raw"`.
// It does not flag reads of JSON fixtures, build output or generated files.
//
// To allow one read that feeds code under test (for example a transpile step),
// put `allow-source-read: <reason>` in a comment on the same or previous line.
//
// Usage: node scripts/check-no-source-text-in-tests.mjs [root]

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", ".expo", ".next", "android", "ios"]);
const READ_CALL = /\b(readFileSync|readFile|readdirSync|readdir|createReadStream)\s*\(/g;
// Arguments that name source files: a `src` path part, a source variable, or a source extension.
const SOURCE_ARG = /(?:^|[^\w])(?:src|source|sources|srcDir|sourceDir)\b|\.(?:css|scss|md|mdx|[cm]?[jt]sx?)\b/i;
const RAW_IMPORT = /from\s+["'][^"']*\?raw["']|import\.meta\.glob\([^)]*(?:\?raw|as:\s*["']raw["'])/;
const ALLOW = /allow-source-read:/;

/** The text of a call's arguments, up to the matching close bracket. */
function callArguments(text, start) {
  let depth = 1;
  let i = start;
  for (; i < text.length && depth > 0; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth--;
  }
  return text.slice(start, i - 1);
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** Returns `{ line, message }` for each source-text read in one test file's text. */
export function findViolations(text) {
  const lines = text.split("\n");
  const allowed = (line) => ALLOW.test(lines[line - 1] ?? "") || ALLOW.test(lines[line - 2] ?? "");
  const found = [];
  for (const match of text.matchAll(READ_CALL)) {
    const line = lineOf(text, match.index);
    if (allowed(line)) continue;
    // Check the call line too, so `readFileSync(join(srcDir, x))` on one line is caught.
    const args = callArguments(text, match.index + match[0].length);
    if (SOURCE_ARG.test(args)) found.push({ line, message: `${match[1]} reads source, CSS or markdown text` });
  }
  lines.forEach((text, i) => {
    if (RAW_IMPORT.test(text) && !allowed(i + 1)) found.push({ line: i + 1, message: "?raw import of source text" });
  });
  return found.sort((a, b) => a.line - b.line);
}

function testFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (SKIP_DIRS.has(name)) return [];
    return statSync(path).isDirectory() ? testFiles(path) : TEST_FILE.test(name) ? [path] : [];
  });
}

function main() {
  const root = resolve(process.argv[2] ?? join(fileURLToPath(import.meta.url), "..", ".."));
  const files = testFiles(root);
  let count = 0;
  for (const file of files) {
    for (const { line, message } of findViolations(readFileSync(file, "utf8"))) {
      console.error(`${relative(root, file)}:${line}: ${message}`);
      count++;
    }
  }
  if (count > 0) {
    console.error(`\n${count} source-text read(s) in ${files.length} test file(s). A test must call real code. See CLAUDE.md, "Testing".`);
    process.exit(1);
  }
  console.info(`no-source-text-in-tests: ${files.length} test files, no source-text reads`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

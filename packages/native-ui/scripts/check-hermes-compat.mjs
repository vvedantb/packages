// Fails when native-ui source uses an ES2023 method that Hermes lacks.
// `toSorted` crashed an Android build. There is no linter in this package.
//
// Scans `src` with comments removed, so prose that names a method passes.
// Run `node scripts/check-hermes-compat.mjs --self-test` to check the patterns.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const BANNED = [
  ["toSorted", /\btoSorted\s*\(/],
  ["toReversed", /\btoReversed\s*\(/],
  ["toSpliced", /\btoSpliced\s*\(/],
  // `.with(` after an array literal or index. A bare `.with(` has too many false positives.
  ["array .with(", /\[[^\]]*\]\s*\.with\s*\(/],
  ["findLast / findLastIndex", /\bfindLast(Index)?\s*\(/],
  ["Object.groupBy", /\bObject\.groupBy\s*\(/],
  ["Map.groupBy", /\bMap\.groupBy\s*\(/],
];

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function selfTest() {
  const hits = ["a.toSorted()", "a.toReversed ()", "a.toSpliced(1)", "[1, 2].with(0, 3)", "a.findLast(x)", "a.findLastIndex(x)", "Object.groupBy(a, f)", "Map.groupBy(a, f)"];
  for (const sample of hits) if (!BANNED.some(([, re]) => re.test(sample))) throw new Error(`pattern misses: ${sample}`);
  if (BANNED.some(([, re]) => re.test("builder.with(x)"))) throw new Error("pattern flags a bare .with(");
}

selfTest();
if (process.argv.includes("--self-test")) process.exit(0);

const files = readdirSync(join(root, "src"), { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && /\.(tsx?|jsx?|mjs|cjs)$/.test(e.name))
  .map((e) => join(e.parentPath, e.name));
if (files.length === 0) throw new Error("no files found under src");

const found = [];
for (const file of files) {
  const text = stripComments(readFileSync(file, "utf8"));
  for (const [name, pattern] of BANNED) if (pattern.test(text)) found.push(`${relative(root, file)}: ${name}`);
}
if (found.length) {
  console.error(`Hermes lacks these ES2023 methods:\n  ${found.join("\n  ")}`);
  process.exit(1);
}
console.log(`@vvedantb/native-ui: ${files.length} files, no ES2023 array or object methods`);

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Hermes lacks the ES2023 array methods (`toSorted` crashed an Android build).
// There is no linter in this package, so this test scans `src` for them.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");

const BANNED: Array<[string, RegExp]> = [
  ["toSorted", /\btoSorted\s*\(/],
  ["toReversed", /\btoReversed\s*\(/],
  ["toSpliced", /\btoSpliced\s*\(/],
  // `.with(` after an array literal or index; a bare `.with(` has too many false positives.
  ["array .with(", /\[[^\]]*\]\s*\.with\s*\(/],
  ["findLast / findLastIndex", /\bfindLast(Index)?\s*\(/],
  ["Object.groupBy", /\bObject\.groupBy\s*\(/],
  ["Map.groupBy", /\bMap\.groupBy\s*\(/],
];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(tsx?|jsx?|mjs|cjs)$/.test(entry.name) ? [path] : [];
  });
}

/** Source with comments removed, so prose that names a method is not flagged. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("Hermes compatibility", () => {
  it("scans some files", () => {
    expect(files(srcDir).length).toBeGreaterThan(0);
  });

  it("uses no ES2023 array or object methods in src", () => {
    const found: string[] = [];
    for (const file of files(srcDir)) {
      const text = code(readFileSync(file, "utf8"));
      for (const [name, pattern] of BANNED) {
        if (pattern.test(text)) found.push(`${relative(root, file)}: ${name}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("the patterns catch what they should", () => {
    const samples = [
      "a.toSorted()",
      "a.toReversed ()",
      "a.toSpliced(1)",
      "[1, 2].with(0, 3)",
      "a.findLast(x)",
      "a.findLastIndex(x)",
      "Object.groupBy(a, f)",
      "Map.groupBy(a, f)",
    ];
    for (const sample of samples) expect(BANNED.some(([, re]) => re.test(sample)), sample).toBe(true);
    expect(BANNED.some(([, re]) => re.test("builder.with(x)"))).toBe(false);
  });
});

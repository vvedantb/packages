import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// NativeWind drops a Pressable's function `style` when a `className` is set
// (seen in Eva's app: DropdownMenu rows lost their height, padding and check
// offset). Layout must not live in a function style next to a `className`;
// a pressed colour or opacity there only degrades.

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const files = readdirSync(src, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".tsx"));
const LAYOUT = /\b(?:minHeight|height|width|padding\w*|margin\w*|gap|flexDirection|alignItems|justifyContent)\s*:/;

describe("Pressable function styles", () => {
  it("keep layout out of a function style that sits beside a className", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(src, file), "utf8");
      for (const match of source.matchAll(/<(?:Pressable|Component)\b[\s\S]*?\n\s*>/g)) {
        const tag = match[0];
        const fn = tag.match(/style=\{\(\{ pressed \}\) => (?:\(\{([\s\S]*?)\}\)|[^}]*\})/);
        if (!fn || !/\bclassName=/.test(tag)) continue;
        if (LAYOUT.test(fn[1] ?? "")) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

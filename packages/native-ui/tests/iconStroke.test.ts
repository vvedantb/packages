import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Tabler line width on native. The web `@tabler/icons-react` reads `stroke` as
// the width. The native `@tabler/icons-react-native` reads `strokeWidth` as the
// width and passes `stroke` on as the SVG colour, so `stroke={2}` gives
// `stroke="2"` and no visible line. These checks read the source.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );

/** Source without block and line comments. */
const code = (file: string) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** Names imported from the native Tabler package, without `type` imports. */
const tablerNames = (source: string) =>
  [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@tabler\/icons-react-native"/g)].flatMap(
    ([, names]) =>
      names
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name && !name.startsWith("type ")),
  );

/** Each JSX element of `name`, from `<name` to the end of its opening tag. */
const elements = (source: string, name: string) =>
  [...source.matchAll(new RegExp(`<${name}\\b(?:=>|[^>])*>`, "g"))].map(([tag]) => tag);

const read = (file: string) => code(join(src, file));

describe("Tabler icon line width on native", () => {
  it("passes no `stroke={…}` expression to a Tabler icon in src", () => {
    const offenders: string[] = [];
    for (const file of files(src)) {
      const source = code(file);
      // `IconComponent` is the Tabler icon `EmptyState.Icon` takes as a prop.
      const names = [...tablerNames(source), "IconComponent"];
      for (const name of names) {
        for (const tag of elements(source, name)) {
          if (/\sstroke=\{/.test(tag)) offenders.push(`${relative(root, file)}: ${tag}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("finds the Tabler imports it checks", () => {
    expect(tablerNames(read("Checkbox.tsx"))).toEqual(["IconCheck", "IconMinus"]);
    expect(tablerNames(read("marketing/PricingModal.tsx"))).toEqual(["IconCheck", "IconX"]);
    expect(tablerNames(read("EmptyState.tsx"))).toEqual(["IconInbox"]);
  });

  it("gives the Checkbox check and dash strokeWidth 2", () => {
    const source = read("Checkbox.tsx");
    expect(source).toMatch(/<IconMinus size=\{iconSize\} color=\{color\} strokeWidth=\{2\} \/>/);
    expect(source).toMatch(/<IconCheck size=\{iconSize\} color=\{color\} strokeWidth=\{2\} \/>/);
  });

  it("gives the PricingModal benefit check strokeWidth 2", () => {
    expect(read("marketing/PricingModal.tsx")).toMatch(
      /<IconCheck size=\{16\} strokeWidth=\{2\} color=\{benefit\.muted \? muted : fg\} \/>/,
    );
  });

  it("keeps the EmptyState.Icon `stroke` prop a width and passes it as strokeWidth", () => {
    const source = read("EmptyState.tsx");
    expect(source).toMatch(/\bstroke\?: number;/);
    expect(source).toMatch(/<IconComponent size=\{size \?\? 22\} strokeWidth=\{stroke \?\? 1\.5\} color=/);
    expect(source).toMatch(/<IconComponent size=\{size \?\? 40\} strokeWidth=\{stroke\} color=/);
  });
});

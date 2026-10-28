import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PAGE_TITLE_CLASS, pageTitleStyle } from "../src/controlStyles";

// Instrument Sans faces and weights. Expo web and many apps map every
// `font-instrument-sans-*` class to one family with no weight, so a face class
// without its `fontWeight` style (`typeStyle`) draws Regular; and a weight
// without the face class does not pick the Medium or Semibold file. These
// checks read the source: each JSX opening tag in `src/` that names a semibold
// or medium face also sets its weight, and the other way round.

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

const read = (file: string) => code(join(src, file));

type Tag = { name: string; start: number; end: number; text: string };

/**
 * Each JSX opening tag of a component (`<Text`, `<PrimitiveText`, …) up to its
 * closing `>`, skipping a `>` inside braces or quotes.
 */
function tags(source: string): Tag[] {
  const found: Tag[] = [];
  for (const match of source.matchAll(/<([A-Z][\w.]*)/g)) {
    let depth = 0;
    let quote: string | null = null;
    for (let i = match.index + match[0].length; i < source.length; i++) {
      const c = source[i]!;
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0 && source[i - 1] !== "=") {
        found.push({ name: match[1]!, start: match.index, end: i + 1, text: source.slice(match.index, i + 1) });
        break;
      }
    }
  }
  return found;
}

const FACE = {
  semibold: { face: /font-instrument-sans-semibold/, weight: /typeStyle\("semibold"\)|fontWeight: "600"/ },
  medium: { face: /font-instrument-sans-medium/, weight: /typeStyle\("medium"\)|fontWeight: "500"/ },
} as const;

/** What is wrong with the face and weight in one tag, if anything. */
function mismatch(tag: string): string | null {
  for (const [name, { face, weight }] of Object.entries(FACE)) {
    if (face.test(tag) && !weight.test(tag)) return `${name} face without its weight`;
    if (weight.test(tag) && !face.test(tag)) return `${name} weight without its face`;
  }
  return null;
}

const where = (file: string, source: string, index: number) =>
  `${relative(root, file)}:${source.slice(0, index).split("\n").length}`;

// Files that name a face class or weight outside a JSX tag, each paired in its
// own way and checked below: the `fontClass` map, the page title class and
// style, and the `primitives/text.tsx` variants.
const PAIRED_ELSEWHERE = ["typography.ts", "controlStyles.ts", "primitives/text.tsx"];

/** Tailwind weight utilities, which set a weight on the app's default family. */
const BARE_WEIGHT = /(?<![\w-])font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?![\w-])/;

describe("Instrument Sans face and weight (source contract)", () => {
  it("pairs each semibold or medium face class with its weight in every JSX tag in src", () => {
    const offenders: string[] = [];
    for (const file of files(src)) {
      const source = code(file);
      for (const tag of tags(source)) {
        const problem = mismatch(tag.text);
        if (problem) offenders.push(`${where(file, source, tag.start)} ${tag.name}: ${problem}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("finds the tags it checks", () => {
    const count = (face: RegExp) =>
      files(src).flatMap((file) => tags(code(file))).filter((tag) => face.test(tag.text)).length;
    expect(count(FACE.semibold.face)).toBeGreaterThanOrEqual(15);
    expect(count(FACE.medium.face)).toBeGreaterThanOrEqual(15);
    const dialogTitle = tags(read("Dialog.tsx")).find((tag) => /accessibilityRole="header"/.test(tag.text))!;
    expect(dialogTitle.text).toMatch(FACE.semibold.face);
    expect(dialogTitle.text).toMatch(FACE.semibold.weight);
    // Negative controls: the 0.3.12 `CardTitle` primitive and a class-only title fail.
    expect(mismatch('<Text className={cn("font-semibold leading-none", className)} {...props} />')).toBeNull();
    expect(mismatch('<Text className="font-instrument-sans-semibold" style={textStyle("foreground", scheme)}>')).toBe(
      "semibold face without its weight",
    );
    expect(mismatch('<Text className="text-lg" style={[color, typeStyle("semibold")]}>')).toBe(
      "semibold weight without its face",
    );
    expect(mismatch('<Text className={medium ? "font-instrument-sans-medium" : "x"} style={typeStyle("medium")}>')).toBeNull();
  });

  it("names a face class or weight outside a JSX tag only in the files that pair it another way", () => {
    const outside: string[] = [];
    const any = /font-instrument-sans-(?:semibold|medium)|typeStyle\("(?:semibold|medium)"\)|fontWeight: "[56]00"/g;
    for (const file of files(src)) {
      const source = code(file);
      const inTags = tags(source);
      for (const match of source.matchAll(any)) {
        if (inTags.some((tag) => match.index >= tag.start && match.index < tag.end)) continue;
        outside.push(relative(src, file));
      }
    }
    expect([...new Set(outside)].sort()).toEqual([...PAIRED_ELSEWHERE].sort());
  });

  it("uses no bare Tailwind weight class (font-medium, font-semibold, font-bold …) in src", () => {
    const offenders = files(src)
      .map((file) => [relative(src, file), code(file).match(BARE_WEIGHT)?.[0]] as const)
      .filter(([, found]) => found);
    expect(offenders).toEqual([]);
    expect(BARE_WEIGHT.test("font-semibold leading-none")).toBe(true);
    expect(BARE_WEIGHT.test("font-extrabold")).toBe(true);
    expect(BARE_WEIGHT.test("font-instrument-sans-semibold font-instrument-sans-bold")).toBe(false);
  });

  it("draws no bold: the bold face is only in fontClass, and no weight is 700", () => {
    for (const file of files(src)) {
      const rel = relative(src, file);
      const source = code(file);
      if (rel !== "typography.ts") expect(source, rel).not.toMatch(/font-instrument-sans-bold/);
      expect(source, rel).not.toMatch(/fontWeight: (?:"700"|700|"bold")|typeStyle\("bold"\)/);
    }
  });

  it("gives every text header a face class with its weight, or the page title class and style", () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const file of files(src)) {
      const source = code(file);
      for (const tag of tags(source)) {
        // A `View` header is the sr-only `PricingModal` title, with no text to draw.
        if (tag.name === "View" || !/accessibilityRole="header"/.test(tag.text)) continue;
        checked++;
        const faced = Object.values(FACE).some(({ face, weight }) => face.test(tag.text) && weight.test(tag.text));
        const pageTitle = /PAGE_TITLE_CLASS/.test(tag.text) && /pageTitleStyle\(\)/.test(tag.text);
        if (!faced && !pageTitle) offenders.push(`${where(file, source, tag.start)} ${tag.name}`);
      }
    }
    expect(offenders).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(7);
  });
});

describe("PageTitle face and weight", () => {
  it("pairs the semibold face class with fontWeight 600", () => {
    expect(PAGE_TITLE_CLASS.split(" ")).toContain("font-instrument-sans-semibold");
    expect(pageTitleStyle().fontWeight).toBe("600");
    const title = tags(read("PageTitle.tsx")).find((tag) => tag.name === "Text")!;
    expect(title.text).toMatch(/className=\{cn\(PAGE_TITLE_CLASS, className\)\}/);
    expect(title.text).toMatch(/style=\{\[textStyle\("foreground", scheme\), pageTitleStyle\(\), style\]\}/);
  });
});

describe("primitives (source contract)", () => {
  const text = read("primitives/text.tsx");
  const variants = text.slice(text.indexOf("variant: {"), text.indexOf("defaultVariants"));
  /** Each variant's class string, from the `textVariants` cva. */
  const classes = Object.fromEntries(
    [...variants.matchAll(/\n {8}(\w+): (?:cn\(\s*)?"([^"]*)"/g)].map(([, name, value]) => [name!, value!]),
  );
  const weightMap = text.match(/const WEIGHT: [^=]+= \{([^}]*)\}/)?.[1] ?? "";
  const weights = Object.fromEntries(
    [...weightMap.matchAll(/(\w+): typeStyle\("(\w+)"\)/g)].map(([, name, weight]) => [name!, weight!]),
  );

  it("text.tsx gives h1–h4, code and large the semibold face and small the medium face", () => {
    expect(Object.keys(classes)).toEqual(
      expect.arrayContaining(["default", "h1", "h2", "h3", "h4", "p", "code", "lead", "large", "small", "muted"]),
    );
    for (const name of ["h1", "h2", "h3", "h4", "code", "large"]) {
      expect(classes[name], name).toMatch(/(?:^|\s)font-instrument-sans-semibold(?:\s|$)/);
    }
    expect(classes.small).toMatch(/(?:^|\s)font-instrument-sans-medium(?:\s|$)/);
    for (const [name, value] of Object.entries(classes)) expect(value, name).not.toMatch(BARE_WEIGHT);
  });

  it("text.tsx sets each variant's face weight as a style (WEIGHT), and no weight without a face", () => {
    for (const [name, value] of Object.entries(classes)) {
      const face = value.match(/font-instrument-sans-(semibold|medium)/)?.[1];
      expect(weights[name], name).toBe(face);
    }
    expect(Object.keys(weights).sort()).toEqual(["code", "h1", "h2", "h3", "h4", "large", "small"]);
    expect(text).toMatch(/const weight = variant \? WEIGHT\[variant\] : undefined;/);
    expect(text).toMatch(/style=\{weight \? \[weight, style\] : style\}/);
    // Before `{...props}` would be wrong: the caller's `style` is destructured, so it cannot replace the weight.
    expect(text).toMatch(/variant = "default", style, \.\.\.props \}/);
  });

  it("card.tsx CardTitle is the semibold face with its weight, not font-semibold", () => {
    const card = read("primitives/card.tsx");
    const title = card.slice(card.indexOf("const CardTitle"), card.indexOf("const CardDescription"));
    expect(title).toMatch(/className=\{cn\("font-instrument-sans-semibold leading-none", className\)\}/);
    expect(title).toMatch(/style=\{\[typeStyle\("semibold"\), style\]\}/);
    expect(title).not.toMatch(BARE_WEIGHT);
  });

  it("button.tsx sets no weight in its label class context, and Button sets the medium face and weight", () => {
    const context = read("primitives/button.tsx").match(/const buttonTextVariants = cva\("([^"]*)"/)?.[1];
    expect(context).toBe("text-sm text-foreground");
    const label = tags(read("Button.tsx")).find((tag) => tag.name === "PrimitiveText")!;
    expect(label.text).toMatch(/"font-instrument-sans-medium"/);
    expect(label.text).toMatch(/typeStyle\("medium"\)/);
  });
});

// Proves that the shadcn-style colour aliases in tokens.css resolve to the
// same variables as the existing tokens. Offline. The Tailwind check skips
// with a message when @tailwindcss/node is missing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(PKG, "src/tokens.css"), "utf8");

// alias -> existing token it must match.
const ALIASES = {
  primary: "accent",
  "primary-foreground": "accent-foreground",
  "muted-foreground": "muted",
  secondary: "default",
  "secondary-foreground": "default-foreground",
  destructive: "danger",
  "destructive-foreground": "danger-foreground",
  card: "surface-card",
  "card-foreground": "surface-foreground",
  popover: "overlay",
  "popover-foreground": "overlay-foreground",
  input: "border",
  ring: "focus",
};

// Reads --color-* declarations from the first @theme block (non-inline).
function themeColours(source) {
  const start = source.search(/@theme\s*\{/);
  assert.ok(start >= 0, "tokens.css has no @theme block");
  const body = source.slice(source.indexOf("{", start) + 1);
  const end = body.search(/\n\}/);
  const block = body.slice(0, end).replace(/\/\*[\s\S]*?\*\//g, "");
  return Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

test("each alias points at the documented token variable", () => {
  const colours = themeColours(css);
  for (const [alias, target] of Object.entries(ALIASES)) {
    assert.equal(colours[alias], `var(--${target})`, `--color-${alias}`);
    assert.equal(colours[target], `var(--${target})`, `--color-${target} is the existing token`);
  }
});

let tw;
try {
  tw = await import("@tailwindcss/node");
} catch {
  tw = null;
}
const skip = tw ? false : "@tailwindcss/node is not installed (run pnpm install)";

test("compiled utilities for alias and existing token resolve to the same value", { skip }, async () => {
  const pairs = Object.entries(ALIASES);
  const utilities = pairs.flatMap(([a, t]) => [`bg-${a}`, `bg-${t}`, `text-${a}`, `text-${t}`, `border-${a}`, `border-${t}`]);
  const compiler = await tw.compile(`@import "tailwindcss"; @import "./src/tokens.css";`, { base: PKG, onDependency: () => {} });
  const out = compiler.build(utilities);

  // Theme variables Tailwind emitted (only the ones the utilities use).
  const vars = Object.fromEntries([...out.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  // The value a utility class applies for a given property.
  const rule = (cls) => {
    const m = out.match(new RegExp(`\\.${cls.replace(/[-/]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    assert.ok(m, `no rule emitted for .${cls}`);
    return m[1].replace(/\s+/g, " ").trim();
  };
  for (const [alias, target] of pairs) {
    assert.ok(vars[alias], `--color-${alias} not emitted`);
    assert.equal(vars[alias], vars[target], `--color-${alias} vs --color-${target}`);
    for (const prop of ["bg", "text", "border"]) {
      assert.equal(rule(`${prop}-${alias}`).replace(`--color-${alias}`, "X"), rule(`${prop}-${target}`).replace(`--color-${target}`, "X"), `${prop}-${alias} vs ${prop}-${target}`);
    }
  }
});

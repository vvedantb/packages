// Compiles the shared CSS and the preset with Tailwind v4 (devDependency,
// no network). Skips with a message when @tailwindcss/node is missing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let tw;
try {
  tw = await import("@tailwindcss/node");
} catch {
  tw = null;
}
const skip = tw ? false : "@tailwindcss/node is not installed (run pnpm install)";

async function build(css, candidates) {
  const compiler = await tw.compile(css, { base: PKG, onDependency: () => {} });
  return tw.optimize(compiler.build(candidates)).code;
}

const head = `@import "tailwindcss"; @import "./src/tokens.css";`;

test("each shared CSS file compiles and emits its rules", { skip }, async () => {
  const expect = {
    "base.css": ["::selection", "a[href]", "--tokens-control-transition-duration"],
    "dialog.css": ['[role="dialog"][data-compact="true"]'],
    "modal.css": [".t-modal.is-closing", "@keyframes t-modal-presence-wait"],
    "tabs.css": [".t-tabs-pill", ".t-tab"],
    "tabs-pills.css": [".t-tabs--segmented", "--tabs-pill-active-bg"],
    "utilities.css": [".hit-target:after", ".reveal-on-hover"],
    "scrollbar-thin.css": [".scrollbar-thin::-webkit-scrollbar-thumb:hover"],
    "animations.css": ["@keyframes aurora", ".animate-indeterminate"],
    "index.css": ["::selection", ".hit-target", ".scrollbar-thin", "@keyframes fade-in-up"],
  };
  for (const [file, needles] of Object.entries(expect)) {
    const out = await build(`${head} @import "./src/css/${file}";`, ["hit-target", "reveal-on-hover", "rounded-surface", "animate-aurora", "animate-indeterminate", "animate-fade-in-up"]);
    for (const n of needles) assert.ok(out.includes(n), `${file}: missing ${n}`);
  }
});

test("radius utilities come with tokens.css and with compat-shadcn-rgb.css", { skip }, async () => {
  const candidates = ["rounded-surface", "rounded-menu-item", "rounded-control"];
  for (const file of ["./src/tokens.css", "./src/css/compat-shadcn-rgb.css"]) {
    const out = await build(`@import "tailwindcss"; @import "${file}";`, candidates);
    assert.match(out, /\.rounded-surface\s*\{\s*border-radius: clamp\(\.75rem, var\(--radius\), 1rem\)/, file);
    assert.match(out, /\.rounded-menu-item\s*\{\s*border-radius: min\(var\(--radius\), \.5rem\)/, file);
    assert.match(out, /\.rounded-control\s*\{\s*border-radius: min\(var\(--radius\), \.625rem\)/, file);
  }
});

test("bg-sidebar-accent comes with tokens.css and with compat-shadcn-rgb.css", { skip }, async () => {
  const fromTokens = await build(head, ["bg-sidebar-accent"]);
  assert.match(fromTokens, /--color-sidebar-accent: var\(--sidebar-accent\)/);
  assert.match(fromTokens, /\.bg-sidebar-accent\s*\{\s*background-color: var\(--color-sidebar-accent\)/);
  const css = readFileSync(join(PKG, "src/tokens.css"), "utf8");
  assert.match(css, /--sidebar-accent: var\(--surface-tertiary\);/, "light fill matches surface-tertiary");
  assert.match(css, /--sidebar-accent: oklch\(22\.64% 0 0\);/, "dark fill is sRGB 28 28 28");
  const fromCompat = await build(`@import "tailwindcss"; @import "./src/css/compat-shadcn-rgb.css";`, ["bg-sidebar-accent"]);
  assert.match(fromCompat, /\.bg-sidebar-accent\s*\{\s*background-color: rgb\(var\(--sidebar-accent, var\(--secondary\)\)\)/);
});

test("preset loads through @config and generates its theme", { skip }, async () => {
  const { default: preset, tokensPreset, cssVar } = await import("../src/tailwind-preset.mjs");
  assert.equal(preset.darkMode, "class");
  assert.equal(cssVar("x"), "var(--x)");
  assert.equal(tokensPreset({ color: (n) => `c(${n})` }).theme.extend.colors.surface.card, "c(surface-card)");
  const out = await build(`@import "tailwindcss"; @config "./test/fixtures/preset.config.mjs";`, [
    "bg-surface-card",
    "shadow-soft",
    "rounded-field",
    "ease-smooth",
    "xs:flex",
    "dark:flex",
    "animate-aurora",
  ]);
  for (const n of [".bg-surface-card", "var(--surface-card)", ".shadow-soft", ".rounded-field", ".ease-smooth", "475px", ":is(.dark *)", "@keyframes aurora"]) {
    assert.ok(out.includes(n), `preset output missing ${n}`);
  }
});

test("animations.css and the preset define the same keyframes and timings", { skip }, async () => {
  const candidates = ["animate-aurora", "animate-fade-in-up", "animate-indeterminate"];
  const fromCss = await build(`@import "tailwindcss"; @import "./src/css/animations.css";`, candidates);
  const fromPreset = await build(`@import "tailwindcss"; @config "./test/fixtures/preset.config.mjs";`, candidates);
  const keyframes = (css) => [...css.matchAll(/@keyframes [\w-]+ \{[\s\S]*?\n\}/g)].map((m) => m[0]).sort();
  assert.deepEqual(keyframes(fromCss), keyframes(fromPreset));
  const { animation } = (await import("../src/tailwind-preset.mjs")).default.theme.extend;
  const css = readFileSync(join(PKG, "src/css/animations.css"), "utf8");
  for (const [name, value] of Object.entries(animation)) assert.ok(css.includes(`--animate-${name}: ${value};`), name);
});

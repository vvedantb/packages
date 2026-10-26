// Offline checks for the tokens surface of @vvedantb/ui.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const TOKENS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = resolve(TOKENS, "..");
const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));
const targets = Object.entries(pkg.exports)
  .flatMap(([k, t]) => (typeof t === "string" ? [[k, t]] : Object.values(t).map((v) => [k, v])))
  .filter(([, t]) => !t.includes("*"));
const cssFiles = readdirSync(join(TOKENS, "src/css")).map((f) => join(TOKENS, "src/css", f));

// Strips comments and strings so brace counting sees only structure.
const structure = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');

test("version is 0.25.2", () => {
  assert.equal(pkg.version, "0.25.2");
});

test("field radius matches rounded-control (10px cap)", () => {
  const cap = "min(var(--radius), 0.625rem)";
  const tokens = readFileSync(join(TOKENS, "src/tokens.css"), "utf8");
  const compat = readFileSync(join(TOKENS, "src/css/compat-shadcn-rgb.css"), "utf8");
  assert.deepEqual([...tokens.matchAll(/--field-radius:\s*([^;]+);/g)].map((m) => m[1]), [cap, cap]);
  assert.match(tokens, /--radius-field: var\(--field-radius\);/);
  assert.match(compat, /--radius-field: min\(var\(--radius\), 0\.625rem\);/);
  assert.match(compat, /--field-radius: min\(var\(--radius\), 0\.625rem\);/);
});

test("every export resolves to an existing file", () => {
  for (const [key, t] of targets) assert.ok(existsSync(join(PKG, t)), `${key} -> ${t}`);
});

test("existing exports are unchanged", () => {
  assert.equal(pkg.exports["./tokens"], "./tokens/src/tokens.css");
  assert.equal(pkg.exports["./tokens/tokens.css"], "./tokens/src/tokens.css");
  assert.equal(pkg.exports["./tokens/native"], undefined);
  assert.equal(pkg.exports["./tokens/tailwind-preset"].default, "./tokens/src/tailwind-preset.mjs");
});

test("every shared CSS file is exported and every css export is a shared file", () => {
  const exported = new Set(targets.map(([, t]) => join(PKG, t)));
  for (const f of cssFiles) assert.ok(exported.has(f), `${f} is not in package.json exports`);
  for (const [key] of targets.filter(([k]) => k.startsWith("./tokens/css/"))) assert.ok(existsSync(join(TOKENS, "src", key.replace("./tokens/", ""))), key);
});

test("shared CSS has balanced braces and parentheses", () => {
  for (const f of [...cssFiles, join(TOKENS, "src/tokens.css")]) {
    const s = structure(readFileSync(f, "utf8"));
    for (const [open, close] of [["{", "}"], ["(", ")"]]) {
      let depth = 0;
      for (const ch of s) {
        if (ch === open) depth++;
        if (ch === close) depth--;
        assert.ok(depth >= 0, `${f}: unexpected ${close}`);
      }
      assert.equal(depth, 0, `${f}: unbalanced ${open}${close}`);
    }
  }
});

test("@import lines in shared CSS resolve", () => {
  for (const f of [...cssFiles, join(TOKENS, "src/tokens.css")]) {
    for (const m of readFileSync(f, "utf8").matchAll(/^@import\s+"([^"]+)"/gm)) {
      assert.ok(existsSync(join(dirname(f), m[1])), `${f}: ${m[1]}`);
    }
  }
});

// Browsers and bundlers drop an @import that follows any other rule.
test("no @import follows a rule in shared CSS", () => {
  for (const f of [...cssFiles, join(TOKENS, "src/tokens.css")]) {
    const statements = structure(readFileSync(f, "utf8")).split(/[;{}]/).map((s) => s.trim()).filter(Boolean);
    const firstRule = statements.findIndex((s) => !s.startsWith("@import"));
    const lastImport = statements.findLastIndex((s) => s.startsWith("@import"));
    assert.ok(firstRule === -1 || lastImport < firstRule, `${f}: @import after a rule`);
  }
});

test("tokens.css brings the 0.15.0 app CSS by default", () => {
  const css = readFileSync(join(TOKENS, "src/tokens.css"), "utf8");
  for (const file of ["clear-input.css", "scrollbar-thin.css", "motion.css"]) assert.match(css, new RegExp(`^@import "\\./css/${file.replace(".", "\\.")}";`, "m"), file);
  for (const [name, value] of [
    ["--modal-open-dur", "180ms"],
    ["--modal-close-dur", "120ms"],
    ["--modal-scale", "0.96"],
    ["--modal-scale-close", "0.96"],
    ["--modal-ease", "cubic-bezier(0.22, 1, 0.36, 1)"],
    ["--tabs-dur", "200ms"],
    ["--tabs-ease", "cubic-bezier(0.22, 1, 0.36, 1)"],
  ]) assert.ok(css.includes(`${name}: ${value};`), name);
  assert.match(css, /\.glass-panel-strong \{\s*background-color: var\(--overlay\);\s*\}/);
  assert.match(css, /\.sidebar-section-label \{[^}]*var\(--muted\) var\(--sidebar-section-label-mix\)/);
  assert.match(css, /--sidebar-section-label-mix: 55%;/);
  assert.match(css, /--sidebar-section-label-hover-mix: 80%;/);
});

test("compat glass-panel-strong is the solid popover fill", () => {
  const css = readFileSync(join(TOKENS, "src/css/compat-shadcn-rgb.css"), "utf8");
  assert.match(css, /\.glass-panel-strong \{\s*background-color: rgb\(var\(--popover\)\);\s*\}/);
  assert.doesNotMatch(css, /@utility glass-panel-strong/);
});

test("ClearInput CSS defaults match what clearInputDissolve reads", () => {
  const css = readFileSync(join(TOKENS, "src/css/clear-input.css"), "utf8");
  const ts = readFileSync(join(PKG, "src/ui/clearInputDissolve.ts"), "utf8");
  const read = [...ts.matchAll(/readCss(?:Number|Ease)\(root, "(--[\w-]+)"(?:, ([\d.]+))?\)/g)];
  assert.ok(read.length >= 10, "dissolve variables found");
  for (const [, name, fallback] of read) {
    const m = css.match(new RegExp(`${name}: ([^;]+);`));
    assert.ok(m, `${name} has a default`);
    if (fallback) assert.equal(parseFloat(m[1]), parseFloat(fallback), `${name} matches the code fallback`);
  }
  for (const sel of [".t-clear ", ".t-clear-mirror", ".t-clear-placeholder", ".t-clear-glow", ".t-clear.has-value > input"]) assert.ok(css.includes(sel), sel);
});

// [selectors, declarations] for each innermost rule in clear-input.css.
function clearInputRules() {
  const css = structure(readFileSync(join(TOKENS, "src/css/clear-input.css"), "utf8"));
  return [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.split(",").map((s) => s.trim()), body]);
}

test("ClearInput: .t-clear does not clip the input's focus ring", () => {
  const rules = clearInputRules().filter(([sels]) => sels.includes(".t-clear"));
  assert.ok(rules.length > 0, ".t-clear rule found");
  for (const [, body] of rules) {
    if (/overflow(-[xy])?:\s*(hidden|clip)/.test(body)) assert.match(body, /overflow-clip-margin:\s*[1-9]/, ".t-clear clips with no margin for the ring");
  }
  // The layers are clipped by .t-clear-clip, which the dissolve never moves.
  const clip = clearInputRules().find(([sels]) => sels.includes(".t-clear-clip"));
  assert.ok(clip && /overflow:\s*hidden/.test(clip[1]), ".t-clear-clip clips the layers");
  assert.doesNotMatch(readFileSync(join(PKG, "src/ui/clearInputDissolve.ts"), "utf8"), /t-clear-clip/);
});

test("ClearInput: the placeholder layer shows only while clearing", () => {
  const rules = clearInputRules();
  const rest = rules.filter(([sels]) => sels.includes(".t-clear-placeholder")).map(([, body]) => body.match(/opacity:\s*([\d.]+)/)?.[1]);
  assert.deepEqual(rest.filter(Boolean), ["0"], "hidden at rest");
  for (const [sels, body] of rules) {
    const opacity = body.match(/opacity:\s*([\d.]+)/);
    if (!opacity || parseFloat(opacity[1]) === 0) continue;
    for (const sel of sels.filter((s) => s.includes(".t-clear-placeholder"))) assert.ok(sel.includes(".is-clearing"), `${sel} shows the layer outside .is-clearing`);
  }
  // While the layer is shown, the input's own placeholder is not.
  assert.ok(rules.some(([sels, body]) => sels.includes(".t-clear.is-clearing > input::placeholder") && /opacity:\s*0/.test(body)));
});

test("css parameters are documented in the file header", () => {
  for (const f of cssFiles) {
    const src = readFileSync(f, "utf8");
    const header = src.slice(0, src.indexOf("*/"));
    for (const m of src.matchAll(/var\(\s*(--tokens-[\w-]+)/g)) assert.ok(header.includes(m[1]), `${f}: ${m[1]} undocumented`);
  }
});

test("native-ui keeps an identical copy of the native tokens", () => {
  // The leading doc comment differs on purpose; everything after it must match.
  const body = (f) => readFileSync(f, "utf8").replace(/^\/\*\*[\s\S]*?\*\/\s*/, "");
  const copy = join(PKG, "../native-ui/src/tokens.ts");
  assert.equal(body(copy), body(join(TOKENS, "src/native.ts")));
});

test("root and ./brand are the only JS entries; other exports are CSS or the Tailwind preset", () => {
  assert.equal(pkg.exports["./brand"].default, "./src/brand/index.ts");
  for (const [key, value] of Object.entries(pkg.exports)) {
    if (key === "." || key === "./brand" || key === "./package.json" || key === "./tokens/tailwind-preset") continue;
    assert.ok(typeof value === "string" && value.endsWith(".css"), `${key} is not CSS`);
  }
});

test("optional peers: motion, Clerk, hotkeys and zod", () => {
  for (const name of ["motion", "@clerk/clerk-react", "@tanstack/react-hotkeys", "zod"]) {
    assert.ok(pkg.peerDependencies[name], `${name} stays in peerDependencies`);
    assert.equal(pkg.peerDependenciesMeta[name]?.optional, true, `${name} is optional`);
  }
});

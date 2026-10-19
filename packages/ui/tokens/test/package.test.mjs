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

test("version is 0.8.0", () => {
  assert.equal(pkg.version, "0.8.0");
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
  for (const f of cssFiles) {
    for (const m of readFileSync(f, "utf8").matchAll(/^@import\s+"([^"]+)"/gm)) {
      assert.ok(existsSync(join(dirname(f), m[1])), `${f}: ${m[1]}`);
    }
  }
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

test("root is the only JS entry; other exports are CSS or the Tailwind preset", () => {
  for (const [key, value] of Object.entries(pkg.exports)) {
    if (key === "." || key === "./package.json" || key === "./tokens/tailwind-preset") continue;
    assert.ok(typeof value === "string" && value.endsWith(".css"), `${key} is not CSS`);
  }
});

test("optional peers: motion, Clerk, hotkeys and zod", () => {
  for (const name of ["motion", "@clerk/clerk-react", "@tanstack/react-hotkeys", "zod"]) {
    assert.ok(pkg.peerDependencies[name], `${name} stays in peerDependencies`);
    assert.equal(pkg.peerDependenciesMeta[name]?.optional, true, `${name} is optional`);
  }
});

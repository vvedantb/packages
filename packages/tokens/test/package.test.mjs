// Offline checks for the published surface of @vvedantb/tokens.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));
const targets = Object.entries(pkg.exports).flatMap(([k, t]) => (typeof t === "string" ? [[k, t]] : Object.values(t).map((v) => [k, v])));
const cssFiles = readdirSync(join(PKG, "src/css")).map((f) => join(PKG, "src/css", f));

// Strips comments and strings so brace counting sees only structure.
const structure = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');

test("version is 0.2.1", () => {
  assert.equal(pkg.version, "0.2.1");
});

test("every export resolves to an existing file", () => {
  for (const [key, t] of targets) assert.ok(existsSync(join(PKG, t)), `${key} -> ${t}`);
});

test("existing exports are unchanged", () => {
  assert.equal(pkg.exports["."], "./src/tokens.css");
  assert.equal(pkg.exports["./tokens.css"], "./src/tokens.css");
  assert.equal(pkg.exports["./native"], "./src/native.ts");
});

test("every shared CSS file is exported and every css export is a shared file", () => {
  const exported = new Set(targets.map(([, t]) => join(PKG, t)));
  for (const f of cssFiles) assert.ok(exported.has(f), `${f} is not in package.json exports`);
  for (const [key] of targets.filter(([k]) => k.startsWith("./css/"))) assert.ok(existsSync(join(PKG, "src", key)), key);
});

test("shared CSS has balanced braces and parentheses", () => {
  for (const f of [...cssFiles, join(PKG, "src/tokens.css")]) {
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

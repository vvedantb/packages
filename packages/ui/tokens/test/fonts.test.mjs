// Offline checks for the packaged Instrument Sans (@vvedantb/ui/fonts/instrument-sans.css).
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FONTS = join(PKG, "fonts");
const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));
const css = readFileSync(join(FONTS, "instrument-sans.css"), "utf8");
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);

test("the export resolves through the package name to fonts/instrument-sans.css", () => {
  assert.equal(pkg.exports["./fonts/instrument-sans.css"], "./fonts/instrument-sans.css");
  assert.equal(fileURLToPath(import.meta.resolve("@vvedantb/ui/fonts/instrument-sans.css")), join(FONTS, "instrument-sans.css"));
});

test("four faces: normal and italic, latin and latin-ext, variable weight 400-700", () => {
  assert.equal(faces.length, 4);
  for (const face of faces) {
    assert.match(face, /font-family: "Instrument Sans";/);
    assert.match(face, /font-weight: 400 700;/);
    assert.match(face, /font-display: swap;/);
    assert.match(face, /unicode-range:/);
  }
  assert.deepEqual(faces.map((f) => f.match(/font-style: (\w+);/)[1]).sort(), ["italic", "italic", "normal", "normal"]);
});

test("every url() is relative and points at a woff2 file next to the CSS", () => {
  assert.deepEqual(urls.sort(), [
    "./InstrumentSans-Italic-latin-ext.woff2",
    "./InstrumentSans-Italic-latin.woff2",
    "./InstrumentSans-latin-ext.woff2",
    "./InstrumentSans-latin.woff2",
  ]);
  for (const url of urls) {
    const file = join(FONTS, url);
    assert.ok(existsSync(file), url);
    assert.equal(readFileSync(file).subarray(0, 4).toString("latin1"), "wOF2", `${url} is not woff2`);
  }
  // Nothing in the folder is left unreferenced, apart from the CSS and the licence.
  const shipped = readdirSync(FONTS).filter((f) => f !== "instrument-sans.css" && f !== "OFL.txt");
  assert.deepEqual(shipped.sort(), urls.map((u) => u.slice(2)).sort());
});

test("the OFL licence ships with the fonts", () => {
  assert.match(readFileSync(join(FONTS, "OFL.txt"), "utf8"), /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.ok(pkg.files.includes("fonts"), "fonts/ is in package.json files");
  for (const pattern of pkg.files.filter((f) => f.startsWith("!"))) assert.doesNotMatch(pattern, /fonts|woff2|\.txt|\.css/, pattern);
});

test("ends with the unlayered html, body rule over Clerk's Inter", () => {
  assert.ok(css.trimEnd().endsWith("html,\nbody {\n  font-family: var(--font-sans);\n}"));
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /@layer/);
  assert.match(css, /Clerk injects unlayered `body \{ font-family: Inter \}`/);
});

test("web apps are unchanged: no token stylesheet imports the fonts", () => {
  const sheets = [join(PKG, "tokens/src/tokens.css"), ...readdirSync(join(PKG, "tokens/src/css")).map((f) => join(PKG, "tokens/src/css", f))];
  for (const sheet of sheets) assert.doesNotMatch(readFileSync(sheet, "utf8"), /instrument-sans\.css|\.woff2/, sheet);
});

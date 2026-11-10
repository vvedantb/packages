// Run with: node --test scripts/check-no-source-text-in-tests.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { findViolations } from "./check-no-source-text-in-tests.mjs";

// Samples are built from parts so this file does not hold a flagged call itself.
const read = (args) => `const t = ${["readFile", "Sync"].join("")}(${args}, "utf8");`;

test("flags reads of source, CSS and markdown", () => {
  for (const args of ['join(root, "src", "Button.tsx")', '"tokens/src/css/tabs.css"', "srcDir", '"README.md"']) {
    assert.equal(findViolations(read(args)).length, 1, args);
  }
});

test("flags directory scans of source", () => {
  assert.equal(findViolations(`${["readdir", "Sync"].join("")}(join(root, "src"), { recursive: true });`).length, 1);
});

test("flags ?raw imports", () => {
  assert.equal(findViolations(`import css from "./tabs.css${"?raw"}";`).length, 1);
});

test("leaves JSON fixtures and build output alone", () => {
  for (const args of ['new URL("./fixtures/app.json", import.meta.url)', 'join(distDir, "index.d.ts.map")'.replace(".d.ts.map", ".json")]) {
    assert.deepEqual(findViolations(read(args)), [], args);
  }
});

test("honours an allow comment with a reason", () => {
  assert.deepEqual(findViolations(`// allow-source-read: feeds the transpiler\n${read('"src/a.ts"')}`), []);
});

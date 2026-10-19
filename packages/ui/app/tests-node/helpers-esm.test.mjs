// Plain Node ESM, no vitest: the theme, page title, page motion and time
// helpers transpiled as they are and imported from a fixture that has react and
// react-dom but no `motion`. The package root itself ships TypeScript and other
// root modules import `motion`, so the root cannot be loaded this way; this
// proves the new helpers add no `motion` import.
// Run with: node --test app/tests-node/helpers-esm.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ts = createRequire(join(pkgDir, "package.json"))("typescript");

const modules = [
  "theme/createThemeProvider.tsx",
  "page-title/createPageTitleContext.tsx",
  "page-motion/PageMotionProvider.tsx",
  "time/compactRelativeTime.ts",
];

test("helper sources import nothing but react", () => {
  for (const file of modules) {
    const source = readFileSync(join(pkgDir, "app/src", file), "utf8");
    const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    for (const specifier of specifiers) assert.ok(specifier === "react", `${file} imports ${specifier}`);
  }
});

test("plain Node ESM imports and renders the helpers without motion installed", () => {
  const dir = mkdtempSync(join(tmpdir(), "vvedantb-ui-helpers-"));
  try {
    for (const file of modules) {
      const out = join(dir, file.replace(/\.tsx?$/, ".js"));
      mkdirSync(dirname(out), { recursive: true });
      const { outputText } = ts.transpileModule(readFileSync(join(pkgDir, "app/src", file), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      });
      writeFileSync(out, outputText);
    }
    writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
    mkdirSync(join(dir, "node_modules"));
    for (const name of ["react", "react-dom"]) {
      symlinkSync(join(pkgDir, "node_modules", name), join(dir, "node_modules", name), "dir");
    }
    writeFileSync(
      join(dir, "check.mjs"),
      `
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { createThemeProvider, getSystemTheme } from "./theme/createThemeProvider.js";
import { createPageTitleContext } from "./page-title/createPageTitleContext.js";
import { PageMotionProvider, useDisablePageMotion } from "./page-motion/PageMotionProvider.js";
import { formatCompactRelativeTime } from "./time/compactRelativeTime.js";

await assert.rejects(import("motion/react"), /Cannot find package/);

const Config = ({ reducedMotion, children }) => h("i", { "data-reduced": reducedMotion }, children);
const Flag = () => String(useDisablePageMotion());
assert.equal(
  renderToString(h(PageMotionProvider, { disabled: true, motionConfig: Config }, h(Flag))),
  '<i data-reduced="always">true</i>',
);

const theme = createThemeProvider();
const ThemeRead = () => String(theme.useTheme().theme);
assert.equal(renderToString(h(theme.ThemeProvider, { attribute: "class" }, h(ThemeRead))), "undefined");
assert.equal(getSystemTheme(), "light");

const titles = createPageTitleContext();
const TitleRead = () => JSON.stringify(titles.usePageTitle().pageTitle);
assert.equal(renderToString(h(titles.PageTitleProvider, null, h(TitleRead))), '&quot;&quot;');

assert.equal(formatCompactRelativeTime(0, { now: 90_000, justNow: "now" }), "1m");
`,
    );
    const run = spawnSync(process.execPath, ["check.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(run.status, 0, `plain Node import failed:\n${run.stdout}${run.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

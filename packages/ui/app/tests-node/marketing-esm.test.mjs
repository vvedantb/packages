// Plain Node ESM, no vitest: the landing kit, `SiteFooter` and `PricingModal`
// with every module they import, transpiled as they are, run in a fixture that
// links only the required peers they use. Motion and Clerk are optional peers
// and absent there; `createLandingKit` takes the app's `motion`.
// Run with: node --test app/tests-node/marketing-esm.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ts = createRequire(join(pkgDir, "package.json"))("typescript");

const entries = [
  "src/marketing/landing.tsx",
  "src/marketing/createLandingKit.tsx",
  "src/marketing/SiteFooter.tsx",
  "src/marketing/PricingModal.tsx",
];
const OPTIONAL = /^(motion|@clerk\/|@tanstack\/react-hotkeys|zod)/;

/** Runtime import and re-export specifiers (type-only ones are erased by the transpile). */
function runtimeImports(source) {
  return [...source.matchAll(/^(?:import|export)\s+(?!type\b)[^;]*?from\s+"([^"]+)";/gms)].map((m) => m[1]);
}

function resolveLocal(from, specifier) {
  const base = resolve(dirname(from), specifier.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`cannot resolve ${specifier} from ${from}`);
}

/** Every local module reachable from the entries, and the bare packages they use. */
function graph() {
  const files = new Set();
  const packages = new Set();
  const queue = entries.map((e) => join(pkgDir, e));
  while (queue.length) {
    const file = queue.pop();
    if (files.has(file)) continue;
    files.add(file);
    for (const specifier of runtimeImports(readFileSync(file, "utf8"))) {
      if (specifier.startsWith(".")) queue.push(resolveLocal(file, specifier));
      else packages.add(specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0]);
    }
  }
  return { files, packages };
}

test("marketing modules import no optional peer at runtime", () => {
  const { packages } = graph();
  for (const name of packages) assert.ok(!OPTIONAL.test(name), `marketing imports ${name}`);
});

test("plain Node ESM imports and renders the marketing components without motion or Clerk", () => {
  const { files, packages } = graph();
  const dir = mkdtempSync(join(tmpdir(), "vvedantb-ui-marketing-"));
  try {
    for (const file of files) {
      const out = join(dir, relative(pkgDir, file).replace(/\.tsx?$/, ".js"));
      mkdirSync(dirname(out), { recursive: true });
      const source = readFileSync(file, "utf8").replace(/(from\s+")(\.[^"]+)(")/g, (_m, open, specifier, close) => {
        const target = resolveLocal(file, specifier).replace(/\.tsx?$/, ".js");
        const rel = relative(dirname(file), target).replace(/\\/g, "/");
        return `${open}${rel.startsWith(".") ? rel : `./${rel}`}${close}`;
      });
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      });
      writeFileSync(out, outputText);
    }
    writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
    for (const name of new Set([...packages, "react", "react-dom"])) {
      const link = join(dir, "node_modules", name);
      mkdirSync(dirname(link), { recursive: true });
      symlinkSync(join(pkgDir, "node_modules", name), link, "dir");
    }
    writeFileSync(
      join(dir, "check.mjs"),
      `
import assert from "node:assert/strict";
import { createElement as h, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingFeatureCard, LandingPageLayout } from "./src/marketing/landing.js";
import { createLandingKit } from "./src/marketing/createLandingKit.js";
import { SiteFooter } from "./src/marketing/SiteFooter.js";
import { PricingModal } from "./src/marketing/PricingModal.js";

await assert.rejects(import("motion/react"), /Cannot find package/);
await assert.rejects(import("@clerk/clerk-react"), /Cannot find package/);

// A Motion stand-in: plain elements that drop the animation props.
const plain = (tag) => ({ initial, animate, whileInView, viewport, variants, transition, ...props }) => h(tag, props);
const motion = { div: plain("div"), p: plain("p"), h1: plain("h1"), ul: plain("ul"), header: plain("header") };
const { LandingHero, LandingCta } = createLandingKit({ motion });

const Icon = () => h("svg");
const page = renderToStaticMarkup(
  h(LandingPageLayout, {
    nav: h("nav"),
    hero: h(LandingHero, { eyebrow: "E", title: "T", description: "D", capabilities: ["MCP"] }),
    footer: h(SiteFooter, { brand: "B", tagline: "T", socials: [], columns: [], name: "N", year: 2026, legalLinks: [] }),
  }, h(LandingFeatureCard, { icon: Icon, title: "F", description: "D" }), h(LandingCta, { title: "C", description: "D" })),
);
assert.match(page, /landing-atmosphere/);
assert.match(page, /Copyright © 2026 N/);
assert.equal(typeof PricingModal, "function");
`,
    );
    const run = spawnSync(process.execPath, ["check.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(run.status, 0, `plain Node import failed:\n${run.stdout}${run.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

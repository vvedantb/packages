// Plain Node ESM, no vitest: the landing kit, `SiteFooter` and `PricingModal`
// with every module they import, transpiled as they are, run in a fixture that
// links only the required peers they use. Motion and Clerk are optional peers
// and absent there; `createLandingKit` takes the app's `motion`.
// Run with: node --test app/tests-node/marketing-esm.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { graph, writeFixture } from "./graph.mjs";

const entries = [
  "src/marketing/landing.tsx",
  "src/marketing/createLandingKit.tsx",
  "src/marketing/SiteFooter.tsx",
  "src/marketing/PricingModal.tsx",
];
const OPTIONAL = /^(motion|@clerk\/|@tanstack\/react-hotkeys|zod)/;

test("marketing modules import no optional peer at runtime", () => {
  const { packages } = graph(entries);
  for (const name of packages.keys()) assert.ok(!OPTIONAL.test(name), `marketing imports ${name}`);
});

test("plain Node ESM imports and renders the marketing components without motion or Clerk", () => {
  const { files, packages } = graph(entries);
  const dir = mkdtempSync(join(tmpdir(), "vvedantb-ui-marketing-"));
  try {
    writeFixture(dir, files, new Set([...packages.keys(), "react", "react-dom"]));
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

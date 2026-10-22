// Plain Node ESM, no vitest: the artifact viewers in src/artifacts.
//
// `@vvedantb/server` is an optional peer, but the root imports it statically
// (the frame needs `wrapArtifactDocument` and the state ops at runtime). This
// pins which root modules import it, and server-renders the frame against the
// built package. Run after `pnpm build` (the workspace link points at its dist).
// Run with: node --test app/tests-node/artifacts-esm.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { graph, writeFixture } from "./graph.mjs";

test("in the root graph only src/artifacts imports @vvedantb/server", () => {
  const { packages } = graph(["src/index.ts"]);
  const importers = packages.get("@vvedantb/server") ?? [];
  assert.ok(importers.length > 0);
  assert.deepEqual(importers.filter((file) => !file.startsWith("src/artifacts/")), []);
});

test("ArtifactFrame renders a sandboxed iframe in plain Node", () => {
  const entries = ["src/artifacts/artifact-frame.tsx"];
  const { files, packages } = graph(entries);
  assert.deepEqual([...packages.keys()].sort(), ["@vvedantb/server", "clsx", "react", "tailwind-merge", "zod"]);
  const dir = mkdtempSync(join(tmpdir(), "vvedantb-ui-artifacts-"));
  try {
    writeFixture(dir, files, new Set([...packages.keys(), "react-dom"]));
    writeFileSync(
      join(dir, "check.mjs"),
      `
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtifactFrame } from "./src/artifacts/artifact-frame.js";

const html = renderToStaticMarkup(h(ArtifactFrame, { body: "<p>x</p>", format: "html", title: "Doc" }));
assert.match(html, /^<iframe /);
assert.match(html, /sandbox="allow-scripts"/);
assert.match(html, /title="Doc"/);
assert.doesNotMatch(html, /allow-same-origin|srcdoc/i);
`,
    );
    const result = spawnSync(process.execPath, ["check.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(result.status, 0, `plain Node import failed:\n${result.stdout}${result.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

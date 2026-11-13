// Proof that the agent clock is not in the default bundle. This runs a real
// `expo export --platform android` twice, with and without EXPO_PUBLIC_NATIVE_UI_AGENT=1,
// and searches the emitted JavaScript for the clock and bridge markers.
// Slow (minutes): run it with `pnpm --filter native-gallery test:strip`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const appDir = resolve(import.meta.dirname, "..");

// Strings and property names that survive minification. Local variable names do not.
const MARKERS = [
  "NATIVE_UI_AGENT", // the result and ready markers, and the env flag name
  "installAgentClock",
  "installAgent",
  "__nativeUiAgentClock",
  "handleAgentUrl",
  "setAgentRoute",
  "AgentMotion",
];

function exportBundle(agent) {
  const out = mkdtempSync(join(tmpdir(), `gallery-export-${agent ? "agent" : "prod"}-`));
  const env = { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" };
  delete env.EXPO_PUBLIC_NATIVE_UI_AGENT;
  if (agent) env.EXPO_PUBLIC_NATIVE_UI_AGENT = "1";
  // --no-bytecode keeps the bundle as readable JS. Metro still minifies it.
  const r = spawnSync("npx", ["expo", "export", "--platform", "android", "--no-bytecode", "--clear", "--output-dir", out], {
    cwd: appDir,
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(r.status, 0, `expo export failed:\n${r.stdout}\n${r.stderr}`);
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".js")) files.push(p);
    }
  };
  walk(out);
  assert.ok(files.length > 0, "export wrote no JavaScript bundle");
  const text = files.map((f) => readFileSync(f, "utf8")).join("\n");
  assert.ok(text.length > 100_000, `bundle is suspiciously small (${text.length} bytes)`);
  return { out, text };
}

test("default bundle has no agent clock or bridge; agent bundle has them", { timeout: 20 * 60_000 }, () => {
  const prod = exportBundle(false);
  const agent = exportBundle(true);
  try {
    for (const m of MARKERS) {
      assert.ok(!prod.text.includes(m), `default bundle contains "${m}"`);
      assert.ok(agent.text.includes(m), `agent bundle is missing "${m}"`);
    }
    // The gate is the only difference that matters: the agent bundle is larger.
    assert.ok(agent.text.length > prod.text.length);
  } finally {
    rmSync(prod.out, { recursive: true, force: true });
    rmSync(agent.out, { recursive: true, force: true });
  }
});

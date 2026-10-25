// Offline checks for scripts/build-brand-assets.mjs.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = join(PKG, "scripts/build-brand-assets.mjs");
const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

test("writes the SVG set for one app", () => {
  const out = mkdtempSync(join(tmpdir(), "brand-assets-"));
  try {
    const result = run("--out", out, "--app", "vhub", "--no-png");
    assert.equal(result.status, 0, result.stderr);
    for (const file of ["mark.svg", "icon.svg", "favicon.svg", "icon-light.svg", "android/adaptive-foreground.svg"]) {
      assert.ok(existsSync(join(out, "vhub", file)), file);
    }
    assert.ok(!existsSync(join(out, "vibot")), "only the requested app is written");
    assert.ok(!existsSync(join(out, "vhub/favicon-32.png")), "--no-png skips PNGs");
    const mark = readFileSync(join(out, "vhub/mark.svg"), "utf8");
    assert.match(mark, /viewBox="186 338 582 348"/);
    assert.match(mark, /stroke="currentColor"/);
    const icon = readFileSync(join(out, "vhub/icon.svg"), "utf8");
    assert.match(icon, /<rect width="1024" height="1024" rx="224" fill="#000"\/>/);
    assert.match(readFileSync(join(out, "vhub/icon-light.svg"), "utf8"), /fill="#fff"/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("--dry-run lists files and writes nothing", () => {
  const out = join(tmpdir(), `brand-assets-dry-${process.pid}`);
  const result = run("--out", out, "--app", "velth", "--dry-run", "--no-png");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /would write .*velth\/icon\.svg/);
  assert.ok(!existsSync(out));
});

test("writes every app by default and rejects bad input", () => {
  const dry = run("--out", join(tmpdir(), "brand-assets-all"), "--dry-run", "--no-png");
  for (const app of ["projectv", "vibot", "vhub", "vmem", "verve", "velth"]) assert.match(dry.stdout, new RegExp(`${app}/mark\\.svg`), app);
  assert.notEqual(run("--out", tmpdir(), "--app", "nope").status, 0);
  assert.notEqual(run().status, 0);
});

// Offline checks for scripts/build-brand-assets.mjs.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = join(PKG, "scripts/build-brand-assets.mjs");
const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
const { pngSpecs } = await import(SCRIPT);

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
    assert.match(mark, /viewBox="162.5 197.5 629 629"/);
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

test("the extension icon set is extension/icon-{16,32,48,128}.png", () => {
  const extension = pngSpecs("vmem").filter(([file]) => file.startsWith("extension/"));
  assert.deepEqual(extension.map(([file, , px]) => [file, px]), [
    ["extension/icon-16.png", 16],
    ["extension/icon-32.png", 32],
    ["extension/icon-48.png", 48],
    ["extension/icon-128.png", 128],
  ]);
});

// Node will not strip types under node_modules, so the script strips svg.ts itself there.
test("runs from an installed copy under node_modules", () => {
  const dir = mkdtempSync(join(tmpdir(), "brand-assets-installed-"));
  try {
    const installed = join(dir, "node_modules/@vvedantb/ui");
    for (const file of ["package.json", "scripts/build-brand-assets.mjs", "src/brand/svg.ts"]) cpSync(join(PKG, file), join(installed, file));
    const result = spawnSync(process.execPath, [join(installed, "scripts/build-brand-assets.mjs"), "--out", join(dir, "installed"), "--app", "vmem", "--no-png"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(run("--out", join(dir, "repo"), "--app", "vmem", "--no-png").status, 0);
    for (const file of ["mark.svg", "icon.svg", "icon-light.svg", "android/adaptive-foreground.svg"]) {
      assert.equal(readFileSync(join(dir, "installed/vmem", file), "utf8"), readFileSync(join(dir, "repo/vmem", file), "utf8"), file);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

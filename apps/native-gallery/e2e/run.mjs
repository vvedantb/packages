#!/usr/bin/env node
// Gallery e2e on an Android emulator, driven by scripts/agent/adb.mjs and the test clock.
// Needs the agent build (`pnpm --filter native-gallery build:android:agent`) installed.
// Covers the five flows that used to live in .maestro/. Each step prints one JSON line;
// a failure saves screenshots/FAIL-<scenario>.png and exits 1.
//
// Usage: node e2e/run.mjs [scenario ...]   (scenarios: screens dropdown composer sheets select)
import { resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import {
  AgentError, adb, back, clock, dumpNodes, launch, logs, screenshot, sleep, swipe, tap, typeText, waitFor,
} from "../../../scripts/agent/adb.mjs";
import { resolveTarget } from "../../../scripts/agent/lib.mjs";

const shots = resolve(import.meta.dirname, "../screenshots");
const log = (o) => process.stdout.write(`${JSON.stringify(o)}\n`);
const report = [];

/** Run a condition-polling wait. No fixed sleeps: the clock supplies determinism, polling supplies patience. */
async function until(what, fn, timeout = 8000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await sleep(200);
  }
  throw new AgentError(`timed out waiting for ${what}`);
}

/** Let virtual timers and frames run to idle. A budget stop is logged, not fatal. */
async function settle() {
  const r = await clock("settle");
  if (!r.state.idle) log({ note: "settle hit its budget", state: r.state });
  return r;
}

const visible = (target) => resolveTarget(dumpNodes({ retries: 2 }), target).ok;

async function see(target) {
  await until(`"${target}" visible`, () => visible(target));
}
async function gone(target) {
  await until(`"${target}" gone`, () => !visible(target));
}

/** Tap a target, scrolling the page up to a few times if it is off screen. */
async function press(target) {
  for (let i = 0; i < 8; i++) {
    const nodes = dumpNodes({ retries: 2 });
    if (resolveTarget(nodes, target).ok) {
      tap(target, nodes);
      await settle();
      return;
    }
    const [, , w, h] = nodes[0].bounds;
    swipe(w / 2, Math.round(h * 0.75), w / 2, Math.round(h * 0.3), 300);
    await settle();
  }
  throw new AgentError(`could not scroll "${target}" into view`);
}

async function goBack() {
  back();
  await settle();
}

const shot = (name) => log({ screenshot: screenshot(resolve(shots, `${name}.png`)).path });

/** Fresh app state, home screen showing, clock frozen. */
async function fresh() {
  launch({ clear: true });
  await until("home screen", () => visible("home"), 60_000);
  await until("agent bridge", async () => {
    try {
      await clock("freeze", { timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  }, 30_000);
  await settle();
}

const composerHeight = () => {
  const n = dumpNodes({ retries: 2 }).find((x) => x.id === "composer-height");
  return n ? Number(/\d+/.exec(n.text)?.[0]) : NaN;
};

async function growComposer(layout, lines) {
  if (layout) await press(layout);
  await press("composer-input");
  await until("composer height", () => Number.isFinite(composerHeight()));
  const before = composerHeight();
  typeText(lines.join("\n"));
  await settle();
  const after = await until("composer to grow", () => {
    const h = composerHeight();
    return h > before ? h : 0;
  });
  log({ composer: { layout: layout ?? "inline", before, after } });
}

const scenarios = {
  async screens() {
    await fresh();
    shot("home");
    for (const [link, marker, name] of [
      ["link-layering", "layering-tab-bar", "layering"],
      ["link-keyboard", "composer-input", "keyboard"],
      ["link-auth", "sign-in-submit", "auth-mock"],
      ["link-ai", "screen-ai", "ai"],
    ]) {
      await press(link);
      await see(marker);
      if (name === "layering") await see("Home");
      shot(name);
      await goBack();
      await see("home");
    }
  },
  async dropdown() {
    await fresh();
    await press("link-layering");
    await see("layering-tab-bar");
    await see("Home");
    await press("dd-trigger");
    await see("dd-item-rename");
    shot("layering-dropdown-open");
    // The radio row keeps the menu open after a pick, and the result shows.
    await press("dd-radio-oldest");
    await see("Sort: oldest");
    await press("dd-trigger");
    await press("dd-item-rename");
    await see("Result: rename");
    await gone("dd-item-rename");
  },
  async composer() {
    await fresh();
    await press("link-keyboard");
    await see("composer-height");
    await growComposer(null, ["line one", "line two", "line three", "line four"]);
    shot("keyboard-composer-inline-grown");
    back(); // closes the keyboard
    await settle();
    await growComposer("kb-layout-stacked", ["one", "two", "three", "four"]);
    shot("keyboard-composer-stacked-grown");
  },
  async sheets() {
    await fresh();
    await press("link-layering");
    await press("sheet-open");
    await see("sheet-body");
    shot("layering-sheet-open");
    await press("sheet-close");
    await gone("sheet-body");
    await press("bottom-sheet-open");
    await see("bottom-sheet-body");
    shot("layering-bottom-sheet-open");
    await press("bottom-sheet-close");
    await gone("bottom-sheet-body");
  },
  async select() {
    await fresh();
    await press("link-layering");
    await see("Select: undefined");
    await press("layer-select");
    await see("layer-select-pink");
    shot("layering-select-open");
    await press("layer-select-pink");
    await see("Select: pink");
    await see("Result: select pink");
  },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(scenarios);
const unknown = names.filter((n) => !scenarios[n]);
if (unknown.length) {
  log({ ok: false, error: `unknown scenario ${unknown.join(", ")}`, scenarios: Object.keys(scenarios) });
  process.exit(2);
}

mkdirSync(shots, { recursive: true });
let failed = false;
for (const name of names) {
  const t0 = Date.now();
  try {
    await scenarios[name]();
    report.push({ scenario: name, ok: true, ms: Date.now() - t0 });
    log({ scenario: name, ok: true, ms: Date.now() - t0 });
  } catch (e) {
    failed = true;
    report.push({ scenario: name, ok: false, error: e.message });
    log({ scenario: name, ok: false, error: e.message, ...(e.extra ?? {}) });
    try {
      screenshot(resolve(shots, `FAIL-${name}.png`));
      log({ logs: logs({ grep: "NATIVE_UI_AGENT|ReactNativeJS|AndroidRuntime", lines: 300 }).slice(-40) });
    } catch {
      // The device may be gone. The failure is already logged.
    }
  }
}
writeFileSync(resolve(shots, "e2e-report.json"), `${JSON.stringify(report, null, 2)}\n`);
log({ ok: !failed, scenarios: report.length, failed: report.filter((r) => !r.ok).map((r) => r.scenario) });
process.exit(failed ? 1 : 0);

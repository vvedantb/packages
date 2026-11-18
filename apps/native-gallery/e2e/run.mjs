#!/usr/bin/env node
// Gallery e2e on an Android emulator, driven by scripts/agent/adb.mjs and the test clock.
// Needs the agent build (`pnpm --filter native-gallery build:android:agent`) installed.
// Covers the five flows that used to live in .maestro/, plus pager-linked tabs. Each step
// prints one JSON line; a failure saves screenshots/FAIL-<scenario>.png and exits 1.
//
// Usage: node e2e/run.mjs [scenario ...]   (scenarios: screens sections dropdown composer sheets nativeSheet select pager dialog messageSheet menuSheet contextMenu chatHold)
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

/**
 * A press and hold on a target (scrolled into view as `press` does): a swipe
 * that stays put for 800 ms. The long press is a JS timer, which the frozen
 * clock would never fire, so the clock runs for the hold and freezes again.
 */
async function hold(target) {
  for (let i = 0; i < 8; i++) {
    const nodes = dumpNodes({ retries: 2 });
    const r = resolveTarget(nodes, target);
    if (r.ok) {
      await clock("resume");
      swipe(r.x, r.y, r.x, r.y, 800);
      await clock("freeze");
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

/**
 * On the chat-hold screen: scroll up to an older message, hold it, then (if
 * the menu opened) swipe the backdrop. Says whether the menu opened and
 * whether the list jumped to the newest message at either step.
 */
async function holdOlderMessage(name) {
  const target = "Chat message 20:";
  const newest = "Chat message 40:";
  await see(newest);
  const [, , w, h] = dumpNodes({ retries: 2 })[0].bounds;
  // Inverted: older messages are above, so the finger drags down.
  for (let i = 0; i < 12 && !visible(target); i++) {
    swipe(w / 2, Math.round(h * 0.35), w / 2, Math.round(h * 0.6), 300);
    await settle();
  }
  await see(target);
  shot(`${name}-before-hold`);
  await hold(target);
  const card = await until("the hold menu", () => {
    const r = resolveTarget(dumpNodes({ retries: 2 }), "message-context-menu-action-copy");
    return r.ok ? r : null;
  }, 4000).catch(() => null);
  shot(`${name}-after-hold`);
  const afterHold = { menuOpen: card !== null, newestVisible: visible(newest), targetVisible: visible(target) };
  if (!card) return { afterHold, jumped: afterHold.newestVisible };
  // A swipe that starts on the backdrop, away from the card.
  const start = card.y > h / 2 ? Math.round(h * 0.15) : Math.round(h * 0.55);
  swipe(Math.round(w * 0.2), start, Math.round(w * 0.2), start + Math.round(h * 0.3), 300);
  await settle();
  await gone("message-context-menu-action-copy");
  shot(`${name}-after-swipe`);
  const afterSwipe = { newestVisible: visible(newest), targetVisible: visible(target) };
  return { afterHold, afterSwipe, jumped: afterHold.newestVisible || afterSwipe.newestVisible };
}

/**
 * The CI emulator's own apps (the launcher) sometimes stop responding, and the
 * system "… isn't responding" dialog then covers the app for the whole run.
 * Tap its Wait. An ANR of the gallery itself is not dismissed: that is a bug.
 */
function dismissSystemAnr() {
  const nodes = dumpNodes({ retries: 2 });
  const anr = nodes.find((n) => /isn.t responding/i.test(n.text ?? ""));
  if (!anr || /gallery/i.test(anr.text)) return false;
  log({ dismissed: anr.text });
  tap("text=Wait", nodes);
  return true;
}

/** Fresh app state, home screen showing, clock frozen. */
async function fresh() {
  launch({ clear: true });
  await until("home screen", () => visible("home") || (dismissSystemAnr() && false), 60_000);
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

async function sectionsWithAnimations() {
  await fresh();
  // Real time, not the frozen test clock: the skeleton pulse and LoadingState
  // loop forever, so `settle` (run to idle) can never finish inside a section.
  await clock("resume");
  for (const [link, marker, name] of [
    ["link-layout", "section-layout", "section-layout"],
    ["link-forms", "section-forms", "section-forms"],
    ["link-parity", "screen-parity", "screen-parity"],
    ["link-ai-cards", "section-ai-cards", "section-ai-cards"],
  ]) {
    await press(link);
    await see(marker);
    for (let i = 0; i < 6; i++) {
      const [, , w, h] = dumpNodes({ retries: 2 })[0].bounds;
      swipe(w / 2, Math.round(h * 0.8), w / 2, Math.round(h * 0.25), 300);
      await sleep(600);
    }
    await see(marker);
    shot(name);
    back();
    await see("home");
  }
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
  // The sections an app's list screens draw from: list rows, the
  // running LoadingState grid (a Reanimated frame callback), skeletons, the
  // search field, empty states and markdown. Each is scrolled through so every
  // part mounts and animates; the app must still be alive after each one.
  async sections() {
    // CI boots the emulator with animations off, which Android reports as
    // Reduce Motion: the skeleton pulse and the LoadingState frame callback
    // would take their still paths. Turn animations on so the UI-thread
    // animation code runs, then restore the CI default.
    const scales = ["animator_duration_scale", "transition_animation_scale", "window_animation_scale"];
    for (const key of scales) adb(["shell", "settings", "put", "global", key, "1"]);
    try {
      await sectionsWithAnimations();
    } finally {
      for (const key of scales) adb(["shell", "settings", "put", "global", key, "0"], { allowFail: true });
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
  // The default and the multi-detent bottom sheets, on the bottom sheet screen.
  async nativeSheet() {
    await fresh();
    await press("link-bottom-sheet");
    await press("default-sheet-open");
    await see("default-sheet-body");
    shot("bottom-sheet-default");
    await press("default-sheet-close");
    await gone("default-sheet-body");
    await press("native-sheet-open");
    await see("native-sheet-body");
    await see("native-sheet-row-0");
    shot("bottom-sheet-multi-detent");
    await press("native-sheet-close");
    await gone("native-sheet-body");
  },
  // A centred dialog scales in over a fading backdrop and is gone once closed.
  async dialog() {
    await fresh();
    await press("link-layering");
    await press("alert-open");
    await see("alert-cancel");
    shot("layering-alert-dialog-open");
    await press("alert-cancel");
    await gone("alert-cancel");
  },
  // The message action sheet slides up like a sheet and is gone once closed.
  async menuSheet() {
    await fresh();
    await press("link-layering");
    await see("layering-tab-bar");
    await press("menu-sheet-open");
    await see("menu-sort");
    await see("React 👍");
    shot("layering-menu-sheet-open");
    // A reaction stays in the sheet; the submenu swaps the page and Back returns to the root.
    await press("Good response");
    await see("menu-sort");
    await press("menu-sort");
    await see("menu-sort-oldest");
    await press("menu-sort-oldest");
    await press("Back");
    await see("menu-sort");
    await see("Oldest first");
    // A row closes the sheet and runs.
    await press("menu-delete");
    await see("Result: menu delete");
    await gone("menu-sort");
  },
  async contextMenu() {
    await fresh();
    await press("link-ai-cards");
    await hold("Hold this message");
    await see("message-context-menu-action-copy");
    await see("React 👍");
    shot("ai-cards-message-context-menu-open");
    // A reaction closes the menu and is kept; an action closes it and runs.
    await press("React 👍");
    await gone("message-context-menu-action-copy");
    await see("Menu: none · reaction 👍");
    await hold("Hold this message");
    await press("message-context-menu-action-copy");
    await see("Menu: copy · reaction 👍");
    // Android back closes it (a tap on the backdrop's centre would land on the pill).
    await hold("Hold this message");
    await see("message-context-menu-action-copy");
    back();
    await settle();
    await gone("message-context-menu-action-copy");
  },
  // A long inverted chat under the keyboard providers: scrolled up, an older
  // message held, the finger lifted, then a swipe on the backdrop. The menu
  // closes and the list stays where the reader left it (it once jumped to the
  // newest message on Android).
  // Run with and without the keyboard providers, so a failure names the part that moves the list.
  async chatHold() {
    await fresh();
    await press("link-chat-hold");
    const results = [];
    for (const providers of ["on", "off"]) {
      await see(`Keyboard providers: ${providers}`);
      results.push({ providers, ...(await holdOlderMessage(`chat-hold-${providers}`)) });
      if (providers === "on") await press("chat-hold-keyboard");
    }
    log({ chatHold: results });
    const moved = results.filter((r) => r.jumped);
    if (moved.length) throw new AgentError(`the list jumped to the newest message (providers ${moved.map((r) => r.providers).join(", ")})`);
  },
  async messageSheet() {
    await fresh();
    await press("link-ai-cards");
    await press("open-message-sheet");
    await see("message-action-sheet-action-copy");
    shot("ai-cards-message-action-sheet-open");
    await press("message-action-sheet-cancel");
    await gone("message-action-sheet-action-copy");
  },
  // Tabs linked to a Pager's progress run the sliding indicator's worklet on the
  // UI thread. A worklet that calls a plain JS function closes the app here.
  async pager() {
    await fresh();
    await press("link-layout");
    await press("pager-tab-0");
    await see("Page 1 of 3: Chats");
    for (const [tab, text] of [["pager-tab-2", "Page 3 of 3: Settings"], ["pager-tab-1", "Page 2 of 3: Files"]]) {
      await press(tab);
      await see(text);
    }
    // A swipe drives `progress` frame by frame, as a finger does.
    const nodes = dumpNodes({ retries: 2 });
    const page = nodes.find((n) => n.text === "Page 2 of 3: Files");
    if (!page?.center) throw new AgentError("pager page not found");
    const width = nodes[0].bounds[2];
    swipe(Math.round(width * 0.85), page.center[1], Math.round(width * 0.15), page.center[1], 300);
    await settle();
    await see("Page 3 of 3: Settings");
    shot("layout-pager-tabs");
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
    try {
      await scenarios[name]();
    } catch (e) {
      // The emulator's uiautomator sometimes returns nothing; that is the device, not
      // the app. Run the scenario once more from a fresh start. Any other error fails.
      if (e.message !== "uiautomator dump failed") throw e;
      log({ scenario: name, retry: e.message });
      await scenarios[name]();
    }
    report.push({ scenario: name, ok: true, ms: Date.now() - t0 });
    log({ scenario: name, ok: true, ms: Date.now() - t0 });
  } catch (e) {
    failed = true;
    report.push({ scenario: name, ok: false, error: e.message });
    log({ scenario: name, ok: false, error: e.message, ...(e.extra ?? {}) });
    try {
      screenshot(resolve(shots, `FAIL-${name}.png`));
      log({ logs: logs({ grep: "NATIVE_UI_AGENT|ReactNativeJS|AndroidRuntime|Worklets|FATAL", lines: 300 }).slice(-40) });
      // An app crash stays in the crash buffer after the main log rolls over.
      const crash = String(adb(["logcat", "-d", "-b", "crash"], { allowFail: true })).trim();
      if (crash) log({ crash: crash.split("\n").slice(0, 30) });
    } catch {
      // The device may be gone. The failure is already logged.
    }
  }
}
writeFileSync(resolve(shots, "e2e-report.json"), `${JSON.stringify(report, null, 2)}\n`);
log({ ok: !failed, scenarios: report.length, failed: report.filter((r) => !r.ok).map((r) => r.scenario) });
process.exit(failed ? 1 : 0);

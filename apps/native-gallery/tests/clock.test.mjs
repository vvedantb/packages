// Runs the clock and bridge exports (Node strips the TypeScript types). No source text is read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClock, installAgentClock } from "../src/agent/clock.ts";
import { handleAgentUrl, parseAgentUrl, normaliseCmd, RESULT_MARKER } from "../src/agent/bridge.ts";

const fakeReal = () => ({ setTimeout: () => 0, clearTimeout: () => {}, now: () => 0 });
const frozenClock = () => {
  const c = createClock(fakeReal(), 1_000_000);
  c.freeze();
  return c;
};

test("timers fire in due order only when time advances", () => {
  const c = frozenClock();
  const log = [];
  c.setTimeout(() => log.push("b"), 200);
  c.setTimeout(() => log.push("a"), 100);
  c.setTimeout(() => log.push("a2"), 100);
  c.advance(99);
  assert.deepEqual(log, []);
  c.advance(1);
  assert.deepEqual(log, ["a", "a2"]);
  c.advance(500);
  assert.deepEqual(log, ["a", "a2", "b"]);
  assert.equal(c.now(), 600);
});

test("intervals repeat and clear", () => {
  const c = frozenClock();
  let n = 0;
  const id = c.setInterval(() => n++, 50);
  c.advance(260);
  assert.equal(n, 5);
  c.clearTimer(id);
  c.advance(500);
  assert.equal(n, 5);
});

test("timers created inside callbacks run in the same advance", () => {
  const c = frozenClock();
  const log = [];
  c.setTimeout(() => {
    log.push(c.now());
    c.setTimeout(() => log.push(c.now()), 30);
  }, 10);
  c.advance(100);
  assert.deepEqual(log, [10, 40]);
});

test("frames run on a 16 ms grid with a virtual timestamp", () => {
  const c = frozenClock();
  const seen = [];
  c.requestFrame((t) => {
    seen.push(t);
    if (seen.length < 3) c.requestFrame((t2) => seen.push(t2));
  });
  c.advance(100);
  assert.equal(seen[0], 1_000_016);
  assert.equal(seen.length, 2);
  const id = c.requestFrame(() => seen.push("cancelled"));
  c.cancelFrame(id);
  c.advance(100);
  assert.equal(seen.length, 2);
});

test("settle runs frame chains and near timers, ignores intervals and far timers", () => {
  const c = frozenClock();
  let frames = 0;
  const loop = () => {
    if (++frames < 20) c.requestFrame(loop);
  };
  c.requestFrame(loop);
  let near = 0;
  c.setTimeout(() => near++, 300);
  c.setInterval(() => {}, 100);
  let far = 0;
  c.setTimeout(() => far++, 60_000);
  const r = c.settle();
  assert.equal(frames, 20);
  assert.equal(near, 1);
  assert.equal(far, 0);
  assert.equal(r.idle, true);
  assert.equal(r.intervals, 1);
  assert.equal(r.timeouts, 1);
});

test("settle stops at its budget for endless frame loops", () => {
  const c = frozenClock();
  const loop = () => c.requestFrame(loop);
  c.requestFrame(loop);
  const r = c.settle(500);
  assert.equal(r.reason, "budget");
  assert.ok(r.advancedMs >= 500 && r.advancedMs < 600);
});

test("a throwing callback does not stop the others", () => {
  const c = frozenClock();
  const err = console.error;
  console.error = () => {};
  let ok = false;
  c.setTimeout(() => {
    throw new Error("boom");
  }, 1);
  c.setTimeout(() => (ok = true), 2);
  c.advance(5);
  console.error = err;
  assert.equal(ok, true);
});

test("installAgentClock patches the target and virtualises Date and performance", () => {
  const target = {
    Date,
    performance: { now: () => 5 },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout,
  };
  const clock = installAgentClock(target);
  assert.equal(installAgentClock(target), clock);
  clock.freeze();
  const t0 = target.Date.now();
  const p0 = target.performance.now();
  let fired = 0;
  target.setTimeout((a) => (fired += a), 1000, 7);
  const iv = target.setInterval(() => fired++, 400);
  clock.advance(1000);
  target.clearInterval(iv);
  assert.equal(fired, 9);
  assert.equal(target.Date.now() - t0, 1000);
  assert.equal(target.performance.now() - p0, 1000);
  assert.equal(new target.Date().getTime(), target.Date.now());
  assert.equal(new target.Date(2020, 0, 1).getFullYear(), 2020);
  assert.ok(new target.Date() instanceof Date);
  clock.freeze();
});

test("resume follows real time again", async () => {
  const real = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout, now: () => Date.now() };
  const c = createClock(real, 0);
  c.freeze();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(c.now(), 0);
  c.resume();
  await new Promise((r) => setTimeout(r, 120));
  c.freeze();
  assert.ok(c.now() >= 60, `virtual time ${c.now()}`);
});

test("parseAgentUrl and normaliseCmd", () => {
  assert.deepEqual(parseAgentUrl("nativegallery://agent/clock?cmd=%2B100&id=x1"), { op: "clock", params: { cmd: "+100", id: "x1" } });
  assert.deepEqual(parseAgentUrl("/agent/state?id=a"), { op: "state", params: { id: "a" } });
  assert.equal(parseAgentUrl("nativegallery://layering"), null);
  assert.equal(parseAgentUrl("nativegallery://section/agent/x"), null);
  assert.equal(normaliseCmd(" 100"), "+100");
  assert.equal(normaliseCmd("+5"), "+5");
  assert.equal(normaliseCmd("freeze"), "freeze");
});

function capture(fn) {
  const lines = [];
  const log = console.log;
  console.log = (l) => lines.push(l);
  try {
    fn();
  } finally {
    console.log = log;
  }
  assert.equal(lines.length, 1);
  assert.ok(lines[0].startsWith(`${RESULT_MARKER} `));
  return JSON.parse(lines[0].slice(RESULT_MARKER.length + 1));
}

test("handleAgentUrl answers with one marker line per command", () => {
  const c = frozenClock();
  let n = 0;
  c.setTimeout(() => n++, 100);
  let r = capture(() => assert.equal(handleAgentUrl("nativegallery://agent/clock?cmd=freeze&id=1", c), true));
  assert.deepEqual([r.ok, r.id, r.op, r.state.frozen], [true, "1", "clock", true]);
  r = capture(() => handleAgentUrl("nativegallery://agent/clock?cmd=%2B150&id=2", c));
  assert.equal(r.state.elapsedMs, 150);
  assert.equal(n, 1);
  r = capture(() => handleAgentUrl("nativegallery://agent/clock?cmd=settle&id=3", c));
  assert.equal(r.idle, true);
  r = capture(() => handleAgentUrl("nativegallery://agent/clock?cmd=bogus&id=4", c));
  assert.equal(r.ok, false);
  assert.match(r.error, /unknown clock command/);
  r = capture(() => handleAgentUrl("nativegallery://agent/state?id=5", c));
  assert.equal(r.clock.frozen, true);
  assert.equal(handleAgentUrl("nativegallery://layering", c), false);
});

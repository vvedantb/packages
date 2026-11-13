// Deterministic test clock. Agent builds only: see install.ts for the gate.
//
// `installAgentClock(target)` replaces the timer, frame and time globals on `target`
// with a virtual clock. Live mode follows real time through a small pump. After
// `freeze`, time moves only on `advance(ms)` or `settle()`.
//
// Covered: setTimeout, setInterval, requestAnimationFrame, Date, Date.now,
// performance.now, and so RN `Animated` with the JS driver.
// Not covered: native-driver animations and Reanimated worklets, which run on
// the UI thread with their own frame loop.

export type ClockState = {
  frozen: boolean;
  /** Virtual milliseconds since install. */
  elapsedMs: number;
  timeouts: number;
  intervals: number;
  frames: number;
};

export type SettleResult = ClockState & { advancedMs: number; idle: boolean; reason: "idle" | "budget" };

type Timer = { id: number; due: number; seq: number; fn: () => void; every?: number };
type Real = {
  setTimeout: (fn: () => void, ms?: number) => unknown;
  clearTimeout: (h: unknown) => void;
  now: () => number;
};

const FRAME_MS = 16;
const MAX_CALLBACKS_PER_ADVANCE = 100_000;

export function createClock(real: Real, epochStart: number) {
  let now = 0;
  let frozen = false;
  let seq = 0;
  let nextId = 1;
  const timers = new Map<number, Timer>();
  let frames: { id: number; fn: (t: number) => void }[] = [];
  let frameAt = -1;
  let pump: unknown = null;
  let lastReal = 0;

  const guard = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      console.error("agent clock: callback threw", e);
    }
  };

  function nextTimer(): Timer | undefined {
    let best: Timer | undefined;
    for (const t of timers.values()) if (!best || t.due < best.due || (t.due === best.due && t.seq < best.seq)) best = t;
    return best;
  }

  function advance(ms: number) {
    const target = now + Math.max(0, ms);
    let calls = 0;
    for (;;) {
      const t = nextTimer();
      const dueT = t ? t.due : Infinity;
      const dueF = frames.length ? frameAt : Infinity;
      const next = Math.min(dueT, dueF);
      if (next > target) break;
      if (++calls > MAX_CALLBACKS_PER_ADVANCE) throw new Error("agent clock: too many callbacks in one advance (runaway timer?)");
      now = Math.max(now, next);
      if (dueT <= dueF && t) {
        if (t.every !== undefined) {
          t.due = now + t.every;
          t.seq = ++seq;
        } else timers.delete(t.id);
        guard(t.fn);
      } else {
        const batch = frames;
        frames = [];
        frameAt = now + FRAME_MS;
        for (const f of batch) guard(() => f.fn(epochStart + now));
      }
    }
    now = target;
  }

  const counts = () => {
    let timeouts = 0;
    let intervals = 0;
    for (const t of timers.values()) t.every === undefined ? timeouts++ : intervals++;
    return { timeouts, intervals, frames: frames.length };
  };

  const state = (): ClockState => ({ frozen, elapsedMs: now, ...counts() });

  /**
   * Run frames and one-shot timers until none are pending within `horizonMs`, or `budgetMs` passes.
   * Intervals never end, so they do not hold settle open.
   */
  function settle(budgetMs = 10_000, horizonMs = 1000): SettleResult {
    const start = now;
    let reason: "idle" | "budget" = "idle";
    for (;;) {
      const oneShots = [...timers.values()].filter((t) => t.every === undefined && t.due - now <= horizonMs);
      if (!frames.length && !oneShots.length) break;
      if (now - start >= budgetMs) {
        reason = "budget";
        break;
      }
      advance(FRAME_MS);
    }
    return { ...state(), advancedMs: now - start, idle: reason === "idle", reason };
  }

  function tick() {
    pump = null;
    if (frozen) return;
    const r = real.now();
    advance(r - lastReal);
    lastReal = r;
    pump = real.setTimeout(tick, FRAME_MS);
  }

  function startPump() {
    if (pump !== null) return;
    lastReal = real.now();
    pump = real.setTimeout(tick, FRAME_MS);
  }

  return {
    state,
    advance,
    settle,
    now: () => now,
    freeze() {
      frozen = true;
      if (pump !== null) real.clearTimeout(pump);
      pump = null;
    },
    resume() {
      frozen = false;
      startPump();
    },
    setTimeout(fn: () => void, ms = 0): number {
      const id = nextId++;
      timers.set(id, { id, due: now + Math.max(0, Number(ms) || 0), seq: ++seq, fn });
      return id;
    },
    setInterval(fn: () => void, ms = 0): number {
      const id = nextId++;
      const every = Math.max(1, Number(ms) || 0);
      timers.set(id, { id, due: now + every, seq: ++seq, fn, every });
      return id;
    },
    clearTimer(id: unknown) {
      if (typeof id === "number") timers.delete(id);
    },
    requestFrame(fn: (t: number) => void): number {
      const id = nextId++;
      if (!frames.length) frameAt = now + FRAME_MS;
      frames.push({ id, fn });
      return id;
    },
    cancelFrame(id: unknown) {
      frames = frames.filter((f) => f.id !== id);
    },
    epochNow: () => epochStart + now,
    startPump,
  };
}

export type AgentClock = ReturnType<typeof createClock>;

type Target = Record<string, any>;

/** Patch `target` (globalThis in the app). Returns the clock. */
export function installAgentClock(target: Target): AgentClock {
  if (target.__nativeUiAgentClock) return target.__nativeUiAgentClock as AgentClock;
  const RealDate = target.Date as DateConstructor;
  const real: Real = {
    setTimeout: target.setTimeout.bind(target),
    clearTimeout: target.clearTimeout.bind(target),
    now: () => RealDate.now(),
  };
  const clock = createClock(real, RealDate.now());
  const defineGlobal = (name: string, value: unknown) => {
    try {
      target[name] = value;
    } catch {
      Object.defineProperty(target, name, { value, configurable: true, writable: true });
    }
  };

  defineGlobal("setTimeout", (fn: (...a: any[]) => void, ms?: number, ...args: any[]) => clock.setTimeout(() => fn(...args), ms));
  defineGlobal("setInterval", (fn: (...a: any[]) => void, ms?: number, ...args: any[]) => clock.setInterval(() => fn(...args), ms));
  defineGlobal("clearTimeout", (id: unknown) => clock.clearTimer(id));
  defineGlobal("clearInterval", (id: unknown) => clock.clearTimer(id));
  defineGlobal("requestAnimationFrame", (fn: (t: number) => void) => clock.requestFrame(fn));
  defineGlobal("cancelAnimationFrame", (id: unknown) => clock.cancelFrame(id));

  class AgentDate extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) super(clock.epochNow());
      else super(...(args as [any]));
    }
    static now() {
      return clock.epochNow();
    }
  }
  defineGlobal("Date", AgentDate);

  const perf = target.performance;
  if (perf && typeof perf.now === "function") {
    const base = perf.now();
    try {
      perf.now = () => base + clock.now();
    } catch {
      // A read-only performance object: Date and timers are still virtual.
    }
  }

  clock.startPump();
  defineGlobal("__nativeUiAgentClock", clock);
  return clock;
}

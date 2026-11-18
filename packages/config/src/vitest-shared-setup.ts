import { afterEach, vi } from "vitest";

// Added to `setupFiles` by `sharedWorkerVitestConfig`. With isolation off, every test
// file shares one worker, so state set in one test can leak into the next. The preset's
// config flags (`restoreMocks`, `unstubEnvs`, `unstubGlobals`) reset mocks, env stubs and
// global stubs after each test; fake timers have no config flag, so reset them here.
//
// This does NOT reset module-level state: a module's own top-level variables, caches or
// singletons created on import persist for the whole run. A test file that mutates that
// state must restore it itself (see the README cleanup rules).
afterEach(() => {
  vi.useRealTimers();
});

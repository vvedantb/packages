import { fileURLToPath } from "node:url";
import type { WebVitestConfig } from "./vite.js";

// An opt-in Vitest preset that trades isolation for speed. Vitest normally reloads
// every test file in a fresh environment; this runs them all in one worker, in a
// shuffled order, and resets the common state sinks between tests so a leak surfaces
// as a failure instead of hiding.
//
// Turning isolation off is a real behaviour change, so this is a named export a repo
// opts into, not part of `defineWebVitestConfig`. See the README section
// "Shared-worker Vitest preset" for the adoption snippet and the cleanup rules a test
// file must follow when isolation is off.
//
// Vitest option support: the fields below (`isolate`, `poolOptions.forks.singleFork`,
// `poolOptions.threads.singleThread`, `sequence.shuffle.{files,tests}`, `restoreMocks`,
// `unstubEnvs`, `unstubGlobals`, `setupFiles`) are stable across Vitest 3, 4 and 5.
// `pool` is left to the repo: `singleFork` applies under the default `forks` pool and
// `singleThread` under `threads`, so whichever pool is active collapses to one worker.
// The preset does not support the `vmThreads` / `vmForks` pools.

/** Absolute path to the setup file that resets per-test state. Added to `setupFiles`. */
export const SHARED_WORKER_SETUP = fileURLToPath(
  new URL("./vitest-shared-setup.js", import.meta.url),
);

/** The `test` fields the shared-worker preset sets. */
export interface SharedWorkerTestConfig {
  /** Reuse one environment across all test files instead of reloading per file. */
  isolate: false;
  /** One worker for every file, under whichever of the two supported pools is active. */
  poolOptions: {
    forks: { singleFork: true };
    threads: { singleThread: true };
  };
  /** Random file order so cross-file state leaks surface. `tests` stays stable by default. */
  sequence: { shuffle: { files: boolean; tests: boolean } };
  /** Restore spied/mocked implementations after each test. */
  restoreMocks: true;
  /** Undo `vi.stubEnv` after each test. */
  unstubEnvs: true;
  /** Undo `vi.stubGlobal` after each test. */
  unstubGlobals: true;
  /** The shared reset setup first, then any the caller passed. */
  setupFiles: string[];
  /** Carried over from the base config when present. */
  environment?: string;
  include?: string[];
  server?: { deps: { inline: string[] } };
}

/** The config the shared-worker preset returns. Spread into `defineConfig` from `vitest/config`. */
export interface SharedWorkerVitestConfig {
  plugins?: WebVitestConfig["plugins"];
  esbuild?: WebVitestConfig["esbuild"];
  resolve?: WebVitestConfig["resolve"];
  test: SharedWorkerTestConfig;
}

export interface SharedWorkerOptions {
  /** Also shuffle test order within each file. Default `false` (only file order shuffles). */
  shuffleTests?: boolean;
  /** Extra setup files, run after the shared reset setup. */
  setupFiles?: string[];
}

/**
 * The shared-worker Vitest config. Pass the output of `defineWebVitestConfig` to keep its
 * `include`, `environment`, plugins and resolve, or call it with no base for a standalone config.
 */
export function sharedWorkerVitestConfig(
  base?: WebVitestConfig,
  options: SharedWorkerOptions = {},
): SharedWorkerVitestConfig {
  const test: SharedWorkerTestConfig = {
    isolate: false,
    poolOptions: {
      forks: { singleFork: true },
      threads: { singleThread: true },
    },
    sequence: { shuffle: { files: true, tests: options.shuffleTests ?? false } },
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    setupFiles: [SHARED_WORKER_SETUP, ...(options.setupFiles ?? [])],
  };
  if (base?.test.environment) test.environment = base.test.environment;
  if (base?.test.include) test.include = base.test.include;
  if (base?.test.server) test.server = base.test.server;

  const config: SharedWorkerVitestConfig = { test };
  if (base?.plugins) config.plugins = base.plugins;
  if (base?.esbuild) config.esbuild = base.esbuild;
  if (base?.resolve) config.resolve = base.resolve;
  return config;
}

import { describe, expect, it } from "vitest";
import { defineWebVitestConfig } from "../src/vite.js";
import { SHARED_WORKER_SETUP, sharedWorkerVitestConfig } from "../src/vitest-shared.js";

describe("sharedWorkerVitestConfig", () => {
  it("sets the shared-worker fields and the reset setup", () => {
    const { test } = sharedWorkerVitestConfig();
    expect(test.isolate).toBe(false);
    expect(test.poolOptions.forks.singleFork).toBe(true);
    expect(test.poolOptions.threads.singleThread).toBe(true);
    expect(test.sequence.shuffle).toEqual({ files: true, tests: false });
    expect(test.restoreMocks).toBe(true);
    expect(test.unstubEnvs).toBe(true);
    expect(test.unstubGlobals).toBe(true);
    expect(test.setupFiles[0]).toBe(SHARED_WORKER_SETUP);
  });

  it("carries the base config and appends extra setup files", () => {
    const base = defineWebVitestConfig({ include: ["app/**/*.test.ts"] });
    const config = sharedWorkerVitestConfig(base, { shuffleTests: true, setupFiles: ["./extra.ts"] });
    expect(config.test.environment).toBe("node");
    expect(config.test.include).toEqual(["app/**/*.test.ts"]);
    expect(config.test.sequence.shuffle.tests).toBe(true);
    expect(config.test.setupFiles).toEqual([SHARED_WORKER_SETUP, "./extra.ts"]);
  });
});

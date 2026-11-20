import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  isOlderMinor,
  loadWaivers,
  rangeMinorFloor,
  runDoctor,
  runDoctorChecks,
  type CheckResult,
} from "../src/doctor.js";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vvedantb-doctor-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(path: string, content: string): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), content);
}

function writeJson(path: string, value: unknown): void {
  write(path, JSON.stringify(value, null, 2));
}

const WORKFLOW = `jobs:\n  ci:\n    uses: vvedantb/packages/.github/workflows/ci-app.yml@main\n`;

function byId(results: CheckResult[], id: string): CheckResult {
  const found = results.find((r) => r.id === id);
  if (!found) throw new Error(`no check ${id}`);
  return found;
}

function statuses(results: CheckResult[]): Record<string, string> {
  return Object.fromEntries(results.map((r) => [r.id, r.status]));
}

describe("runDoctorChecks", () => {
  it("passes a clean single-package repo", () => {
    writeJson("package.json", {
      name: "clean-app",
      devDependencies: { "@vvedantb/config": "^0.9.0", oxlint: "^1.80.0", tsrs: "^1.0.0", typescript: "^5.9.0" },
      scripts: { typecheck: "tsrs --noEmit -p tsconfig.json", lint: "oxlint ." },
    });
    write("tsconfig.json", "{}\n");
    write(".github/workflows/ci.yml", WORKFLOW);

    const results = runDoctorChecks(dir, { runningVersion: "0.9.0" });
    expect(results.every((r) => r.status === "pass")).toBe(true);
  });

  it("flags every drift kind with its stable id", () => {
    writeJson("package.json", {
      name: "drift-app",
      devDependencies: { "@vvedantb/config": "^0.7.0", eslint: "^9.0.0", typescript: "^5.9.0" },
      scripts: { typecheck: "tsc --noEmit", build: "tsc -p tsconfig.json" },
      prettier: { semi: false },
    });
    write("tsconfig.json", "{}\n");
    // No .github/workflows directory, no oxlint, no tsrs.

    const results = runDoctorChecks(dir, { runningVersion: "0.9.0" });
    expect(statuses(results)).toMatchObject({
      "no-eslint": "fail",
      "no-prettier": "fail",
      "no-plain-tsc": "fail",
      "tsrs-present": "fail",
      "oxlint-dep": "fail",
      "oxlint-script": "fail",
      "config-version": "fail",
      "ci-reusable-workflow": "fail",
    });
    expect(byId(results, "no-plain-tsc").details.join("\n")).toContain('"typecheck"');
    // The build script uses tsc, but only typecheck/lint scripts are checked.
    expect(byId(results, "no-plain-tsc").details.join("\n")).not.toContain('"build"');
  });

  it("walks workspace packages named in pnpm-workspace.yaml", () => {
    writeJson("package.json", {
      name: "root",
      devDependencies: { oxlint: "^1.80.0" },
      scripts: { lint: "oxlint ." },
    });
    write("pnpm-workspace.yaml", "packages:\n  - 'apps/*'\n  - 'packages/*'\n");
    write(".github/workflows/ci.yml", WORKFLOW);
    writeJson("apps/web/package.json", { name: "web", devDependencies: { prettier: "^3.0.0" } });

    const results = runDoctorChecks(dir, { runningVersion: "0.9.0" });
    expect(byId(results, "no-prettier").status).toBe("fail");
    expect(byId(results, "no-prettier").details.join("\n")).toContain("apps/web");
  });

  it("walks workspace packages when pnpm-workspace.yaml starts with a byte-order mark", () => {
    writeJson("package.json", {
      name: "root",
      devDependencies: { oxlint: "^1.80.0" },
      scripts: { lint: "oxlint ." },
    });
    write("pnpm-workspace.yaml", "﻿packages:\n  - apps/*\n");
    write(".github/workflows/ci.yml", WORKFLOW);
    writeJson("apps/web/package.json", { name: "web", devDependencies: { prettier: "^3.0.0" } });

    const results = runDoctorChecks(dir, { runningVersion: "0.9.0" });
    expect(byId(results, "no-prettier").status).toBe("fail");
  });

  it("reports a waived check as waived and does not count it as drift", () => {
    writeJson("package.json", {
      name: "waived-app",
      devDependencies: { oxlint: "^1.80.0", eslint: "^9.0.0" },
      scripts: { lint: "oxlint ." },
    });
    write(".github/workflows/ci.yml", WORKFLOW);

    const { waivers } = { waivers: { "no-eslint": "legacy config, migration tracked in TICKET-1" } };
    const results = runDoctorChecks(dir, { runningVersion: "0.9.0", waivers });
    const eslint = byId(results, "no-eslint");
    expect(eslint.status).toBe("waived");
    expect(eslint.waiver).toContain("TICKET-1");
    expect(results.some((r) => r.status === "fail")).toBe(false);
  });
});

describe("CI checks", () => {
  function ciWorkflow(runner: string, commands: string[]): string {
    return [
      "jobs:",
      "  check:",
      "    uses: vvedantb/packages/.github/workflows/ci-app.yml@main",
      "    with:",
      `      runs_on: ${runner}`,
      "      # A comment between inputs.",
      "      commands: |",
      ...commands.map((command) => `        ${command}`),
      "  other:",
      "    runs-on: ubuntu-latest",
      "",
    ].join("\n");
  }

  it("fails on the small boat runner and passes boat-large", () => {
    writeJson("package.json", { name: "x" });
    write(".github/workflows/ci.yml", ciWorkflow("boat", ["pnpm lint"]));
    const small = byId(runDoctorChecks(dir, { runningVersion: "0.10.0" }), "ci-runner");
    expect(small.status).toBe("fail");
    expect(small.details.join("\n")).toContain("ci.yml:5");

    write(".github/workflows/ci.yml", ciWorkflow("boat-large", ["pnpm lint"]));
    expect(byId(runDoctorChecks(dir, { runningVersion: "0.10.0" }), "ci-runner").status).toBe("pass");
  });

  it("fails on an extra CI command until it has a reason, and on a reason CI no longer needs", () => {
    writeJson("package.json", { name: "x" });
    const commands = ["pnpm lint", "pnpm --filter web typecheck", "pnpm test", "# note", "pnpm --filter web build"];
    write(".github/workflows/ci.yml", ciWorkflow("boat-large", commands));

    const bare = byId(runDoctorChecks(dir, { runningVersion: "0.10.0" }), "ci-commands");
    expect(bare.status).toBe("fail");
    expect(bare.details).toHaveLength(1);
    expect(bare.details[0]).toContain("pnpm --filter web build");

    writeJson(".vvedantb-doctor.json", { ciCommands: { "pnpm --filter web build": "the web app deploys from this build" } });
    const reasons = loadWaivers(dir).ciCommands;
    expect(byId(runDoctorChecks(dir, { runningVersion: "0.10.0", ciCommandReasons: reasons }), "ci-commands").status).toBe("pass");

    const stale = { ...reasons, "npx expo export": "old" };
    const result = byId(runDoctorChecks(dir, { runningVersion: "0.10.0", ciCommandReasons: stale }), "ci-commands");
    expect(result.details.join("\n")).toContain("npx expo export");
  });
});

describe("loadWaivers", () => {
  it("reads the file, drops an unknown id and a reasonless waiver", () => {
    writeJson("package.json", { name: "x", vvedantbDoctor: { waivers: { "oxlint-dep": "root runs it" } } });
    writeJson(".vvedantb-doctor.json", {
      waivers: { "no-eslint": "tracked in TICKET-2", "not-a-check": "nope", "no-prettier": "" },
    });
    const loaded = loadWaivers(dir);
    expect(loaded.waivers).toEqual({ "oxlint-dep": "root runs it", "no-eslint": "tracked in TICKET-2" });
    expect(loaded.warnings.join("\n")).toContain("not-a-check");
    expect(loaded.warnings.join("\n")).toContain("no-prettier");
  });
});

describe("version range comparison", () => {
  it("parses a range floor and compares minors", () => {
    expect(rangeMinorFloor("^0.8.1")).toEqual({ major: 0, minor: 8 });
    expect(rangeMinorFloor("workspace:*")).toBeUndefined();
    expect(isOlderMinor("^0.7.0", "0.9.0")).toBe(true);
    expect(isOlderMinor("^0.9.0", "0.9.0")).toBe(false);
    expect(isOlderMinor("^1.0.0", "0.9.0")).toBe(false);
    expect(isOlderMinor("workspace:*", "0.9.0")).toBe(false);
  });
});

describe("runDoctor CLI", () => {
  function run(argv: string[]) {
    const out: string[] = [];
    const err: string[] = [];
    const code = runDoctor(argv, { log: (m) => out.push(m), error: (m) => err.push(m), cwd: () => dir });
    return { code, out: out.join("\n"), err: err.join("\n") };
  }

  it("exits 0 and prints JSON with ok true for a clean repo", () => {
    writeJson("package.json", { name: "clean", devDependencies: { oxlint: "^1.80.0" }, scripts: { lint: "oxlint ." } });
    write(".github/workflows/ci.yml", WORKFLOW);
    const clean = run(["--json"]);
    expect(clean.code).toBe(0);
    expect(JSON.parse(clean.out).ok).toBe(true);
  });

  it("exits 1 on drift and 2 on a bad option", () => {
    writeJson("package.json", { name: "drift", scripts: {} });
    expect(run([]).code).toBe(1);
    expect(run(["--nope"]).code).toBe(2);
  });

  it("resolves an absolute root argument against a different cwd", () => {
    writeJson("package.json", { name: "clean", devDependencies: { oxlint: "^1.80.0" }, scripts: { lint: "oxlint ." } });
    write(".github/workflows/ci.yml", WORKFLOW);
    // cwd is tmpdir (not the clean repo); the absolute path argument must be used as-is.
    const out: string[] = [];
    const code = runDoctor([dir, "--json"], { log: (m) => out.push(m), error: () => {}, cwd: () => tmpdir() });
    const report = JSON.parse(out.join("\n"));
    expect(report.root).toBe(dir);
    expect(code).toBe(0);
  });
});

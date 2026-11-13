import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

// Runs the real oxlint binary over a throwaway fixture with the shipped JS
// plugin wired in, so each rule is exercised by the linter the apps use, not a
// stand-in. The fixtures are plain strings handed to oxlint; this file reads no
// source text of its own.

const require = createRequire(import.meta.url);

// Resolve oxlint's own `bin/oxlint` (an ESM Node entry) from the config
// package, so it works whether or not oxlint is hoisted to the repo root.
function resolveOxlintBin(): string {
  const pkg = require.resolve("oxlint/package.json");
  return join(dirname(pkg), "bin", "oxlint");
}

const oxlintBin = resolveOxlintBin();
const pluginPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "oxlint",
  "plugin.mjs",
).replaceAll("\\", "/");

type RuleValue = "error" | ["error", Record<string, unknown>];

interface RunOptions {
  filename?: string;
  ruleOptions?: Record<string, unknown>;
}

interface RunResult {
  status: number;
  output: string;
}

const createdDirs: string[] = [];

function runRule(rule: string, source: string, options?: RunOptions): RunResult {
  const dir = mkdtempSync(join(tmpdir(), "oxlint-vvedantb-"));
  createdDirs.push(dir);
  const filename = options?.filename ?? "sample.ts";
  const ruleValue: RuleValue = options?.ruleOptions
    ? ["error", options.ruleOptions]
    : "error";
  const config = {
    // Turn the built-in correctness rules off so only the plugin rule under
    // test can set the exit code (no stray no-unused-vars / no-undef noise).
    categories: { correctness: "off" },
    jsPlugins: [{ name: "vvedantb", specifier: pluginPath }],
    rules: { [`vvedantb/${rule}`]: ruleValue },
  };
  const configPath = join(dir, ".oxlintrc.json");
  const filePath = join(dir, filename);
  writeFileSync(configPath, JSON.stringify(config));
  writeFileSync(filePath, source);
  const result = spawnSync(process.execPath, [oxlintBin, "-c", configPath, filePath], {
    cwd: dir,
    encoding: "utf8",
  });
  return { status: result.status ?? -1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function ruleTag(rule: string): RegExp {
  return new RegExp(`vvedantb\\(${rule}\\)`);
}

afterAll(() => {
  for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
});

describe("no-double-cast", () => {
  it("flags a double `as` cast", () => {
    const result = runRule("no-double-cast", "const x = foo as Bar as Baz;\n");
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(ruleTag("no-double-cast"));
  });

  it("allows a single cast", () => {
    const result = runRule("no-double-cast", "const x = foo as Baz;\n");
    expect(result.status).toBe(0);
  });
});

describe("no-value-block-in-try", () => {
  const invalid = [
    "function Widget() {",
    "  try {",
    "    const n = cond ? 1 : 2;",
    "    return n;",
    "  } catch {}",
    "}",
    "",
  ].join("\n");

  const valid = [
    "function Widget() {",
    "  try {",
    "    let n;",
    "    if (cond) { n = 1; } else { n = 2; }",
    "    return n;",
    "  } catch {}",
    "}",
    "",
  ].join("\n");

  it("flags a conditional expression inside a compiled component's try", () => {
    const result = runRule("no-value-block-in-try", invalid, { filename: "sample.tsx" });
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(ruleTag("no-value-block-in-try"));
  });

  it("allows statement-level control flow in the try", () => {
    const result = runRule("no-value-block-in-try", valid, { filename: "sample.tsx" });
    expect(result.status).toBe(0);
  });
});

describe("no-source-text-in-tests", () => {
  // The read line carries an allow-source-read comment so this repo's own
  // source-text scanner skips it; the oxlint rule still reports it.
  const invalid = [
    'import { readFileSync } from "node:fs";',
    'const style = readFileSync("src/app.css", "utf8"); // allow-source-read: oxlint rule fixture',
    "",
  ].join("\n");

  const valid = ['const route = "src/app.css";', ""].join("\n");

  it("flags reading a source file as text from a test file", () => {
    const result = runRule("no-source-text-in-tests", invalid, { filename: "sample.test.ts" });
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(ruleTag("no-source-text-in-tests"));
  });

  it("allows a plain path string used as test data", () => {
    const result = runRule("no-source-text-in-tests", valid, { filename: "sample.test.ts" });
    expect(result.status).toBe(0);
  });
});

describe("no-json-parse", () => {
  it("flags a bare JSON.parse result", () => {
    const result = runRule("no-json-parse", "const data = JSON.parse(raw);\n");
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(ruleTag("no-json-parse"));
  });

  it("allows a schema-wrapped JSON.parse", () => {
    const result = runRule("no-json-parse", "const data = schema.parse(JSON.parse(raw));\n");
    expect(result.status).toBe(0);
  });

  it("rejects a `: unknown` annotation by default (eva's strict behaviour)", () => {
    const result = runRule("no-json-parse", "const data: unknown = JSON.parse(raw);\n");
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(ruleTag("no-json-parse"));
  });

  it("allows `: unknown` when allowUnknownEscapeHatch is set (vmem's behaviour)", () => {
    const result = runRule("no-json-parse", "const data: unknown = JSON.parse(raw);\n", {
      ruleOptions: { allowUnknownEscapeHatch: true },
    });
    expect(result.status).toBe(0);
  });
});

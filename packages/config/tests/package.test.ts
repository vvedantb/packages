import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as root from "../src/index.js";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg: { exports: Record<string, string | Record<string, string>>; bin: Record<string, string>; private?: boolean } = JSON.parse(
  readFileSync(join(pkgDir, "package.json"), "utf8"),
);

describe("package.json", () => {
  it("has one JS entry (the root); the other subpaths are JSON files", () => {
    // `default`, not `import`: CommonJS configs (babel.config.js, metro.config.js) require() the same ESM root.
    expect(pkg.exports["."]).toEqual({ types: "./dist/index.d.ts", default: "./dist/index.js" });
    for (const [subpath, target] of Object.entries(pkg.exports)) {
      if (subpath === ".") continue;
      expect(subpath).toMatch(/\.json$/);
      expect(typeof target === "string" && existsSync(join(pkgDir, target))).toBe(true);
    }
    expect(pkg.exports).not.toHaveProperty("./versions");
  });

  it("is publishable and ships both bins", () => {
    expect(pkg.private).toBeUndefined();
    expect(pkg.bin).toEqual({ "vvedantb-config": "./dist/cli.js", "vvedantb-check-asar": "./dist/check-asar-cli.js" });
  });

  it("exports versions and the CLIs from the root", () => {
    expect(root.versions.node.apps).toBe(">=20");
    expect(typeof root.runCli).toBe("function");
    expect(typeof root.runCheckAsar).toBe("function");
  });
});

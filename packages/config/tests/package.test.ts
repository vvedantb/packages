import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as root from "../src/index.js";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg: {
  exports: Record<string, string | Record<string, string>>;
  bin: Record<string, string>;
  private?: boolean;
  peerDependencies?: Record<string, string>;
} = JSON.parse(
  readFileSync(join(pkgDir, "package.json"), "utf8"),
);

describe("package.json", () => {
  it("has two JS entries (the root and ./extension); the other subpaths are JSON files", () => {
    // `default`, not `import`: CommonJS configs (babel.config.js, metro.config.js) require() the same ESM root.
    expect(pkg.exports["."]).toEqual({ types: "./dist/index.d.ts", default: "./dist/index.js" });
    expect(pkg.exports["./extension"]).toEqual({ types: "./dist/extension.d.ts", default: "./dist/extension.js" });
    for (const [subpath, target] of Object.entries(pkg.exports)) {
      if (subpath === "." || subpath === "./extension") continue;
      expect(subpath).toMatch(/\.json$/);
      expect(typeof target === "string" && existsSync(join(pkgDir, target))).toBe(true);
    }
    expect(pkg.exports).not.toHaveProperty("./versions");
  });

  it("is publishable and ships the three bins", () => {
    expect(pkg.private).toBeUndefined();
    expect(pkg.bin).toEqual({
      "vvedantb-config": "./dist/cli.js",
      "vvedantb-check-asar": "./dist/check-asar-cli.js",
      "vvedantb-clerk-allow": "./dist/clerk-allow-cli.js",
    });
  });

  it("exports versions and the CLIs from the root", () => {
    expect(root.versions.node.apps).toBe(">=20");
    expect(typeof root.runCli).toBe("function");
    expect(typeof root.runCheckAsar).toBe("function");
    expect(typeof root.runClerkAllow).toBe("function");
  });

  it("keeps the extension helpers out of the root", () => {
    expect(root).not.toHaveProperty("defineVExtensionConfig");
    expect(root).not.toHaveProperty("extensionHostPermissions");
  });

  it("adds no runtime dependency and no new peer", () => {
    expect(pkg).not.toHaveProperty("dependencies");
    expect(Object.keys(pkg.peerDependencies ?? {})).toEqual(["@electron/asar"]);
  });
});

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import * as root from "../src/index.js";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg: {
  exports: Record<string, string | Record<string, string>>;
  bin: Record<string, string>;
  private?: boolean;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
} = JSON.parse(
  readFileSync(join(pkgDir, "package.json"), "utf8"),
);

describe("package.json", () => {
  it("has two JS entries (the root and ./extension); the other subpaths are shipped files", () => {
    // `default`, not `import`: CommonJS configs (babel.config.js, metro.config.js) require() the same ESM root.
    expect(pkg.exports["."]).toEqual({ types: "./dist/index.d.ts", default: "./dist/index.js" });
    expect(pkg.exports["./extension"]).toEqual({ types: "./dist/extension.d.ts", default: "./dist/extension.js" });
    for (const [subpath, target] of Object.entries(pkg.exports)) {
      if (subpath === "." || subpath === "./extension" || subpath === "./oxlint/anti-slop.js") continue;
      // tsconfig presets and oxlint base config are JSON; the oxlint plugin is an
      // uncompiled ESM module shipped as-is.
      expect(subpath).toMatch(/\.(json|mjs)$/);
      expect(typeof target === "string" && existsSync(join(pkgDir, target))).toBe(true);
    }
    expect(pkg.exports).not.toHaveProperty("./versions");
  });

  it("is publishable and ships the bins", () => {
    expect(pkg.private).toBeUndefined();
    expect(pkg.bin).toEqual({
      "vvedantb-config": "./dist/cli.js",
      "vvedantb-check-asar": "./dist/check-asar-cli.js",
      "vvedantb-clerk-allow": "./dist/clerk-allow-cli.js",
      "vvedantb-android-release": "./dist/android-release-cli.js",
      "vvedantb-check-shared-ui": "./dist/check-shared-ui-cli.js",
      "vvedantb-check-no-source-text": "./dist/check-no-source-text-cli.js",
      "vvedantb-doctor": "./dist/doctor-cli.js",
    });
  });

  it("exports versions and the CLIs from the root", () => {
    expect(root.versions.node.apps).toBe(">=20");
    expect(typeof root.runCli).toBe("function");
    expect(typeof root.runCheckAsar).toBe("function");
    expect(typeof root.runClerkAllow).toBe("function");
    expect(typeof root.runCheckSharedUi).toBe("function");
    expect(typeof root.runCheckNoSourceText).toBe("function");
    expect(typeof root.withReleaseSigning).toBe("function");
    expect(typeof root.defineExpoMetroConfig).toBe("function");
    expect(typeof root.parseAndroidReleaseConfig).toBe("function");
  });

  it("keeps the extension helpers out of the root", () => {
    expect(root).not.toHaveProperty("defineVExtensionConfig");
    expect(root).not.toHaveProperty("extensionHostPermissions");
  });

  it("ships the no-effect plugin as one bundled file with its 9 rules", async () => {
    const plugin = await import("../oxlint/no-effect.mjs");
    expect(Object.keys(plugin.default.rules).sort()).toEqual([
      "no-adjust-state-on-prop-change",
      "no-chain-state-updates",
      "no-derived-state",
      "no-event-handler",
      "no-external-store-subscription",
      "no-initialize-state",
      "no-pass-data-to-parent",
      "no-pass-live-state-to-parent",
      "no-reset-all-state-on-prop-change",
    ]);
  });

  it("adds no runtime dependency; peers are @electron/asar and the optional @expo/config-plugins and vitest", () => {
    // The no-effect plugin is bundled into oxlint/no-effect.mjs: as a dependency it would make each app install ESLint.
    expect(pkg).not.toHaveProperty("dependencies");
    expect(Object.keys(pkg.peerDependencies ?? {})).toEqual(["@electron/asar", "@expo/config-plugins", "vitest"]);
    expect(pkg.peerDependenciesMeta?.vitest?.optional).toBe(true);
    expect(pkg.peerDependenciesMeta?.["@expo/config-plugins"]?.optional).toBe(true);
  });
});

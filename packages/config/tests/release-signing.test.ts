import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_RELEASE_SIGNING_MARKER,
  appendReleaseSigning,
  releaseSigningGradle,
  withReleaseSigning,
  type ReleaseSigningOptions,
  type WithAppBuildGradle,
} from "../src/index.js";

// A stand-in for expo/config-plugins' withAppBuildGradle: it runs the mod over a
// Groovy string and hands back the patched contents, so the plugin is exercised
// without Expo installed.
function applyPlugin(contents: string, options?: ReleaseSigningOptions): string {
  let result = contents;
  const withAppBuildGradle: WithAppBuildGradle = (config, action) => {
    result = action({ modResults: { contents: result } }).modResults.contents;
    return config;
  };
  withReleaseSigning({}, { ...options, withAppBuildGradle });
  return result;
}

describe("releaseSigningGradle", () => {
  it("leaves ${...} for Gradle, not JavaScript", () => {
    const gradle = releaseSigningGradle();
    expect(gradle).toContain('${releaseSigningMissing.join(", ")}');
    // No JS interpolation leaked a real value in.
    expect(gradle).not.toContain("undefined");
  });

  it("uses the default marker and ANDROID_* keys", () => {
    const gradle = releaseSigningGradle();
    expect(gradle).toContain(DEFAULT_RELEASE_SIGNING_MARKER);
    // Every app's build script greps for this substring.
    expect(gradle).toContain("plugins/withReleaseSigning.js");
    for (const key of [
      "ANDROID_KEYSTORE_PATH",
      "ANDROID_KEYSTORE_PASSWORD",
      "ANDROID_KEY_ALIAS",
      "ANDROID_KEY_PASSWORD",
    ]) {
      expect(gradle).toContain(key);
    }
    expect(gradle).toContain('rootProject.file("../../../keystore.properties")');
  });

  it("adds a storeType line only when set", () => {
    expect(releaseSigningGradle()).not.toContain("storeType");
    expect(releaseSigningGradle({ storeType: "pkcs12" })).toContain('storeType "pkcs12"');
  });

  it("honours custom property keys, keystore file, marker and task condition", () => {
    const gradle = releaseSigningGradle({
      marker: "// Added by apps/mobile/plugins/withReleaseSigning.js",
      keystorePropertiesFile: 'rootProject.file("keystore.properties")',
      propertyKeys: { storeFile: "MY_STORE_FILE" },
      releaseTaskCondition: "graph.hasTask(':app:assembleRelease')",
    });
    expect(gradle).toContain("// Added by apps/mobile/plugins/withReleaseSigning.js");
    expect(gradle).toContain('rootProject.file("keystore.properties")');
    expect(gradle).toContain("MY_STORE_FILE");
    expect(gradle).toContain("graph.hasTask(':app:assembleRelease')");
    // The keys not overridden keep their defaults.
    expect(gradle).toContain("ANDROID_KEY_ALIAS");
  });
});

describe("appendReleaseSigning", () => {
  it("appends the block once and is idempotent", () => {
    const once = appendReleaseSigning("android {}\n");
    expect(once).toContain(DEFAULT_RELEASE_SIGNING_MARKER);
    expect(appendReleaseSigning(once)).toBe(once);
  });

  it("is idempotent per custom marker", () => {
    const marker = "// Added by apps/mobile/plugins/withReleaseSigning.js";
    const once = appendReleaseSigning("android {}\n", { marker });
    expect(appendReleaseSigning(once, { marker })).toBe(once);
  });
});

describe("withReleaseSigning", () => {
  afterEach(() => {
    delete process.env.EAS_BUILD;
  });

  it("patches build.gradle through the injected withAppBuildGradle", () => {
    const gradle = applyPlugin("android {}\n");
    expect(gradle).toContain(DEFAULT_RELEASE_SIGNING_MARKER);
    expect(gradle).toContain("signingConfig signingConfigs.release");
  });

  it("skips the append on EAS when skipOnEasBuild is set", () => {
    process.env.EAS_BUILD = "1";
    expect(applyPlugin("android {}\n", { skipOnEasBuild: true })).toBe("android {}\n");
    // Without the opt-out it still patches, even on EAS.
    expect(applyPlugin("android {}\n")).toContain(DEFAULT_RELEASE_SIGNING_MARKER);
  });
});

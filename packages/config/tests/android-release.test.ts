import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRADLE_PROPERTY_EDITS,
  buildGradlePropertyEdits,
  resolveReactNativeArchitectures,
  apkFileName,
  easProfileEntries,
  formatGithubOutput,
  formatReleaseJson,
  gradlePropertiesEdits,
  gradleVersionNameOk,
  parseAndroidReleaseConfig,
  parseBadging,
  publicEnvDefault,
  readExpoVersion,
  releaseJson,
  syncExpoVersion,
  syncPackageJsonVersion,
  validateVersionCode,
  validateVersionName,
  type ReadAppFile,
} from "../src/index.js";

describe("validateVersionName", () => {
  it("accepts semantic versions and returns them", () => {
    expect(validateVersionName("1.0.1")).toBe("1.0.1");
    expect(validateVersionName("0.0.0")).toBe("0.0.0");
    expect(validateVersionName("12.34.56")).toBe("12.34.56");
  });

  it("rejects anything else", () => {
    for (const bad of [undefined, "", "1.0", "1.0.1.2", "v1.0.1", "1.0.01"]) {
      expect(() => validateVersionName(bad)).toThrow();
    }
  });
});

describe("validateVersionCode", () => {
  it("accepts 1..2_100_000_000 and returns a number", () => {
    expect(validateVersionCode("1")).toBe(1);
    expect(validateVersionCode("1000")).toBe(1000);
    expect(validateVersionCode("2100000000")).toBe(2_100_000_000);
  });

  it("rejects zero, over the cap, and non-digits", () => {
    for (const bad of [undefined, "", "0", "2100000001", "-5", "1.0", "1e3"]) {
      expect(() => validateVersionCode(bad)).toThrow();
    }
  });
});

describe("publicEnvDefault", () => {
  const noFiles: ReadAppFile = () => undefined;
  const easFile: ReadAppFile = (path) =>
    path === "eas.json"
      ? JSON.stringify({ build: { production: { env: { EXPO_PUBLIC_X: "from-eas", STRICT: "1" } } } })
      : undefined;

  it("lets an authoritative eas.json profile win over the environment", () => {
    const sources = [{ kind: "eas-profile", authoritative: true }] as const;
    expect(
      publicEnvDefault("EXPO_PUBLIC_X", { env: { EXPO_PUBLIC_X: "from-shell" }, readAppFile: easFile, sources }),
    ).toBe("from-eas");
  });

  it("returns empty when an authoritative profile lacks the name, even if the environment has it", () => {
    const sources = [{ kind: "eas-profile", authoritative: true }] as const;
    expect(
      publicEnvDefault("EXPO_PUBLIC_Y", { env: { EXPO_PUBLIC_Y: "from-shell" }, readAppFile: easFile, sources }),
    ).toBe("");
  });

  it("lists the string entries of a profile env", () => {
    expect(easProfileEntries(easFile("eas.json") ?? "")).toStrictEqual({ EXPO_PUBLIC_X: "from-eas", STRICT: "1" });
    expect(easProfileEntries("{}")).toStrictEqual({});
  });

  it("prefers a non-empty environment value", () => {
    const value = publicEnvDefault("EXPO_PUBLIC_X", {
      env: { EXPO_PUBLIC_X: "from-env" },
      readAppFile: noFiles,
      sources: [{ kind: "config-literal", file: "src/config.ts" }],
    });
    expect(value).toBe("from-env");
  });

  it("reads a process.env.NAME ?? \"literal\" default from a config file", () => {
    const readAppFile: ReadAppFile = (path) =>
      path === "src/config.ts"
        ? 'export const base = process.env.EXPO_PUBLIC_X ?? "https://default.example";'
        : undefined;
    const value = publicEnvDefault("EXPO_PUBLIC_X", {
      env: {},
      readAppFile,
      sources: [{ kind: "config-literal", file: "src/config.ts" }],
    });
    expect(value).toBe("https://default.example");
  });

  it("reads an eas.json profile env in source order", () => {
    const readAppFile: ReadAppFile = (path) =>
      path === "eas.json"
        ? JSON.stringify({ build: { production: { env: { EXPO_PUBLIC_X: "from-eas" } } } })
        : undefined;
    const value = publicEnvDefault("EXPO_PUBLIC_X", {
      env: {},
      readAppFile,
      sources: [{ kind: "eas-profile" }, { kind: "config-literal", file: "app.config.ts" }],
    });
    expect(value).toBe("from-eas");
  });

  it("returns \"\" when nothing supplies it", () => {
    expect(publicEnvDefault("EXPO_PUBLIC_X", { env: {}, readAppFile: noFiles })).toBe("");
  });
});

describe("gradlePropertiesEdits", () => {
  it("replaces reactNativeArchitectures and appends the absent keys", () => {
    const input = "reactNativeArchitectures=armeabi-v7a\nsomething=else\n";
    const out = gradlePropertiesEdits(input);
    expect(out).toContain("reactNativeArchitectures=arm64-v8a\n");
    expect(out).not.toContain("x86_64");
    expect(out).not.toContain("armeabi-v7a");
    expect(out).toContain("org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m");
    expect(out).toContain("org.gradle.workers.max=8");
    expect(out).toContain("org.gradle.parallel=true");
    expect(out).not.toContain("configuration-cache");
    expect(out).toContain("android.lint.checkReleaseBuilds=false");
    expect(out).toContain("something=else");
  });

  it("adds a trailing newline so an append cannot join two lines", () => {
    // No trailing newline, and a line the append must not merge with.
    const out = gradlePropertiesEdits("org.gradle.caching=true");
    expect(out).toContain("org.gradle.caching=true\n");
    expect(out.endsWith("\n")).toBe(true);
    expect(out).not.toContain("trueorg.gradle");
  });

  it("overrides Expo's lower workers.max and parallel=false", () => {
    const out = gradlePropertiesEdits("org.gradle.workers.max=2\norg.gradle.parallel=false\n");
    expect(out).toContain("org.gradle.workers.max=8");
    expect(out).toContain("org.gradle.parallel=true");
    expect(out).not.toContain("workers.max=2");
  });

  it("leaves a present non-replace key untouched", () => {
    const out = gradlePropertiesEdits("android.lint.checkReleaseBuilds=true\n");
    expect(out).toContain("android.lint.checkReleaseBuilds=true");
    expect(out).not.toContain("checkReleaseBuilds=false");
  });

  it("exposes the default edits", () => {
    expect(DEFAULT_GRADLE_PROPERTY_EDITS.map((edit) => edit.key)).toStrictEqual([
      "reactNativeArchitectures",
      "org.gradle.jvmargs",
      "org.gradle.workers.max",
      "org.gradle.parallel",
      "android.lint.checkReleaseBuilds",
    ]);
  });
});

describe("resolveReactNativeArchitectures", () => {
  it("defaults to arm64-v8a", () => {
    expect(resolveReactNativeArchitectures()).toBe("arm64-v8a");
    expect(resolveReactNativeArchitectures("", "  ")).toBe("arm64-v8a");
  });

  it("prefers the option, then the fallback", () => {
    expect(resolveReactNativeArchitectures("arm64-v8a,x86_64", "x86_64")).toBe("arm64-v8a,x86_64");
    expect(resolveReactNativeArchitectures(undefined, "arm64-v8a,x86_64")).toBe("arm64-v8a,x86_64");
    expect(resolveReactNativeArchitectures("", "arm64-v8a,x86_64")).toBe("arm64-v8a,x86_64");
  });
});

describe("buildGradlePropertyEdits", () => {
  it("keeps both ABIs when requested, overriding the plugin value", () => {
    const out = gradlePropertiesEdits(
      "reactNativeArchitectures=armeabi-v7a\n",
      buildGradlePropertyEdits("arm64-v8a,x86_64"),
    );
    expect(out).toContain("reactNativeArchitectures=arm64-v8a,x86_64\n");
    expect(out).not.toContain("armeabi-v7a");
  });

  it("matches the default edits when no value is given", () => {
    expect(buildGradlePropertyEdits()).toStrictEqual(DEFAULT_GRADLE_PROPERTY_EDITS);
    const out = gradlePropertiesEdits("reactNativeArchitectures=arm64-v8a,x86_64\n", buildGradlePropertyEdits());
    expect(out).toContain("reactNativeArchitectures=arm64-v8a\n");
    expect(out).not.toContain("x86_64");
  });
});

describe("parseBadging", () => {
  it("reads package, versionCode and versionName from the package line", () => {
    const output = [
      "package: name='com.projectvdotuk.vmem' versionCode='1000' versionName='1.0.1' compileSdkVersion='34'",
      "application-label:'vmem'",
    ].join("\n");
    expect(parseBadging(output)).toStrictEqual({
      name: "com.projectvdotuk.vmem",
      versionCode: "1000",
      versionName: "1.0.1",
    });
  });
});

describe("releaseJson / formatReleaseJson", () => {
  it("builds the object and serialises with a trailing newline", () => {
    const release = releaseJson("1.0.1", 1000, "abc123");
    expect(release).toStrictEqual({ versionName: "1.0.1", versionCode: 1000, sha256: "abc123" });
    expect(formatReleaseJson(release)).toBe(
      '{\n  "versionName": "1.0.1",\n  "versionCode": 1000,\n  "sha256": "abc123"\n}\n',
    );
  });
});

describe("formatGithubOutput", () => {
  it("writes key=value lines with a trailing newline", () => {
    expect(formatGithubOutput({ apk: "/out/app.apk", version_code: "1000" })).toBe(
      "apk=/out/app.apk\nversion_code=1000\n",
    );
  });
});

describe("apkFileName", () => {
  it("joins prefix, version and the android suffix", () => {
    expect(apkFileName("vmem", "1.0.1")).toBe("vmem-1.0.1-android.apk");
  });
});

describe("parseAndroidReleaseConfig architectures", () => {
  it("parses reactNativeArchitectures and rejects a non-string", () => {
    const base = { packageId: "com.x.app", apkPrefix: "app" };
    expect(
      parseAndroidReleaseConfig({ ...base, reactNativeArchitectures: "arm64-v8a,x86_64" }).reactNativeArchitectures,
    ).toBe("arm64-v8a,x86_64");
    expect(parseAndroidReleaseConfig(base).reactNativeArchitectures).toBeUndefined();
    expect(() => parseAndroidReleaseConfig({ ...base, reactNativeArchitectures: 1 })).toThrow(
      /reactNativeArchitectures/,
    );
  });
});

describe("parseAndroidReleaseConfig", () => {
  it("fills defaults from a minimal config", () => {
    const config = parseAndroidReleaseConfig({ packageId: "com.x.app", apkPrefix: "app" });
    expect(config.appDir).toBe("apps/mobile");
    expect(config.prebuildNoInstall).toBe(true);
    expect(config.pnpmFilters).toStrictEqual(["{.}"]);
    expect(config.publicEnv).toStrictEqual([]);
    expect(config.extraEnv).toStrictEqual({});
  });

  it("parses a full config", () => {
    const config = parseAndroidReleaseConfig({
      packageId: "com.projectvdotuk.vibot",
      apkPrefix: "vibot",
      publicEnv: ["EXPO_PUBLIC_CONVEX_URL"],
      publicEnvSources: [
        { kind: "eas-profile", profile: "production" },
        { kind: "config-literal", file: "app.config.ts", operators: ["??"] },
      ],
      pnpmFilters: ["mobile...", "{.}"],
      prebuildNoInstall: false,
      extraEnv: { APP_VARIANT: "production" },
      gradleWrapperPin: { ifContains: "gradle-9", distributionUrl: "https://x/gradle-8.14.3-all.zip" },
      summary: { label: "Convex", envVar: "EXPO_PUBLIC_CONVEX_URL" },
    });
    expect(config.prebuildNoInstall).toBe(false);
    expect(config.extraEnv.APP_VARIANT).toBe("production");
    expect(config.publicEnvSources[0]).toStrictEqual({ kind: "eas-profile", profile: "production" });
    expect(config.gradleWrapperPin?.ifContains).toBe("gradle-9");
    expect(config.summary?.label).toBe("Convex");
  });

  it("parses unsetEnv, postPrebuildSteps and the eas-profile flags", () => {
    const config = parseAndroidReleaseConfig({
      packageId: "com.x.app",
      apkPrefix: "app",
      unsetEnv: ["APP_VARIANT"],
      postPrebuildSteps: ["test -f android/build.gradle"],
      publicEnvSources: [{ kind: "eas-profile", authoritative: true, exportAll: true }],
    });
    expect(config.unsetEnv).toStrictEqual(["APP_VARIANT"]);
    expect(config.postPrebuildSteps).toStrictEqual(["test -f android/build.gradle"]);
    expect(config.publicEnvSources[0]).toStrictEqual({ kind: "eas-profile", authoritative: true, exportAll: true });
    expect(() =>
      parseAndroidReleaseConfig({
        packageId: "x",
        apkPrefix: "x",
        publicEnvSources: [{ kind: "eas-profile", authoritative: "yes" }],
      }),
    ).toThrow();
  });

  it("throws on a missing required field or a bad shape", () => {
    expect(() => parseAndroidReleaseConfig({ apkPrefix: "x" })).toThrow();
    expect(() => parseAndroidReleaseConfig({ packageId: "x" })).toThrow();
    expect(() => parseAndroidReleaseConfig(null)).toThrow();
    expect(() =>
      parseAndroidReleaseConfig({ packageId: "x", apkPrefix: "x", publicEnv: "no" }),
    ).toThrow();
    expect(() =>
      parseAndroidReleaseConfig({
        packageId: "x",
        apkPrefix: "x",
        publicEnvSources: [{ kind: "nope" }],
      }),
    ).toThrow();
  });
});

describe("app version sync helpers", () => {
  it("reads expo.version and returns undefined when absent", () => {
    expect(readExpoVersion('{"expo":{"version":"1.2.3"}}')).toBe("1.2.3");
    expect(readExpoVersion('{"expo":{}}')).toBeUndefined();
    expect(readExpoVersion('{"name":"x"}')).toBeUndefined();
    expect(readExpoVersion("[]")).toBeUndefined();
  });

  it("sets expo.version and keeps other fields", () => {
    const out = syncExpoVersion('{"expo":{"name":"V Store","version":"1.0.0"}}', "1.0.5");
    expect(JSON.parse(out)).toStrictEqual({ expo: { name: "V Store", version: "1.0.5" } });
    expect(out.endsWith("\n")).toBe(true);
    expect(() => syncExpoVersion("{}", "1.0.5")).toThrow('no "expo" object');
  });

  it("sets the package.json version", () => {
    const out = syncPackageJsonVersion('{"name":"v-store","version":"0.0.1"}', "1.0.5");
    expect(JSON.parse(out)).toStrictEqual({ name: "v-store", version: "1.0.5" });
    expect(JSON.parse(syncPackageJsonVersion('{"name":"x"}', "2.0.0"))).toStrictEqual({ name: "x", version: "2.0.0" });
  });

  it("checks versionName in the generated build.gradle", () => {
    const gradle = '    defaultConfig {\n        versionCode 1000\n        versionName "1.0.5"\n    }\n';
    expect(gradleVersionNameOk(gradle, "1.0.5")).toBe(true);
    expect(gradleVersionNameOk(gradle, "1.0.50")).toBe(false);
    expect(gradleVersionNameOk(gradle, "1.0.4")).toBe(false);
    expect(gradleVersionNameOk("", "1.0.5")).toBe(false);
  });

  it("parses the new config flags, off by default", () => {
    const base = { packageId: "a.b", apkPrefix: "x" };
    expect(parseAndroidReleaseConfig(base)).toMatchObject({ syncAppVersion: false, versionNameFromAppJson: false });
    expect(
      parseAndroidReleaseConfig({ ...base, syncAppVersion: true, versionNameFromAppJson: true }),
    ).toMatchObject({ syncAppVersion: true, versionNameFromAppJson: true });
    expect(() => parseAndroidReleaseConfig({ ...base, syncAppVersion: "yes" })).toThrow("syncAppVersion");
  });
});

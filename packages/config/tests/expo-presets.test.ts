import path from "node:path";
import { describe, expect, it } from "vitest";
import { defineExpoMetroConfig, expoBabelConfig, type NativeWindMetroOptions } from "../src/index.js";

// Each `current*` function is a verbatim copy of an app's babel.config.js or
// metro.config.js body, with `expo/metro-config` and `nativewind/metro`
// replaced by stand-ins.

const __dirname = "/repo/apps/mobile";

interface StandInMetroConfig {
  projectRoot: string;
  watchFolders: string[];
  transformer: { babelTransformerPath: string };
  transformerPath?: string;
  nativewind?: NativeWindMetroOptions;
  resolver: {
    sourceExts: string[];
    nodeModulesPaths: string[];
    unstable_enablePackageExports?: boolean;
    resolveRequest?: () => null;
  };
}

function getDefaultConfig(projectRoot: string): StandInMetroConfig {
  return {
    projectRoot,
    watchFolders: [],
    transformer: { babelTransformerPath: "expo" },
    resolver: { sourceExts: ["ts", "tsx", "js"], nodeModulesPaths: [] },
  };
}

const nativeWindResolveRequest = () => null;

// Like react-native-css-interop's getConfig: spreads the config and its
// resolver into new objects and reads no watchFolders or nodeModulesPaths.
function withNativeWind(config: StandInMetroConfig, options: NativeWindMetroOptions): StandInMetroConfig {
  return {
    ...config,
    transformerPath: "nativewind/transformer",
    nativewind: options,
    resolver: {
      ...config.resolver,
      sourceExts: [...config.resolver.sourceExts, "css"],
      resolveRequest: nativeWindResolveRequest,
    },
  };
}

describe("babel.config.js (app-b, app-c, app-d are identical)", () => {
  function current(api: { cache: (forever: boolean) => void }) {
    api.cache(true);
    return {
      presets: [
        ["babel-preset-expo", { jsxImportSource: "nativewind" }],
        "nativewind/babel",
      ],
    };
  }

  it("matches and caches forever", () => {
    const calls: boolean[][] = [];
    const api = { cache: (...args: boolean[]) => void calls.push(args) };
    expect(expoBabelConfig(api)).toStrictEqual(current({ cache: () => undefined }));
    expect(calls).toStrictEqual([[true]]);
  });
});

describe("metro.config.js", () => {
  it("app-b", () => {
    const config = getDefaultConfig(__dirname);
    const current = withNativeWind(config, {
      input: "./global.css",
      inlineRem: 16,
    });
    expect(
      defineExpoMetroConfig({ projectRoot: __dirname, getDefaultConfig, withNativeWind, inlineRem: 16 }),
    ).toStrictEqual(current);
  });

  it("app-c (monorepo settings before withNativeWind)", () => {
    const projectRoot = __dirname;
    const monorepoRoot = path.resolve(projectRoot, "../..");
    const config = getDefaultConfig(projectRoot);
    config.watchFolders = [monorepoRoot];
    config.resolver.nodeModulesPaths = [
      path.resolve(projectRoot, "node_modules"),
      path.resolve(monorepoRoot, "node_modules"),
    ];
    const current = withNativeWind(config, { input: "./global.css" });

    expect(
      defineExpoMetroConfig({ projectRoot: __dirname, getDefaultConfig, withNativeWind, monorepoRoot: "../.." }),
    ).toStrictEqual(current);
  });

  it("app-d (monorepo settings after withNativeWind, package exports)", () => {
    const repoRoot = path.resolve(__dirname, "../..");
    const config = withNativeWind(getDefaultConfig(__dirname), {
      input: "./global.css",
      inlineRem: 16,
    });
    config.watchFolders = [repoRoot];
    config.resolver.nodeModulesPaths = [
      path.resolve(__dirname, "node_modules"),
      path.resolve(repoRoot, "node_modules"),
    ];
    config.resolver.unstable_enablePackageExports = true;
    // The EXPO_PUBLIC_UI_PREVIEW stubs stay in the app and run after this.

    expect(
      defineExpoMetroConfig({
        projectRoot: __dirname,
        getDefaultConfig,
        withNativeWind,
        inlineRem: 16,
        monorepoRoot: "../..",
        packageExports: true,
      }),
    ).toStrictEqual(config);
  });

  it("does not change the object withNativeWind returned", () => {
    const wrapped = withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" });
    const result = defineExpoMetroConfig({
      projectRoot: __dirname,
      getDefaultConfig,
      withNativeWind: () => wrapped,
      monorepoRoot: "../..",
      packageExports: true,
    });
    expect(wrapped.watchFolders).toStrictEqual([]);
    expect(wrapped.resolver.unstable_enablePackageExports).toBeUndefined();
    expect(result.resolver.resolveRequest).toBe(nativeWindResolveRequest);
  });
});

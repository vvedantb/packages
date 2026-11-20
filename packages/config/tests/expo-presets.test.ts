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

  it("passes a nativeWindConfig through as an absolute configPath", () => {
    const result = defineExpoMetroConfig({
      projectRoot: __dirname,
      getDefaultConfig,
      withNativeWind,
      nativeWindConfig: "./tailwind.config.ts",
    });
    expect(result.nativewind?.configPath).toBe(path.resolve(__dirname, "tailwind.config.ts"));
  });
});

describe("metro.config.js singletons", () => {
  interface ResolveContext {
    resolveRequest: (context: ResolveContext, moduleName: string, platform: string | null) => unknown;
    originModulePath?: string;
  }
  interface SingletonConfig {
    projectRoot: string;
    watchFolders: string[];
    transformer: { babelTransformerPath: string };
    nativewind?: NativeWindMetroOptions;
    resolver: {
      sourceExts: string[];
      nodeModulesPaths: string[];
      resolveRequest?: (context: ResolveContext, moduleName: string, platform: string | null) => unknown;
    };
  }

  it("rewrites originModulePath to the app's package.json only for singleton module heads", () => {
    const seen: { moduleName: string; originModulePath?: string }[] = [];
    const baseResolve = (context: ResolveContext, moduleName: string): unknown => {
      seen.push({ moduleName, originModulePath: context.originModulePath });
      return { type: "empty" };
    };
    const getBase = (projectRoot: string): SingletonConfig => ({
      projectRoot,
      watchFolders: [],
      transformer: { babelTransformerPath: "expo" },
      resolver: { sourceExts: ["ts"], nodeModulesPaths: [], resolveRequest: baseResolve },
    });
    // A composing stand-in: unlike the default one above, it keeps whatever
    // resolveRequest the config already carries (as real nativewind does).
    const composing = (config: SingletonConfig, options: NativeWindMetroOptions): SingletonConfig => ({
      ...config,
      nativewind: options,
      resolver: { ...config.resolver },
    });

    const result = defineExpoMetroConfig({
      projectRoot: __dirname,
      getDefaultConfig: getBase,
      withNativeWind: composing,
      singletons: ["react", "react-dom"],
    });

    const installed = result.resolver.resolveRequest;
    if (installed === undefined) throw new Error("expected a resolveRequest to be installed");
    const caller: ResolveContext = { resolveRequest: baseResolve, originModulePath: "/caller/x.ts" };
    installed(caller, "react/jsx-runtime", "ios");
    installed(caller, "react-dom", "ios");
    installed(caller, "lodash/merge", "ios");

    const appOrigin = path.resolve(__dirname, "package.json");
    expect(seen).toStrictEqual([
      { moduleName: "react/jsx-runtime", originModulePath: appOrigin },
      { moduleName: "react-dom", originModulePath: appOrigin },
      { moduleName: "lodash/merge", originModulePath: "/caller/x.ts" },
    ]);
  });

  it("leaves the resolver untouched when no singletons are given", () => {
    const base = getDefaultConfig(__dirname);
    const result = defineExpoMetroConfig({
      projectRoot: __dirname,
      getDefaultConfig: () => base,
      withNativeWind,
    });
    // Only nativewind's own resolveRequest is present; no singleton wrapper.
    expect(result.resolver.resolveRequest).toBe(nativeWindResolveRequest);
  });
});

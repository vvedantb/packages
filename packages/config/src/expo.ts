import { resolve } from "node:path";

// Expo loads babel.config.js and metro.config.js as CommonJS. They reach these
// functions through `require("@vvedantb/config")`, which loads this ES module
// on Node 20.19+ and 22.12+ (the Node versions Expo SDK 54+ supports).

/** The part of Babel's config API the preset uses. */
export interface BabelApi {
  cache: (forever: boolean) => void;
}

export interface ExpoBabelConfig {
  presets: (string | [string, { jsxImportSource: string }])[];
}

/**
 * `babel.config.js` for Expo with NativeWind: caches forever, then
 * `babel-preset-expo` with `jsxImportSource: "nativewind"` and `nativewind/babel`.
 * Babel resolves the preset names from the app, as before.
 */
export function expoBabelConfig(api: BabelApi): ExpoBabelConfig {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
}

/** The part of Metro's config the preset sets. */
export interface MetroConfigLike {
  watchFolders?: readonly string[];
  resolver?: {
    nodeModulesPaths?: readonly string[];
    unstable_enablePackageExports?: boolean;
  };
}

export interface NativeWindMetroOptions {
  input: string;
  inlineRem?: number;
}

export interface ExpoMetroOptions<Config extends MetroConfigLike> {
  /** The app folder: `__dirname`. */
  projectRoot: string;
  /** `getDefaultConfig` from `expo/metro-config`. */
  getDefaultConfig: (projectRoot: string) => Config;
  /** `withNativeWind` from `nativewind/metro`. */
  withNativeWind: (config: Config, options: NativeWindMetroOptions) => Config;
  /** NativeWind CSS entry. Default `"./global.css"`. */
  input?: string;
  /** NativeWind `inlineRem`. Not passed when unset, so NativeWind keeps its default. */
  inlineRem?: number;
  /** Monorepo root relative to `projectRoot`, such as `"../.."`. Watches it and resolves from both node_modules folders. */
  monorepoRoot?: string;
  /** Sets `resolver.unstable_enablePackageExports: true`. */
  packageExports?: boolean;
}

/**
 * `metro.config.js` for Expo with NativeWind: the Expo default config wrapped
 * by `withNativeWind`, then the monorepo and package-exports resolver settings.
 * Returns a new object; the result of `withNativeWind` is not changed.
 */
export function defineExpoMetroConfig<Config extends MetroConfigLike>(
  options: ExpoMetroOptions<Config>,
): Config {
  const nativeWind: NativeWindMetroOptions = { input: options.input ?? "./global.css" };
  if (options.inlineRem !== undefined) nativeWind.inlineRem = options.inlineRem;
  const config = options.withNativeWind(options.getDefaultConfig(options.projectRoot), nativeWind);
  if (options.monorepoRoot === undefined && !options.packageExports) return config;

  const resolver = { ...config.resolver };
  const result = { ...config, resolver };
  if (options.monorepoRoot !== undefined) {
    const root = resolve(options.projectRoot, options.monorepoRoot);
    result.watchFolders = [root];
    resolver.nodeModulesPaths = [
      resolve(options.projectRoot, "node_modules"),
      resolve(root, "node_modules"),
    ];
  }
  if (options.packageExports) resolver.unstable_enablePackageExports = true;
  return result;
}

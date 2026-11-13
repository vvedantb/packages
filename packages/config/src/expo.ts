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

/** A Metro resolver context: the part the singleton resolver reads and forwards. */
export interface MetroResolveContext {
  resolveRequest: (
    context: MetroResolveContext,
    moduleName: string,
    platform: string | null,
  ) => unknown;
  originModulePath?: string;
}

/** A Metro `resolver.resolveRequest` function. */
export type MetroResolveRequest = (
  context: MetroResolveContext,
  moduleName: string,
  platform: string | null,
) => unknown;

/** The part of Metro's config the preset sets. */
export interface MetroConfigLike {
  watchFolders?: readonly string[];
  resolver?: {
    nodeModulesPaths?: readonly string[];
    unstable_enablePackageExports?: boolean;
    resolveRequest?: MetroResolveRequest;
  };
}

export interface NativeWindMetroOptions {
  input: string;
  inlineRem?: number;
  /** NativeWind `configPath` (the Tailwind config). Not passed when unset. */
  configPath?: string;
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
  /** NativeWind `configPath` (the Tailwind config), relative to `projectRoot` or absolute. Not passed when unset. */
  nativeWindConfig?: string;
  /**
   * Module names to resolve from the app, not a nested copy, such as
   * `["react", "react-dom"]`. Sets `resolver.resolveRequest` before
   * `withNativeWind`, so a single React instance is used across the monorepo.
   */
  singletons?: readonly string[];
  /** Monorepo root relative to `projectRoot`, such as `"../.."`. Watches it and resolves from both node_modules folders. */
  monorepoRoot?: string;
  /** Sets `resolver.unstable_enablePackageExports: true`. */
  packageExports?: boolean;
}

/**
 * Sets `resolver.resolveRequest` so the given module names resolve from the
 * app root (`package.json`), not from a nested copy. Mutates `config` in place,
 * before `withNativeWind` wraps it (NativeWind chains to this resolver).
 */
function installSingletonResolver(
  config: MetroConfigLike,
  projectRoot: string,
  singletons: readonly string[],
): void {
  const resolver = config.resolver;
  if (resolver === undefined) return;
  const appOrigin = resolve(projectRoot, "package.json");
  const names = new Set(singletons);
  const base = resolver.resolveRequest;
  resolver.resolveRequest = (context, moduleName, platform) => {
    const head = moduleName.split("/")[0];
    const forward = base ?? context.resolveRequest;
    if (head !== undefined && names.has(head)) {
      return forward({ ...context, originModulePath: appOrigin }, moduleName, platform);
    }
    return forward(context, moduleName, platform);
  };
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
  if (options.nativeWindConfig !== undefined) {
    nativeWind.configPath = resolve(options.projectRoot, options.nativeWindConfig);
  }
  const base = options.getDefaultConfig(options.projectRoot);
  if (options.singletons !== undefined && options.singletons.length > 0) {
    installSingletonResolver(base, options.projectRoot, options.singletons);
  }
  const config = options.withNativeWind(base, nativeWind);
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

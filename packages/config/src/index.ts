export { versions, type Versions } from "./versions.js";
export {
  CLAUDE_INSTALL_SNIPPET,
  ENVIRONMENT_INSTALL,
  parseJsonc,
  planSync,
  runSync,
  type PlannedChange,
  type SyncOptions,
  type SyncResult,
} from "./sync.js";
export { runCli, type CliIo } from "./run.js";
export {
  CHECK_ASAR_CHILD_ENV,
  findBareImports,
  findSpecifiers,
  packageName,
  runCheckAsar,
  type AsarCheckHook,
  type AsarCheckHookContext,
  type CheckAsarIo,
} from "./check-asar.js";
export {
  runClerkAllow,
  type ClerkAllowFetch,
  type ClerkAllowIo,
  type ClerkAllowResponse,
} from "./clerk-allow.js";
export {
  REACT_DEDUPE,
  defineWebViteConfig,
  defineWebVitestConfig,
  reactPlugins,
  srcAlias,
  vendorChunkBuild,
  type AliasOptions,
  type BabelReactCompiler,
  type PathOptions,
  type ReactSetup,
  type ResolveConfig,
  type RouterPluginOptions,
  type VendorChunk,
  type VendorChunkGroup,
  type VitePlugin,
  type VitePluginOption,
  type WebBuildConfig,
  type WebViteConfig,
  type WebViteOptions,
  type WebVitestConfig,
  type WebVitestOptions,
} from "./vite.js";
export {
  defineExpoMetroConfig,
  expoBabelConfig,
  type BabelApi,
  type ExpoBabelConfig,
  type ExpoMetroOptions,
  type MetroConfigLike,
  type NativeWindMetroOptions,
} from "./expo.js";

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

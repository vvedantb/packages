export {
  ConvexClerkProvider,
  type ConvexClerkProviderProps,
  type ConvexClerkUseAuth,
} from "./ConvexClerkProvider.js";
export {
  parseClientEnv,
  VITE_ENV_NAMES,
  type ClientEnv,
  type ClientEnvOptions,
  type ClientEnvSource,
  type ClientEnvWithoutViteEnv,
  type ViteEnvMode,
  type ViteEnvName,
} from "./env.js";
export { createMemoryOptimisticStore } from "./memoryStore.js";
export {
  forEachLoadedQuery,
  mapLoadedQuery,
  patchLoadedQuery,
  updateAllCachedQueries,
  type OptimisticStore,
} from "./optimistic.js";
export { tempId, type TempIdFormat, type TempIdOptions } from "./tempId.js";
export { useEnsureUser, type EnsureUserMutation } from "./useEnsureUser.js";

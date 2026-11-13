---
"@vvedantb/ui": minor
---

Add shared stale-deploy / chunk-load recovery beside the update watcher. After a new deploy serves HTML that points at removed asset hashes, the app can throw a chunk-load error and wedge; this recovers by reloading once with a cooldown guard and a cache-bust param.

New exports (root and `@vvedantb/ui/client`): `isChunkLoadError`, `installStaleDeployReload` (registers `vite:preloadError`, capture-phase `error`, and `unhandledrejection` listeners, with an `onBeforeReload` callback for app-specific teardown such as `convex.close()`), plus the primitives `claimStaleDeployReload`, `reloadForStaleDeploy`, `stripStaleDeployReloadParam` and the `STALE_DEPLOY_RELOAD_KEY` / `STALE_DEPLOY_RELOAD_PARAM` constants.

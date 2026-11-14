// Stale-deploy / chunk-load recovery. After a new deploy, cached `index.html`
// (or a lazy route that preloaded against the old build) can point at asset
// hashes that no longer exist. The browser then throws a chunk-load error and
// the app wedges. This reloads the page once — with a cooldown so a build that
// is still broken cannot reload in a loop — pulling fresh HTML with the new
// asset references.
//
// This module holds only framework-agnostic logic. App-specific work, such as
// closing a Convex socket before the reload, is injected through `onBeforeReload`
// so nothing here imports Convex, a router or React.

/** Default cooldown: a second reload inside this window is refused. */
const DEFAULT_COOLDOWN_MS = 10_000;
/** `sessionStorage` key holding the timestamp of the last reload attempt. */
const DEFAULT_STORAGE_KEY = "deployment-reload-ts";
/** Query param used to bypass cached HTML on recovery. Stripped on boot. */
const DEFAULT_RELOAD_PARAM = "_vb_reload";
/** Vite serves hashed modules from here; a failed load under it means a new build. */
const DEFAULT_ASSETS_PATH = "/assets/";

export const STALE_DEPLOY_RELOAD_KEY = DEFAULT_STORAGE_KEY;
export const STALE_DEPLOY_RELOAD_PARAM = DEFAULT_RELOAD_PARAM;

/** Detects errors caused by stale JavaScript chunks after a new deployment. */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    error.name === "ChunkLoadError" ||
    // Covers Vite's "Failed to fetch dynamically imported module".
    msg.includes("dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Failed to load module script") ||
    msg.includes("disallowed MIME type") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk")
  );
}

export type StaleDeployReloadConfig = {
  /** Cooldown window in ms; a reload inside it is refused. Default 10000. */
  cooldownMs?: number;
  /** `sessionStorage` key for the cooldown timestamp. Default `deployment-reload-ts`. */
  storageKey?: string;
  /** Cache-bust query param, set on reload and stripped on boot. Default `_vb_reload`. */
  reloadParam?: string;
};

/**
 * Returns true at most once per cooldown window, so a still-broken deploy cannot
 * reload in a loop. Callers must reload immediately after a true result.
 * Falls back to allowing the reload when `sessionStorage` is unavailable
 * (private browsing, blocked storage).
 */
export function claimStaleDeployReload(config: StaleDeployReloadConfig = {}): boolean {
  const { cooldownMs = DEFAULT_COOLDOWN_MS, storageKey = DEFAULT_STORAGE_KEY } = config;
  try {
    const last = sessionStorage.getItem(storageKey);
    if (last && Date.now() - Number(last) < cooldownMs) return false;
    sessionStorage.setItem(storageKey, String(Date.now()));
    return true;
  } catch {
    // sessionStorage unavailable (e.g. private browsing); allow the reload.
    return true;
  }
}

/** Drop the one-shot cache-bust param so it never becomes product state. */
export function stripStaleDeployReloadParam(
  config: Pick<StaleDeployReloadConfig, "reloadParam"> = {},
): void {
  const { reloadParam = DEFAULT_RELOAD_PARAM } = config;
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has(reloadParam)) return;
    url.searchParams.delete(reloadParam);
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // No location/history (non-browser); nothing to strip.
  }
}

/**
 * `location.reload()` can reuse a cached HTML document that still points at
 * deleted chunk hashes. A unique query param forces the browser to fetch the
 * HTML again, so the new build's asset references load.
 */
export function reloadForStaleDeploy(
  config: Pick<StaleDeployReloadConfig, "reloadParam"> = {},
): void {
  const { reloadParam = DEFAULT_RELOAD_PARAM } = config;
  const url = new URL(location.href);
  url.searchParams.set(reloadParam, String(Date.now()));
  location.replace(url.href);
}

/**
 * True when a resource-load `error` targets a hashed module/modulepreload under
 * the assets path. These errors (wrong MIME / 404 on `<script type="module">`)
 * carry no `Error` object and do not bubble, so the listener below runs in the
 * capture phase and inspects the event target instead.
 */
function isFailedHashedModule(target: EventTarget | null, assetsPath: string): boolean {
  if (!(target instanceof HTMLScriptElement) && !(target instanceof HTMLLinkElement)) {
    return false;
  }
  if (target instanceof HTMLScriptElement && target.type !== "module") return false;
  if (target instanceof HTMLLinkElement && target.rel !== "modulepreload") return false;
  const url = target instanceof HTMLScriptElement ? target.src : target.href;
  return url.includes(assetsPath);
}

export type InstallStaleDeployReloadOptions = StaleDeployReloadConfig & {
  /**
   * Runs just before the reload, e.g. `() => convex.close()`. Errors are
   * swallowed so a failed teardown still reloads.
   */
  onBeforeReload?: () => void;
  /** When false, `install` registers nothing and returns a no-op. Default true. */
  enabled?: boolean;
  /** Assets path a failed module load must be under. Default `/assets/`. */
  assetsPath?: string;
  /** Reload hook. Default `reloadForStaleDeploy`. Override in tests. */
  reload?: () => void;
};

/**
 * Register listeners that recover from a stale deploy: on a chunk-load failure
 * (`vite:preloadError`, a capture-phase resource `error`, or an
 * `unhandledrejection`) it claims the cooldown, runs `onBeforeReload`, and
 * reloads once. Strips the cache-bust param on install, so call it at boot.
 * Returns a stop function that removes the listeners.
 */
export function installStaleDeployReload(
  options: InstallStaleDeployReloadOptions = {},
): () => void {
  const {
    onBeforeReload,
    enabled = true,
    cooldownMs,
    storageKey,
    reloadParam,
    assetsPath = DEFAULT_ASSETS_PATH,
    reload,
  } = options;

  if (!enabled || typeof window === "undefined") return () => {};

  stripStaleDeployReloadParam({ reloadParam });

  const doReload = reload ?? (() => reloadForStaleDeploy({ reloadParam }));

  // Claim before preventDefault. Vite's preload helper resolves the failed
  // `import()` to `undefined` when `vite:preloadError` is canceled; a lazy
  // component then crashes reading `.default`. Preventing only after the claim
  // wins keeps a refused claim from swallowing the rejection.
  const handle = (event: Event): void => {
    if (!claimStaleDeployReload({ cooldownMs, storageKey })) return;
    event.preventDefault();
    try {
      onBeforeReload?.();
    } catch {
      // Teardown (e.g. a socket already closing) may throw; reload regardless.
    }
    doReload();
  };

  const onPreloadError = (event: Event): void => handle(event);
  const onError = (event: ErrorEvent): void => {
    if (isChunkLoadError(event.error) || isFailedHashedModule(event.target, assetsPath)) {
      handle(event);
    }
  };
  const onRejection = (event: PromiseRejectionEvent): void => {
    if (isChunkLoadError(event.reason)) handle(event);
  };

  window.addEventListener("vite:preloadError", onPreloadError);
  // Resource-load errors do not bubble, so listen in the capture phase.
  window.addEventListener("error", onError, true);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("vite:preloadError", onPreloadError);
    window.removeEventListener("error", onError, true);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

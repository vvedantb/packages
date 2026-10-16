import { fetchDeployFingerprint } from "./deployFingerprint.js";

export type UpdateToastOptions = {
  id: string;
  description: string;
  duration: number;
  action: { label: string; onClick: () => void };
};

export type UpdateAvailableWatcherOptions = {
  /** Origin to poll, usually `window.location.origin`. */
  origin: string;
  /** Toast API. Pass sonner's `toast`, or a fake in tests. */
  toast: { message: (title: string, opts: UpdateToastOptions) => void };
  /** Close the Convex socket before reload. Errors are swallowed. */
  closeConvex?: () => void;
  /** Poll interval in ms. Default 60000. */
  pollMs?: number;
  toastId?: string;
  /** Pass `!import.meta.env.DEV`. When false, nothing starts. Default true. */
  enabled?: boolean;
  /** Reload hook. Default `window.location.reload()`. */
  reload?: () => void;
};

const DEFAULT_POLL_MS = 60_000;
const DEFAULT_TOAST_ID = "app-update-available";

/**
 * Poll the live index HTML for a new Vite asset fingerprint (and re-check when
 * the tab becomes visible). Shows a sticky "Update available" toast with a
 * Refresh action when a newer deploy is serving. Returns a stop function.
 */
export function startUpdateAvailableWatcher(
  options: UpdateAvailableWatcherOptions,
): () => void {
  const {
    origin,
    toast,
    closeConvex,
    pollMs = DEFAULT_POLL_MS,
    toastId = DEFAULT_TOAST_ID,
    enabled = true,
    reload = () => window.location.reload(),
  } = options;
  if (!enabled) return () => {};

  let cancelled = false;
  let shown = false;
  let baseline: string | null = null;

  const showToast = (): void => {
    if (shown) return;
    shown = true;
    toast.message("Update available", {
      id: toastId,
      description: "Refresh to load the latest version.",
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: "Refresh",
        onClick: () => {
          try {
            closeConvex?.();
          } catch {
            // socket may already be closed during teardown
          }
          reload();
        },
      },
    });
  };

  const check = async (): Promise<void> => {
    if (cancelled || shown) return;
    const next = await fetchDeployFingerprint(origin);
    if (cancelled || next === null) return;
    if (baseline === null) {
      baseline = next;
      return;
    }
    if (next !== baseline) showToast();
  };

  void check();
  const intervalId = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    void check();
  }, pollMs);

  const onVisibility = (): void => {
    if (document.visibilityState === "visible") void check();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

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
  /** Default `app-update-available`. */
  toastId?: string;
  /** Pass `!import.meta.env.DEV`. When false, nothing starts. Default true. */
  enabled?: boolean;
  /** Reload hook. Default `window.location.reload()`. */
  reload?: () => void;
};

export type ShowUpdateAvailableToastOptions = Pick<
  UpdateAvailableWatcherOptions,
  "toast" | "closeConvex" | "toastId" | "reload"
>;

const DEFAULT_POLL_MS = 60_000;
const DEFAULT_TOAST_ID = "app-update-available";

/**
 * Show the sticky "Update available" toast with a Refresh action. Refresh
 * calls `closeConvex` (errors ignored), then reloads. The same `toastId`
 * replaces an open toast instead of stacking a second one.
 */
export function showUpdateAvailableToast({
  toast,
  closeConvex,
  toastId = DEFAULT_TOAST_ID,
  reload = () => window.location.reload(),
}: ShowUpdateAvailableToastOptions): void {
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
}

/**
 * Poll the live index HTML for a new Vite asset fingerprint (and re-check when
 * the tab becomes visible). Calls `showUpdateAvailableToast` once when a newer
 * deploy is serving. Returns a stop function.
 */
export function startUpdateAvailableWatcher(
  options: UpdateAvailableWatcherOptions,
): () => void {
  const {
    origin,
    toast,
    closeConvex,
    pollMs = DEFAULT_POLL_MS,
    toastId,
    enabled = true,
    reload,
  } = options;
  if (!enabled) return () => {};

  let cancelled = false;
  let shown = false;
  let baseline: string | null = null;

  const showToast = (): void => {
    if (shown) return;
    shown = true;
    showUpdateAvailableToast({ toast, closeConvex, toastId, reload });
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

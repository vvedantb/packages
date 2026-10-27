// Module-level toast queue behind `toast()` and `<Toaster />`. No React Native
// imports, so it runs anywhere (tests, non-component code).

export type ToastVariant = "default" | "success" | "error" | "warning" | "info" | "loading";

export type ToastOptions = {
  /** Reuse an id to replace a toast in place, for example a `loading` toast with its result. */
  id?: string;
  description?: string;
  /** Milliseconds before it closes. Default 4000; `loading` stays until replaced or dismissed. `Infinity` keeps any toast open. */
  duration?: number;
  /** One text button. A press runs `onPress` and closes the toast. */
  action?: { label: string; onPress: () => void };
};

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;
  action?: ToastOptions["action"];
};

/** At most this many toasts show; the oldest drop first. */
export const MAX_TOASTS = 3;
export const DEFAULT_TOAST_DURATION = 4000;

let toasts: readonly ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): readonly ToastItem[] {
  return toasts;
}

function show(variant: ToastVariant, title: string, options: ToastOptions = {}): string {
  const id = options.id ?? `toast-${++counter}`;
  const item: ToastItem = {
    id,
    variant,
    title,
    description: options.description,
    duration:
      options.duration ?? (variant === "loading" ? Infinity : DEFAULT_TOAST_DURATION),
    action: options.action,
  };
  toasts = toasts.some((toast) => toast.id === id)
    ? toasts.map((toast) => (toast.id === id ? item : toast))
    : [...toasts, item].slice(-MAX_TOASTS);
  emit();
  return id;
}

/**
 * Shows a toast and returns its id. The sonner-style shape of the web `toast`:
 * `toast("Saved")`, `toast.success(...)`, `toast.error(...)`, `toast.warning(...)`,
 * `toast.info(...)`, `toast.loading(...)` and `toast.dismiss(id?)`. Needs one
 * `<Toaster />` mounted near the app root.
 */
export const toast = Object.assign(
  (title: string, options?: ToastOptions) => show("default", title, options),
  {
    success: (title: string, options?: ToastOptions) => show("success", title, options),
    error: (title: string, options?: ToastOptions) => show("error", title, options),
    warning: (title: string, options?: ToastOptions) => show("warning", title, options),
    info: (title: string, options?: ToastOptions) => show("info", title, options),
    loading: (title: string, options?: ToastOptions) => show("loading", title, options),
    /** Closes one toast, or every toast without an id. */
    dismiss(id?: string) {
      toasts = id === undefined ? [] : toasts.filter((toast) => toast.id !== id);
      emit();
    },
  },
);

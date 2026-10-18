import type { CSSProperties } from "react";
import { Toaster, type ToasterProps } from "sonner";
import { filledToastIcons } from "./sonner-icons";
import "./sonner.css";

// Sonner toaster aligned with flat tonal surfaces. `unstyled: true` strips
// sonner's default visual styling so our classes are the single source of
// truth. Toast surfaces use `glass-panel-strong` (flat popover fill) plus
// `smooth-shadow-ring-md`. `!font-sans` is forced on the toaster section because
// sonner sets its own `font-family` on `[data-sonner-toaster]` from a stylesheet
// that loads after app globals. Variant icons (success / error / warning / info)
// are tinted via a `data-icon` descendant selector, leaving the rest of the toast
// neutral. Callers should pass `theme` so sonner's internal `data-theme`
// attribute matches the active app theme.
//
// Stacking: `expand={false}` keeps toasts collapsed (offset + scale). Hovering
// the stack expands them. `sonner.css` hides back-toast content while collapsed
// because `unstyled` disables sonner's built-in `data-styled` stack rules.
//
// Caller props merge with these defaults instead of replacing them: see
// `mergeToastClassNames`, `mergeToasterStyle` and the `SonnerToaster` props.

type ToastClassNames = NonNullable<
  NonNullable<ToasterProps["toastOptions"]>["classNames"]
>;
type ToasterStyle = CSSProperties & Record<`--${string}`, string>;

type SonnerToasterOptions = {
  /**
   * `"lg"` (default) uses `rounded-lg`. `"surface"` uses `rounded-surface`.
   * `"control"` uses `rounded-field`, the radius of inputs and selects.
   */
  toastRadius?: "lg" | "surface" | "control";
  /** `"default"` keeps the current padding and text size. `"compact"` tightens padding, gap and text. */
  density?: "default" | "compact";
  /** `"default"` keeps sonner's icons. `"filled24"` uses 24px filled icons. */
  toastIcons?: "default" | "filled24";
  /**
   * `"default"` keeps the text-style close button. `"hoverChip"` uses a round chip at the
   * top-right, shown on hover (always on small screens) and enables sonner's `closeButton`
   * unless the caller sets it.
   */
  closeButtonStyle?: "default" | "hoverChip";
  /** When true, set sonner's `--normal-*` variables from `--color-*` tokens and `font-family: inherit`. */
  sonnerVars?: boolean;
  /** When true, descriptions use `text-muted-foreground!` so sonner's dark rule cannot win. */
  descriptionMuted?: boolean;
};

const hoverChipCloseButtonClassName =
  "pointer-events-none absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring group-hover:pointer-events-auto group-hover:opacity-100 max-sm:pointer-events-auto max-sm:opacity-100 max-sm:hit-target";

const defaultCloseButtonClassName =
  "rounded-lg bg-default px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-default/78";

const toastRadiusClasses = {
  lg: "rounded-lg",
  surface: "rounded-surface",
  control: "rounded-field",
} as const;

/** Default `classNames`, with the opt-in variants applied. No options gives the 0.2.1 defaults. */
function createToasterClassNames({
  toastRadius = "lg",
  density = "default",
  closeButtonStyle = "default",
  descriptionMuted = false,
}: Pick<
  SonnerToasterOptions,
  "toastRadius" | "density" | "closeButtonStyle" | "descriptionMuted"
> = {}): ToastClassNames {
  const radius = toastRadiusClasses[toastRadius];
  const compact = density === "compact";
  const descriptionSize = compact ? "text-xs" : "text-[13px]";
  return {
    toast: `group toast glass-panel-strong flex w-full items-center ${compact ? "gap-2" : "gap-3"} ${radius} ${compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"} text-foreground smooth-shadow-ring-md`,
    title: "font-medium leading-snug",
    description: descriptionMuted
      ? `${descriptionSize} leading-snug text-muted-foreground!`
      : `${descriptionSize} leading-snug text-muted-foreground`,
    actionButton:
      "rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90",
    cancelButton:
      "rounded-lg bg-surface-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-tertiary",
    closeButton:
      closeButtonStyle === "hoverChip"
        ? hoverChipCloseButtonClassName
        : defaultCloseButtonClassName,
    loader: "text-muted-foreground",
    success: "[&_[data-icon]]:text-success",
    error: "[&_[data-icon]]:text-danger",
    warning: "[&_[data-icon]]:text-warning",
    info: "[&_[data-icon]]:text-primary",
  };
}

/** Per key, joins the default class string and the caller string (defaults first, so callers win). */
function mergeToastClassNames(
  defaults: ToastClassNames,
  overrides?: ToastClassNames,
): ToastClassNames {
  if (!overrides) return defaults;
  const merged: Record<string, string | undefined> = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    if (!value) continue;
    const base = merged[key];
    merged[key] = base ? `${base} ${value}` : value;
  }
  return merged as ToastClassNames;
}

/** Sonner variables read from `--color-*` tokens. Work with `tokens.css` and the compat file. */
const sonnerVarsStyle: ToasterStyle = {
  fontFamily: "inherit",
  "--normal-bg": "var(--color-card)",
  "--normal-border": "var(--color-border)",
  "--normal-text": "var(--color-foreground)",
  "--normal-bg-hover": "var(--color-muted)",
  "--normal-border-hover": "var(--color-border)",
};

/** `{ ...defaults, ...overrides }`. The package adds no style keys unless `sonnerVars` is on. */
function mergeToasterStyle(
  defaults: CSSProperties | undefined,
  overrides: CSSProperties | undefined,
): CSSProperties | undefined {
  if (!defaults) return overrides;
  return overrides ? { ...defaults, ...overrides } : defaults;
}

/** Package defaults first. Caller wins per field, except `classNames`, which merge. */
function mergeToastOptions(
  defaults: NonNullable<ToasterProps["toastOptions"]>,
  overrides?: ToasterProps["toastOptions"],
): NonNullable<ToasterProps["toastOptions"]> {
  const { classNames, ...rest } = overrides ?? {};
  return {
    ...defaults,
    ...rest,
    classNames: mergeToastClassNames(defaults.classNames ?? {}, classNames),
  };
}

function SonnerToaster({
  toastRadius,
  density,
  toastIcons = "default",
  closeButtonStyle = "default",
  sonnerVars = false,
  descriptionMuted,
  toastOptions,
  icons,
  style,
  className,
  closeButton,
  ...props
}: ToasterProps & SonnerToasterOptions) {
  const mergedIcons =
    toastIcons === "filled24" ? { ...filledToastIcons, ...icons } : icons;
  return (
    <Toaster
      expand={false}
      visibleToasts={4}
      gap={12}
      {...props}
      closeButton={closeButton ?? (closeButtonStyle === "hoverChip" ? true : undefined)}
      className={className ? `toaster group !font-sans ${className}` : "toaster group !font-sans"}
      icons={mergedIcons}
      style={mergeToasterStyle(sonnerVars ? sonnerVarsStyle : undefined, style)}
      toastOptions={mergeToastOptions(
        {
          unstyled: true,
          classNames: createToasterClassNames({
            toastRadius,
            density,
            closeButtonStyle,
            descriptionMuted,
          }),
        },
        toastOptions,
      )}
    />
  );
}

export {
  SonnerToaster,
  createToasterClassNames,
  hoverChipCloseButtonClassName,
  mergeToastClassNames,
  mergeToastOptions,
  mergeToasterStyle,
  sonnerVarsStyle,
};
export { filledToastIcons } from "./sonner-icons";
export type { SonnerToasterOptions };

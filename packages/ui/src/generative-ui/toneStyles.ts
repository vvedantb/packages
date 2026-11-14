import type { GenerativeUiTone } from "@vvedantb/server/generative-ui";

/** Badge variant per tone. `neutral` stays quiet, not accented. */
export const BADGE_VARIANT: Record<GenerativeUiTone, "secondary" | "success" | "warning" | "destructive"> = {
  neutral: "secondary",
  positive: "success",
  warning: "warning",
  danger: "destructive",
};

/** Text colour for a metric's value and a callout's title. */
export const TONE_TEXT: Record<GenerativeUiTone, string> = {
  neutral: "text-foreground",
  positive: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

/** Callout fill: tone only, no decorative border. */
export const TONE_SURFACE: Record<GenerativeUiTone, string> = {
  neutral: "bg-surface-secondary",
  positive: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-destructive/10",
};

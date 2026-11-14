import type { GenerativeUiTone } from "@vvedantb/server/generative-ui";
import type { BadgeVariant } from "../Badge";
import { palette, withAlpha } from "../palette";
import { tokens } from "../tokens";
type Scheme = "light" | "dark";

/** The web `BADGE_VARIANT`: `neutral` stays quiet, not accented. */
export const BADGE_VARIANT: Record<GenerativeUiTone, BadgeVariant> = {
  neutral: "secondary",
  positive: "success",
  warning: "warning",
  danger: "destructive",
};

/** The web `BUTTON_VARIANT`. */
export const BUTTON_VARIANT = { primary: "default", secondary: "secondary", ghost: "ghost" } as const;

/** The web `TONE_TEXT`: a metric's value and a callout's title. */
export function toneText(tone: GenerativeUiTone, scheme: Scheme): string {
  if (tone === "positive") return palette.success[scheme];
  if (tone === "warning") return palette.warning[scheme];
  if (tone === "danger") return palette.danger[scheme];
  return tokens.color.foreground[scheme];
}

/** The web `TONE_SURFACE`: tone-only fills at 10%, no border. */
export function toneSurface(tone: GenerativeUiTone, scheme: Scheme): string {
  if (tone === "neutral") return tokens.color.surfaceSecondary[scheme];
  return withAlpha(toneText(tone, scheme), 0.1);
}

/** The web `gap-2`, `gap-3` and `gap-4`. */
export const GAP = { sm: 8, md: 12, lg: 16 } as const;

export const ALIGN = { start: "flex-start", center: "center", stretch: "stretch" } as const;

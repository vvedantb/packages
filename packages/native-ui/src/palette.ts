/**
 * Web semantic colours for React Native, converted from `@vvedantb/ui`
 * `tokens.css` (oklch → sRGB hex, clipped to sRGB). `tokens.ts` holds the
 * neutrals the native app ships; these are the colours it lacks (primary,
 * danger, success, warning, overlay, segment, field placeholder, backdrop,
 * dialog description).
 *
 * A test in this package converts `tokens.css` and fails when a value here
 * drifts, so change `tokens.css` first and then this file.
 */
export const palette = {
  /** `--accent` (web `primary`): near-black in light, near-white in dark. */
  primary: { light: "#181818", dark: "#fcfcfc" },
  primaryForeground: { light: "#fcfcfc", dark: "#181818" },
  danger: { light: "#ff373c", dark: "#db3b3e" },
  dangerForeground: { light: "#fcfcfc", dark: "#fcfcfc" },
  success: { light: "#15c964", dark: "#15c964" },
  successForeground: { light: "#161917", dark: "#161917" },
  warning: { light: "#f5a523", dark: "#f7b750" },
  warningForeground: { light: "#1a1815", dark: "#1a1815" },
  /** `--default` (web `secondary`): neutral control fill. */
  default: { light: "#ebebeb", dark: "#272727" },
  defaultForeground: { light: "#181818", dark: "#fcfcfc" },
  overlay: { light: "#ffffff", dark: "#181818" },
  overlayForeground: { light: "#181818", dark: "#fcfcfc" },
  segment: { light: "#ffffff", dark: "#474747" },
  segmentForeground: { light: "#181818", dark: "#fcfcfc" },
  surfaceTertiary: { light: "#eaeaea", dark: "#282627" },
  fieldPlaceholder: { light: "#727272", dark: "#a0a0a0" },
  backdrop: { light: "rgba(0, 0, 0, 0.5)", dark: "rgba(0, 0, 0, 0.6)" },
  /** Web `DialogDescription` text: `--overlay-foreground` mixed 72% into `--overlay` (oklch), for 4.5:1 on the overlay. */
  overlayMuted: { light: "#505050", dark: "#b5b5b5" },
  /** Fill of the web destructive `Button` (`oklch(47.2% 0.195 25.7)`), the same in both schemes. */
  destructive: "#af0015",
} as const;

export type Palette = typeof palette;

/** `#rrggbb` with an alpha, as `rgba(...)`. For tints such as the badge fills (web `bg-danger/12`). */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

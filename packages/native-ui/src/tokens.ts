/**
 * JS tokens for React Native: colours, radii and spacing (1rem = 16).
 *
 * Copy of `packages/ui/tokens/src/native.ts`, kept here so native-ui has no
 * dependency on the web package. A test in `@vvedantb/ui` and one in this
 * package fail when the two differ below this header: change both together.
 *
 * The neutrals and `radius.field` match `tokens.css` (oklch → sRGB hex); a
 * test converts `tokens.css` and fails when they drift. `fill` and `hairline`
 * are native glass chrome with no web token. `radius.card` has no web token
 * either; `docs/native-ui-parity.md` lists it. The web semantic colours
 * (primary, danger, success, warning) are in `palette.ts`.
 */
export const tokens = {
  color: {
    background: { light: "#f5f5f5", dark: "#060606" },
    foreground: { light: "#181818", dark: "#fcfcfc" },
    muted: { light: "#727272", dark: "#a0a0a0" },
    border: { light: "#dedede", dark: "#292929" },
    surface: { light: "#ffffff", dark: "#181818" },
    surfaceSecondary: { light: "#efefef", dark: "#242323" },
    surfaceCard: { light: "#f8f8f8", dark: "#242323" },
    separator: { light: "#e4e4e4", dark: "#222222" },
    white: "#ffffff",
    black: "#000000",
    hairline: {
      light: "rgba(255, 255, 255, 0.7)",
      dark: "rgba(255, 255, 255, 0.12)",
    },
    fill: {
      light: "rgba(255, 255, 255, 0.86)",
      dark: "rgba(24, 24, 24, 0.88)",
    },
  },
  radius: {
    lg: 16,
    field: 10,
    md: 14,
    sm: 12,
    card: 24,
    pill: 999,
  },
  spacing: {
    unit: 16,
  },
} as const;

export type Tokens = typeof tokens;

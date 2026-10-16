/**
 * JS tokens for React Native. Values match `tokens.css`
 * (oklch neutrals → hex, 1rem = 16).
 */
export const tokens = {
  color: {
    background: { light: "#f6f6f6", dark: "#1f1f1f" },
    foreground: { light: "#242426", dark: "#fafafa" },
    muted: { light: "#737373", dark: "#b3b3b3" },
    border: { light: "#e5e5e5", dark: "#474747" },
    surface: { light: "#ffffff", dark: "#242426" },
    surfaceSecondary: { light: "#f2f2f2", dark: "#2a2a2c" },
    surfaceCard: { light: "#fafafa", dark: "#2a2a2c" },
    separator: { light: "#ebebeb", dark: "#404040" },
    white: "#ffffff",
    black: "#000000",
    hairline: {
      light: "rgba(255, 255, 255, 0.7)",
      dark: "rgba(255, 255, 255, 0.12)",
    },
    fill: {
      light: "rgba(255, 255, 255, 0.86)",
      dark: "rgba(28, 28, 30, 0.88)",
    },
  },
  radius: {
    lg: 16,
    field: 20,
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

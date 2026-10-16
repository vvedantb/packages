import { tokens } from "./tokens";

export const NEUTRAL_100 = "#f5f5f5";
export const NEUTRAL_500 = tokens.color.muted.light;
export const NEUTRAL_900 = "#171717";
export const PINK_50 = "#fdf2f8";
export const PINK_100 = "#fce7f3";
export const PINK_600 = "#db2777";
export const PINK_700 = "#be185d";

export const Colors = {
  white: tokens.color.white,
  black: tokens.color.black,
  neutral: {
    800: "#262626",
  },
} as const;

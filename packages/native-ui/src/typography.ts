/** The four font families: one per weight, as the app loads them. */
export type ThemeFonts = { regular: string; medium: string; semibold: string; bold: string };

/**
 * The font family names JS styles use, Instrument Sans by default (the
 * Expo Google Fonts names, as `INSTRUMENT_SANS` in tailwind-preset.cjs).
 * `configureTheme({ font })` writes into this object, and components read it at
 * render, so do not copy a value out at import.
 */
export const fontFamily: ThemeFonts = {
  regular: "InstrumentSans_400Regular",
  medium: "InstrumentSans_500Medium",
  semibold: "InstrumentSans_600SemiBold",
  bold: "InstrumentSans_700Bold",
};

/**
 * NativeWind classes for the four faces (Instrument Sans by default). The app
 * loads the font files and maps these classes to them (see README, and the
 * preset's `font` option). Literal strings, so Tailwind's source scan
 * generates them.
 */
export const fontClass = {
  regular: "font-instrument-sans",
  medium: "font-instrument-sans-medium",
  semibold: "font-instrument-sans-semibold",
  bold: "font-instrument-sans-bold",
} as const;

/**
 * `AppWordmark` geometry, the same numbers as the web `AppWordmark` and
 * `.landing-wordmark-text`: Instrument Sans 500, letter spacing -0.02em, icon
 * 1.4x the font size, gap 0.2em. A test checks them against the web source.
 */
export const WORDMARK = {
  fontClass: fontClass.medium,
  fontWeight: 500,
  letterSpacingEm: -0.02,
  iconScale: 1.4,
  gapEm: 0.2,
} as const;

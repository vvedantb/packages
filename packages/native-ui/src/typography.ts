/**
 * NativeWind classes for Instrument Sans. The app loads the font files and maps
 * these classes to them (see README). Literal strings, so Tailwind's source
 * scan generates them.
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

/**
 * `@vvedantb/native-ui/tailwind-preset`: the NativeWind / Tailwind preset the
 * Expo apps share. CommonJS, because `tailwind.config.js` `require`s it and
 * Tailwind loads it outside Metro.
 *
 *   const { nativeUiPreset, nativeUiContent } = require("@vvedantb/native-ui/tailwind-preset");
 *   module.exports = {
 *     content: ["./app/**\/*.{js,ts,tsx}", nativeUiContent()],
 *     presets: [nativeUiPreset()],
 *   };
 *
 * It nests `nativewind/preset`, so callers pass only this one. It sets
 * `darkMode`, the Instrument Sans font classes, the colour keys native-ui
 * classes use, `borderWidth.hairline` and, when asked, `borderRadius` from
 * `--radius`.
 * App colours, display fonts, keyframes and font-weight plugins stay in the
 * app config.
 *
 * `color` maps a CSS variable name (without `--`) to a Tailwind colour, as the
 * web `tokensPreset({ color })` of `@vvedantb/ui`. With `injectCssVariables`,
 * the preset also writes those variables (light and dark) from `tokens.ts` and
 * `palette.ts`, as space-separated RGB channels, and the default `color` is
 * `rgbAlpha`.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

/** `var(--name)`. */
const cssVar = (name) => `var(--${name})`;
/** `hsl(var(--name))`, for variables that hold `h s% l%` channels. */
const hslVar = (name) => `hsl(var(--${name}))`;
/** `rgb(var(--name) / <alpha-value>)`, for variables that hold `r g b` channels. Keeps opacity modifiers. */
const rgbAlpha = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const INSTRUMENT_SANS = {
  regular: "InstrumentSans_400Regular",
  medium: "InstrumentSans_500Medium",
  semibold: "InstrumentSans_600SemiBold",
  bold: "InstrumentSans_700Bold",
};

/** The glob Tailwind scans for native-ui class names: this package's `src`, at its real path (pnpm symlinks resolve). */
function nativeUiContent() {
  return path.join(__dirname, "**/*.{js,ts,tsx}").split(path.sep).join("/");
}

/**
 * Reads one `export const name = { … } as const;` object from a sibling
 * `.ts` file. Plain object literals only, so no TypeScript loader is needed:
 * `tokens.ts` and `palette.ts` stay the single source of the colours.
 */
function readConst(file, name) {
  const source = fs.readFileSync(path.join(__dirname, file), "utf8");
  const match = source.match(new RegExp(`export const ${name} = (\\{[\\s\\S]*?\\n\\}) as const;`));
  if (!match) throw new Error(`@vvedantb/native-ui/tailwind-preset: no \`${name}\` object in ${file}`);
  return new Function(`return (${match[1]});`)();
}

let cachedSchemeColors = null;

/** CSS variable name → `{ light, dark }` hex, from `tokens.ts` and `palette.ts`. */
function schemeColors() {
  if (cachedSchemeColors) return cachedSchemeColors;
  const tokens = readConst("tokens.ts", "tokens");
  const palette = readConst("palette.ts", "palette");
  const c = tokens.color;
  cachedSchemeColors = {
    background: c.background,
    foreground: c.foreground,
    border: c.border,
    input: c.border,
    ring: palette.primary,
    separator: c.separator,
    surface: c.surface,
    "surface-foreground": c.foreground,
    "surface-secondary": c.surfaceSecondary,
    "surface-tertiary": palette.surfaceTertiary,
    "surface-card": c.surfaceCard,
    muted: c.muted,
    "muted-foreground": c.muted,
    primary: palette.primary,
    "primary-foreground": palette.primaryForeground,
    secondary: palette.default,
    "secondary-foreground": palette.defaultForeground,
    destructive: palette.danger,
    "destructive-foreground": palette.dangerForeground,
    accent: palette.primary,
    "accent-foreground": palette.primaryForeground,
    popover: palette.overlay,
    "popover-foreground": palette.overlayForeground,
    card: c.surfaceCard,
    "card-foreground": c.foreground,
    danger: palette.danger,
    "danger-foreground": palette.dangerForeground,
    success: palette.success,
    "success-foreground": palette.successForeground,
    warning: palette.warning,
    "warning-foreground": palette.warningForeground,
    default: palette.default,
    "default-foreground": palette.defaultForeground,
    overlay: palette.overlay,
    "overlay-foreground": palette.overlayForeground,
    field: c.surface,
    "field-placeholder": palette.fieldPlaceholder,
  };
  return cachedSchemeColors;
}

/** `#rrggbb` as `r g b`. */
function channels(hex) {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** `--name: r g b` for every colour in one scheme. */
function cssVariables(scheme) {
  return Object.fromEntries(
    Object.entries(schemeColors()).map(([name, value]) => [`--${name}`, channels(value[scheme])]),
  );
}

/** `--radius` from `tokens.radius.lg` (16), so `rounded-lg`, `-md` and `-sm` are 16, 14 and 12 as in `tokens.radius`. */
function radiusVariable() {
  return { "--radius": `${readConst("tokens.ts", "tokens").radius.lg}px` };
}

/** The Tailwind colour keys native-ui classes and the apps share. */
function themeColors(v) {
  return {
    background: v("background"),
    foreground: v("foreground"),
    border: v("border"),
    input: v("input"),
    ring: v("ring"),
    separator: v("separator"),
    surface: {
      DEFAULT: v("surface"),
      foreground: v("surface-foreground"),
      secondary: v("surface-secondary"),
      tertiary: v("surface-tertiary"),
      card: v("surface-card"),
    },
    primary: { DEFAULT: v("primary"), foreground: v("primary-foreground") },
    secondary: { DEFAULT: v("secondary"), foreground: v("secondary-foreground") },
    destructive: { DEFAULT: v("destructive"), foreground: v("destructive-foreground") },
    muted: { DEFAULT: v("muted"), foreground: v("muted-foreground") },
    accent: { DEFAULT: v("accent"), foreground: v("accent-foreground") },
    popover: { DEFAULT: v("popover"), foreground: v("popover-foreground") },
    card: { DEFAULT: v("card"), foreground: v("card-foreground") },
    danger: { DEFAULT: v("danger"), foreground: v("danger-foreground") },
    success: { DEFAULT: v("success"), foreground: v("success-foreground") },
    warning: { DEFAULT: v("warning"), foreground: v("warning-foreground") },
    default: { DEFAULT: v("default"), foreground: v("default-foreground") },
    overlay: { DEFAULT: v("overlay"), foreground: v("overlay-foreground") },
    field: { DEFAULT: v("field"), placeholder: v("field-placeholder") },
  };
}

/** `nativewind/preset`, or none where NativeWind is not installed (this repository's tests). */
function nestedPresets() {
  try {
    return [require("nativewind/preset")];
  } catch {
    return [];
  }
}

/** `{ hairline: hairlineWidth() }` from `nativewind/theme`, or none without NativeWind. */
function hairlineBorder() {
  try {
    const { hairlineWidth } = require("nativewind/theme");
    return typeof hairlineWidth === "function" ? { hairline: hairlineWidth() } : {};
  } catch {
    return {};
  }
}

/** A Tailwind plugin that writes the colour variables: `:root` (light) and the dark set for `darkMode`. */
function cssVariablesPlugin(darkMode) {
  return function nativeUiCssVariables({ addBase }) {
    const dark = cssVariables("dark");
    addBase(
      darkMode === "media"
        ? {
            ":root": { ...cssVariables("light"), ...radiusVariable() },
            "@media (prefers-color-scheme: dark)": { ":root": dark },
          }
        : {
            ":root": { ...cssVariables("light"), ...radiusVariable() },
            ".dark:root, .dark": dark,
          },
    );
  };
}

/**
 * The preset. Options:
 * - `darkMode`: `"class"` (default; `ThemeToggle` and `setColorScheme` need it) or `"media"`.
 * - `color`: CSS variable name → colour value. Default `cssVar`, or `rgbAlpha` with `injectCssVariables`.
 * - `injectCssVariables`: write the colour variables and `--radius` from `tokens.ts` and `palette.ts`. Default `false`.
 * - `radiusVariable`: `rounded-lg`, `-md` and `-sm` from `var(--radius)`, as vibot and Velth. Default: on with
 *   `injectCssVariables`, else off, so an app without `--radius` keeps the Tailwind radii.
 */
function nativeUiPreset(options = {}) {
  const darkMode = options.darkMode === "media" ? "media" : "class";
  const inject = options.injectCssVariables === true;
  const color = options.color || (inject ? rgbAlpha : cssVar);
  const radius = options.radiusVariable ?? inject;
  return {
    darkMode,
    presets: nestedPresets(),
    theme: {
      extend: {
        colors: themeColors(color),
        fontFamily: {
          sans: [INSTRUMENT_SANS.regular],
          "instrument-sans": [INSTRUMENT_SANS.regular],
          "instrument-sans-medium": [INSTRUMENT_SANS.medium],
          "instrument-sans-semibold": [INSTRUMENT_SANS.semibold],
          "instrument-sans-bold": [INSTRUMENT_SANS.bold],
        },
        borderRadius: radius
          ? {
              lg: "var(--radius)",
              md: "calc(var(--radius) - 2px)",
              sm: "calc(var(--radius) - 4px)",
            }
          : {},
        borderWidth: hairlineBorder(),
      },
    },
    plugins: inject ? [cssVariablesPlugin(darkMode)] : [],
  };
}

module.exports = {
  nativeUiPreset,
  nativeUiContent,
  cssVar,
  hslVar,
  rgbAlpha,
  cssVariables,
  schemeColors,
  INSTRUMENT_SANS,
};
module.exports.default = nativeUiPreset();

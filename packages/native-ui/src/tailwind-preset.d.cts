/** Maps a CSS variable name (without `--`) to a Tailwind colour value. */
export type ColorFn = (name: string) => string;

type Colors = { [key: string]: string | Colors };
type CssDeclarations = Record<string, string>;
type AddBase = (base: Record<string, CssDeclarations | Record<string, CssDeclarations>>) => void;

export interface NativeUiPresetOptions {
  /** Default `"class"`: `ThemeToggle` and NativeWind `setColorScheme` need it. */
  darkMode?: "class" | "media";
  /** Default `cssVar`, or `rgbAlpha` with `injectCssVariables`. */
  color?: ColorFn;
  /** Write the colour variables (as `r g b` channels) and `--radius` from `tokens.ts` and `palette.ts`. Default `false`. */
  injectCssVariables?: boolean;
  /** `rounded-lg`, `-md` and `-sm` from `var(--radius)`. Default: the value of `injectCssVariables`. */
  radiusVariable?: boolean;
}

export interface NativeUiPreset {
  darkMode: "class" | "media";
  presets: unknown[];
  theme: {
    extend: {
      colors: Colors;
      fontFamily: Record<string, string[]>;
      borderRadius: Record<string, string>;
      borderWidth: Record<string, unknown>;
    };
  };
  plugins: Array<(api: { addBase: AddBase }) => void>;
}

export declare const cssVar: ColorFn;
export declare const hslVar: ColorFn;
export declare const rgbAlpha: ColorFn;
export declare const INSTRUMENT_SANS: {
  regular: "InstrumentSans_400Regular";
  medium: "InstrumentSans_500Medium";
  semibold: "InstrumentSans_600SemiBold";
  bold: "InstrumentSans_700Bold";
};
export declare function nativeUiPreset(options?: NativeUiPresetOptions): NativeUiPreset;
/** Absolute glob of this package's `src/**\/*.{js,ts,tsx}`, for Tailwind `content`. */
export declare function nativeUiContent(): string;
/** CSS variable name → `{ light, dark }` hex, from `tokens.ts` and `palette.ts`. */
export declare function schemeColors(): Record<string, { light: string; dark: string }>;
/** `{ "--name": "r g b" }` for one scheme. */
export declare function cssVariables(scheme: "light" | "dark"): CssDeclarations;
declare const preset: NativeUiPreset;
export default preset;

/** Maps a CSS variable name (without `--`) to a Tailwind colour value. */
export type ColorFn = (name: string) => string;

type Colors = { [key: string]: string | Colors };
type Frames = Record<string, Record<string, string>>;

export interface TokensPreset {
  darkMode: "class";
  theme: {
    extend: {
      colors: Colors;
      borderRadius: Record<string, string>;
      boxShadow: Record<string, string>;
      transitionTimingFunction: Record<string, string>;
      screens: Record<string, string>;
      keyframes: Record<string, Frames>;
      animation: Record<string, string>;
    };
  };
}

export declare const cssVar: ColorFn;
export declare function tokensPreset(options?: { color?: ColorFn }): TokensPreset;
declare const preset: TokensPreset;
export default preset;

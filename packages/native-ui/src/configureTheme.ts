import { palette, type Palette } from "./palette";
import { tokens, type Tokens } from "./tokens";
import { fontFamily, type ThemeFonts } from "./typography";

/** `tokens` and `palette` value types with the literal hex widened to `string` and `readonly` dropped. */
type Widen<T> = T extends string ? string : { -readonly [K in keyof T]: Widen<T[K]> };

/** The `tokens.color` shape: each key a `{ light, dark }` pair, except `white` and `black`. */
export type ThemeColors = Widen<Tokens["color"]>;

/** The `palette` shape: each key a `{ light, dark }` pair, except `destructive`. */
export type ThemePalette = Widen<Palette>;

export type ThemeConfig = {
  /** Overrides for `tokens.color` (neutrals and surfaces). Keys not given keep the package value. */
  color?: Partial<ThemeColors>;
  /** Overrides for `palette` (primary, danger, overlay and the other web semantic colours). */
  palette?: Partial<ThemePalette>;
  /** Overrides for `fontFamily`: the family name for each weight, as the app loads the fonts. */
  font?: Partial<ThemeFonts>;
};

type ColorValue = string | { light: string; dark: string };

/**
 * Copies each given key onto `target`. A `{ light, dark }` pair is copied into
 * the existing pair object, so values that hold the pair (`floatingFill`,
 * `floatingHairline`, `floatingSolidFill`) follow it.
 */
function assignValues(
  target: { readonly [key: string]: ColorValue },
  source: { readonly [key: string]: ColorValue | undefined },
) {
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    const current = target[key];
    if (typeof current === "object" && typeof value === "object") Object.assign(current, value);
    else Object.assign(target, { [key]: value });
  }
}

/** Bumped by each `configureTheme` call; `useScheme` redraws on it. */
let themeVersion = 0;
const themeListeners = new Set<() => void>();

/** Calls `listener` after each `configureTheme`. Returns the unsubscribe. */
export function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

/** The number of `configureTheme` calls so far, a snapshot for `useSyncExternalStore`. */
export function getThemeVersion(): number {
  return themeVersion;
}

/**
 * Sets the app's own colours and fonts. It writes into the shared
 * `tokens.color`, `palette` and `fontFamily` objects, which every component
 * reads at render. Call it once at app start, before the first render (for
 * example at the top of the root `_layout.tsx`, outside the component). A
 * later call (for example a second dark palette the user picks) redraws the
 * mounted components under `NativeUiProvider` that read the scheme (`useScheme`); app code that copies
 * values out, or memoises on the scheme alone, must redraw on its own. Each
 * pair gives both schemes:
 *
 * ```ts
 * configureTheme({
 *   color: { background: { light: "#f4f5f6", dark: "#020202" } },
 *   palette: { primary: { light: "#09090b", dark: "#fafafa" } },
 *   font: { regular: "Inter_400Regular", semibold: "Inter_600SemiBold" },
 * });
 * ```
 *
 * Only the JS values change. NativeWind classes keep the app's Tailwind theme
 * (`tailwind-preset` reads the package values from source; pass the same
 * family names to `nativeUiPreset({ font })`), and constants copied out before
 * the call (`NEUTRAL_500`) keep the package value. The app loads the font files.
 */
export function configureTheme(config: ThemeConfig): void {
  if (config.color) assignValues(tokens.color, config.color);
  if (config.palette) assignValues(palette, config.palette);
  if (config.font) assignValues(fontFamily, config.font);
  themeVersion += 1;
  for (const listener of themeListeners) listener();
}

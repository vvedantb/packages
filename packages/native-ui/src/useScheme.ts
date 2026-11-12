import { useColorScheme } from "nativewind";
import { createContext, useContext } from "react";

/**
 * The number of `configureTheme` calls, given by `NativeUiProvider`. A part
 * that reads it redraws after each call, so a palette set at run time shows
 * at once, even under a memoised parent.
 */
export const ThemeVersionContext = createContext(0);

/** Active colour scheme as a `tokens` / `palette` key. Redraws the caller after each `configureTheme`. */
export function useScheme(): "light" | "dark" {
  useContext(ThemeVersionContext);
  return useColorScheme().colorScheme === "dark" ? "dark" : "light";
}

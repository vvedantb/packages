import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { getThemeVersion, subscribeTheme } from "./configureTheme";
import { tokens } from "./tokens";
import { ThemeVersionContext } from "./useScheme";

export const DEFAULT_ACCENT = "#db2777";

export type NativeUiTheme = {
  largerText: boolean;
  accentColor: string;
};

const NativeUiContext = createContext<NativeUiTheme>({
  largerText: false,
  accentColor: DEFAULT_ACCENT,
});

export function NativeUiProvider({
  largerText = false,
  accentColor = DEFAULT_ACCENT,
  children,
}: {
  largerText?: boolean;
  accentColor?: string;
  children: ReactNode;
}) {
  // Each `configureTheme` call redraws every part below that reads the scheme.
  const themeVersion = useSyncExternalStore(subscribeTheme, getThemeVersion, getThemeVersion);
  return (
    <NativeUiContext.Provider value={{ largerText, accentColor }}>
      <ThemeVersionContext.Provider value={themeVersion}>{children}</ThemeVersionContext.Provider>
    </NativeUiContext.Provider>
  );
}

export function useNativeUi() {
  return useContext(NativeUiContext);
}

export function useLargerText() {
  return useContext(NativeUiContext).largerText;
}

export function useAccentColor() {
  return useContext(NativeUiContext).accentColor;
}

export { tokens };

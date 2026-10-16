import { createContext, useContext, type ReactNode } from "react";
import { tokens } from "./tokens";

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
  return (
    <NativeUiContext.Provider value={{ largerText, accentColor }}>
      {children}
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

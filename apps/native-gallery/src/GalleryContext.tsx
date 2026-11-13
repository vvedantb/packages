import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "nativewind";
import { NativeUiProvider } from "@vvedantb/native-ui/theme";

type GalleryState = {
  largerText: boolean;
  setLargerText: (value: boolean) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
};

const GalleryContext = createContext<GalleryState | null>(null);

/** Holds the larger-text and dark-mode switches and feeds them to `NativeUiProvider` and NativeWind. */
export function GalleryProvider({ children }: { children: ReactNode }) {
  const [largerText, setLargerText] = useState(false);
  const { colorScheme, setColorScheme } = useColorScheme();
  const value = useMemo<GalleryState>(
    () => ({
      largerText,
      setLargerText,
      dark: colorScheme === "dark",
      setDark: (dark) => setColorScheme(dark ? "dark" : "light"),
    }),
    [largerText, colorScheme, setColorScheme],
  );
  return (
    <GalleryContext.Provider value={value}>
      <NativeUiProvider largerText={largerText}>{children}</NativeUiProvider>
    </GalleryContext.Provider>
  );
}

export function useGallery(): GalleryState {
  const value = useContext(GalleryContext);
  if (!value) throw new Error("useGallery must be used inside GalleryProvider");
  return value;
}

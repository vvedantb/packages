import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * The `expo-paste-input` build of a text field's image paste, from
 * `@vvedantb/native-ui/paste-input`. React Native's `TextInput` takes no
 * pasted image: the long-press Paste and the keyboard's image insert (Gboard's
 * clipboard, stickers) do nothing. `Target` wraps a field so they hand the
 * images over as local file URIs. Without it (the peer is optional, and needs
 * a native build) a field keeps text paste only. A context, so only that entry
 * imports the peer and an app without it bundles as before.
 */
export type PasteParts = {
  Target: ComponentType<{
    /** The pasted images, as `file://` URIs in the app's cache. */
    onPasteImages: (uris: string[]) => void;
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
  }>;
};

export const PastePartsContext = createContext<PasteParts | null>(null);

/** The image paste parts from `PasteInputProvider`, or null without it. */
export function usePasteParts(): PasteParts | null {
  return useContext(PastePartsContext);
}

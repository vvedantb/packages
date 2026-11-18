import { TextInputWrapper, type PasteEventPayload } from "expo-paste-input";
import type { ReactNode } from "react";
import { PastePartsContext, type PasteParts } from "./paste-parts";

// The image paste on `expo-paste-input`: on Android an `OnReceiveContentListener`
// on the wrapped field (Paste, and the keyboard's image insert), on iOS the
// field's `paste(_:)` and keyboard stickers. Text paste stays the field's own.

const Target: PasteParts["Target"] = ({ onPasteImages, style, children }) => (
  <TextInputWrapper
    style={style}
    onPaste={(payload: PasteEventPayload) => {
      if (payload.type === "images" && payload.uris.length > 0) onPasteImages(payload.uris);
    }}
  >
    {children}
  </TextInputWrapper>
);

const PARTS: PasteParts = { Target };

/**
 * Image paste for the kit's text fields (`PromptInput` `onPasteImages`). Wrap
 * the app once, under `ThemeProvider`. Needs `expo-paste-input` and a native
 * build (not Expo Go); on the web it does nothing.
 */
export function PasteInputProvider({ children }: { children: ReactNode }) {
  return <PastePartsContext.Provider value={PARTS}>{children}</PastePartsContext.Provider>;
}

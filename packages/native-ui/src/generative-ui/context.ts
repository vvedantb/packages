import { createContext, useContext } from "react";

/** What a panel passes to every element it draws. */
export type GenerativeUiPanelOptions = {
  /** False when the app cannot reply: every button is disabled, as the web's disabled fieldset. */
  canPress: boolean;
  /** Copies a code block. Without it, code blocks have no copy button. */
  onCopy?: (text: string) => void | Promise<void>;
};

export const GenerativeUiPanelContext = createContext<GenerativeUiPanelOptions>({ canPress: false });

export function useGenerativeUiPanel(): GenerativeUiPanelOptions {
  return useContext(GenerativeUiPanelContext);
}

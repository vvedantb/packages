import type { ComponentRenderProps } from "@json-render/react-native";
import { isHttpUrl, parseGenerativeUiSpec } from "@vvedantb/server/generative-ui";
import { createContext, useContext, type ReactNode } from "react";
import { Linking, View } from "react-native";
import { cardStyle } from "../controlStyles";
import { useScheme } from "../useScheme";
import { GenerativeUiPanelContext } from "./context";
import { GenerativeUiRenderer } from "./renderer";

export type GenerativeUiPanelProps = {
  /** The stored json-render spec, still serialised. */
  spec: string;
  /**
   * Sends a button's text back to the agent. Undefined when the app cannot
   * send now (an archived chat, a sleeping sandbox): every button is then
   * disabled, as the web panel's disabled fieldset.
   */
  onReply?: (message: string) => void;
  /** Opens a button's link. Only http(s) URLs reach it. Default: `Linking.openURL`. */
  onOpenUrl?: (url: string) => void;
  /** Copies a code block. Without it, code blocks have no copy button. */
  onCopy?: (text: string) => void | Promise<void>;
  /**
   * Draws an element type this catalog does not know (a spec from a newer
   * catalog). Default: nothing, as the web panel.
   */
  renderUnsupported?: (type: string) => ReactNode;
  testID?: string;
};

const openUrl = (url: string) => {
  void Linking.openURL(url);
};

const UnsupportedContext = createContext<((type: string) => ReactNode) | undefined>(undefined);

/** json-render's fallback for an unknown type, drawn by the app's `renderUnsupported`. */
function UnsupportedElement({ element }: ComponentRenderProps) {
  const render = useContext(UnsupportedContext);
  return render ? <>{render(element.type)}</> : null;
}

/**
 * One agent-composed panel on a phone, as `GenerativeUiPanel` from
 * `@vvedantb/ui/generative-ui` on the web. The spec is parsed again here, not
 * trusted: a row written by an older catalog shows nothing, not a broken card.
 */
export function GenerativeUiPanel({
  spec,
  onReply,
  onOpenUrl = openUrl,
  onCopy,
  renderUnsupported,
  testID,
}: GenerativeUiPanelProps) {
  const scheme = useScheme();
  const parsed = parseGenerativeUiSpec(spec);
  if (!parsed) return null;

  const handleAction = (actionName: string, params?: Record<string, unknown>) => {
    if (actionName === "reply") {
      const message = params?.message;
      if (onReply && typeof message === "string") onReply(message);
      return;
    }
    if (actionName === "open_url") {
      const url = params?.url;
      // A stored spec is data: only an http(s) link opens.
      if (typeof url === "string" && isHttpUrl(url)) onOpenUrl(url);
    }
  };

  return (
    // The web `Surface density="tight"`: the card fill, radius 16, `p-3`.
    <View testID={testID} className="min-w-0 p-3" style={cardStyle(scheme)}>
      <GenerativeUiPanelContext.Provider value={{ canPress: onReply !== undefined, onCopy }}>
        <UnsupportedContext.Provider value={renderUnsupported}>
          <GenerativeUiRenderer spec={parsed} onAction={handleAction} fallback={UnsupportedElement} />
        </UnsupportedContext.Provider>
      </GenerativeUiPanelContext.Provider>
    </View>
  );
}

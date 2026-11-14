"use client";

import { isHttpUrl, parseGenerativeUiSpec } from "@vvedantb/server/generative-ui";
import { m } from "motion/react";
import { tokenTransition } from "../motion/presets";
import { Surface } from "../ui/surface";
import { GenerativeUiRenderer } from "./renderer";

export interface GenerativeUiPanelProps {
  /** The stored json-render spec, still serialised. */
  spec: string;
  /**
   * Sends a button's text back to the agent. Undefined when the app cannot
   * send now (an archived chat, a sleeping sandbox): the buttons are then
   * disabled, not silently inert.
   */
  onReply?: (message: string) => void;
  /** Opens a button's link. Only http(s) URLs reach it. Default: a new browser tab. */
  onOpenUrl?: (url: string) => void;
  "data-testid"?: string;
}

const openInNewTab = (url: string) => {
  window.open(url, "_blank", "noopener");
};

/**
 * One agent-composed panel. The spec is parsed again here, not trusted: it
 * was composed against the catalog on the server, but it arrives as a string,
 * and a row written by an older catalog must show nothing, not a broken card.
 */
export function GenerativeUiPanel({
  spec,
  onReply,
  onOpenUrl = openInNewTab,
  "data-testid": testId,
}: GenerativeUiPanelProps) {
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
      // The composer already rejects other schemes, but a stored spec is data,
      // and `window.open("javascript:…")` would run it: check again here.
      if (typeof url === "string" && isHttpUrl(url)) onOpenUrl(url);
    }
  };

  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={tokenTransition.fast}>
      <Surface density="tight" className="min-w-0 max-w-full" data-testid={testId}>
        {/* `display: contents` keeps the fieldset out of the layout, while its
            disabled state still reaches every button inside the spec. */}
        <fieldset className="contents" disabled={onReply === undefined}>
          <GenerativeUiRenderer spec={parsed} onAction={handleAction} />
        </fieldset>
      </Surface>
    </m.div>
  );
}

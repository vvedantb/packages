import { useEffect, useState } from "react";

const AUTO_CLOSE_DELAY_MS = 1000;

/**
 * Open state for a fold that follows a live stream: it opens when streaming
 * starts so the text is readable as it lands, and closes once, a second after
 * streaming stops. A reader's own toggle cancels a pending auto-close. A port
 * of the web `useStreamingDisclosure`; spread the result on a `Collapsible`
 * or `AgentTraceCollapsible`.
 */
export function useStreamingDisclosure(isStreaming: boolean): {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} {
  const [open, setOpen] = useState(isStreaming);
  const [wasStreaming, setWasStreaming] = useState(isStreaming);
  const [closeDue, setCloseDue] = useState(false);

  // Adjusting state while rendering, as on the web: no extra commit with the
  // old open state.
  if (isStreaming !== wasStreaming) {
    setWasStreaming(isStreaming);
    if (isStreaming) {
      setOpen(true);
      setCloseDue(false);
    } else {
      setCloseDue(true);
    }
  }

  // The close is a delayed reaction to the stream stopping, not to a press:
  // only a timer can express "one second later".
  useEffect(() => {
    if (!closeDue) return;
    const timer = setTimeout(() => {
      setOpen(false);
      setCloseDue(false);
    }, AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [closeDue]);

  return {
    open,
    onOpenChange: (next) => {
      setCloseDue(false);
      setOpen(next);
    },
  };
}

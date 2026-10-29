import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { IconBrain } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { sizeStyle, textStyle } from "../controlStyles";
import { withAlpha } from "../palette";
import { useControllableState } from "../primitives/use-controllable-state";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { MONO_FONT, chatTextSize, formatElapsed } from "./chat-text";
import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTrigger,
  type CollapsibleProps,
  type CollapsibleTriggerProps,
} from "./collapsible";
import { ResponseText } from "./response-text";
import { Shimmer } from "./shimmer";

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** Whole seconds the reasoning streamed for, or `undefined` before it is known. */
  duration: number | undefined;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export function useReasoning() {
  const context = useContext(ReasoningContext);
  if (!context) throw new Error("Reasoning components must be used within Reasoning");
  return context;
}

const AUTO_CLOSE_DELAY_MS = 1000;

export type ReasoningProps = Omit<CollapsibleProps, "open" | "defaultOpen" | "onOpenChange"> & {
  isStreaming?: boolean;
  open?: boolean;
  /** Default: open while streaming. `false` keeps it shut when streaming starts, as on the web. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Seconds, when the app knows them (a reloaded thread). Default: timed from `isStreaming`. */
  duration?: number;
};

/**
 * The AI's reasoning, folded. As on the web it opens when streaming starts,
 * times the stream, and closes once, a second after it stops. Unlike the web,
 * a reader can close it while it streams (the web reopens it), and a toggle
 * after the stream cancels the pending close, as `useStreamingDisclosure`.
 */
export function Reasoning({
  isStreaming = false,
  open,
  defaultOpen,
  onOpenChange,
  duration,
  className,
  ...props
}: ReasoningProps) {
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen ?? isStreaming,
    onChange: onOpenChange,
  });
  const [measured, setMeasured] = useState<number | undefined>(undefined);
  const [closeDue, setCloseDue] = useState(false);
  const startedAt = useRef<number | null>(isStreaming ? Date.now() : null);

  // Runs when the stream starts or stops, not on every open change, so a
  // reader's own close mid-stream holds.
  useEffect(() => {
    if (isStreaming) {
      if (startedAt.current === null) startedAt.current = Date.now();
      if (!isOpen && defaultOpen !== false) setOpen(true);
      setCloseDue(false);
    } else if (startedAt.current !== null) {
      setMeasured(Math.ceil((Date.now() - startedAt.current) / 1000));
      startedAt.current = null;
      if (isOpen) setCloseDue(true);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!closeDue) return;
    const timer = setTimeout(() => {
      setOpen(false);
      setCloseDue(false);
    }, AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [closeDue]);

  const setIsOpen = (next: boolean) => {
    setCloseDue(false);
    setOpen(next);
  };

  return (
    <ReasoningContext.Provider
      value={{ isStreaming, isOpen, setIsOpen, duration: duration ?? measured }}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn("mb-4", className)}
        {...props}
      />
    </ReasoningContext.Provider>
  );
}

/** "Thinking…" while streaming, then "Thought for 12s" ("Thought for a few seconds" with no duration). */
export function reasoningMessage(isStreaming: boolean, duration?: number): string {
  if (isStreaming) return "Thinking…";
  if (duration === undefined) return "Thought for a few seconds";
  return `Thought for ${formatElapsed(duration)}`;
}

export type ReasoningTriggerProps = CollapsibleTriggerProps & {
  /** Replaces `reasoningMessage`. A string, as it is also the accessibility label. */
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => string;
};

/** Brain icon, the shimmering "Thinking…" or "Thought for 12s", and a chevron: the web `ReasoningTrigger`. */
export function ReasoningTrigger({
  children,
  getThinkingMessage = reasoningMessage,
  className,
  ...props
}: ReasoningTriggerProps) {
  const { isStreaming, isOpen, duration } = useReasoning();
  const scheme = useScheme();
  const largerText = useLargerText();
  const message = getThinkingMessage(isStreaming, duration);
  const muted = tokens.color.muted[scheme];
  const iconSize = largerText ? 20 : 16;
  return (
    <CollapsibleTrigger
      accessibilityLabel={message}
      className={cn("w-full flex-row items-center gap-2 py-1", className)}
      {...props}
    >
      {children ?? (
        <>
          <IconBrain size={iconSize} color={muted} />
          {isStreaming ? (
            <Shimmer duration={1} numberOfLines={1}>
              {message}
            </Shimmer>
          ) : (
            <ResponseText size="small" tone="muted" selectable={false} numberOfLines={1} className="shrink">
              {message}
            </ResponseText>
          )}
          <CollapsibleChevron open={isOpen} size={iconSize} color={muted} />
        </>
      )}
    </CollapsibleTrigger>
  );
}

export type ReasoningContentProps = {
  children: string;
  className?: string;
};

/**
 * The reasoning text, muted and monospaced, on the web `rounded-lg
 * bg-surface-secondary/40 p-3` panel. Plain text: see `ResponseText` for
 * markdown.
 */
export function ReasoningContent({ children, className }: ReasoningContentProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("small", largerText);
  return (
    <CollapsibleContent className={cn("pb-1 pt-2", className)}>
      <View
        className="p-3"
        style={{
          borderRadius: tokens.radius.lg,
          backgroundColor: withAlpha(tokens.color.surfaceSecondary[scheme], 0.4),
        }}
      >
        <Text
          selectable
          className={size}
          style={[sizeStyle(size), textStyle("muted", scheme), { fontFamily: MONO_FONT }]}
        >
          {children}
        </Text>
      </View>
    </CollapsibleContent>
  );
}

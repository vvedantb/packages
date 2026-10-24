"use client";
import { useMemo } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { JumpRail, type JumpRailItem, type JumpRailProps } from "./jump-rail";

/** One rail tick: a user turn and the assistant reply to it. */
export interface ChatJumpRailMessage {
  id: string;
  content: string;
  reply?: string;
}

/** A transcript row, as input to `buildChatJumpRailTicks`. */
export interface ChatJumpRailTranscriptMessage {
  id: string;
  role: string;
  content: string;
  /** System alerts are skipped, both as ticks and as replies. */
  isSystemAlert?: boolean;
}

/**
 * One tick per user turn. The reply is the next assistant row before the next
 * user row; system alerts are skipped.
 */
export function buildChatJumpRailTicks(
  messages: readonly ChatJumpRailTranscriptMessage[],
): ChatJumpRailMessage[] {
  const ticks: ChatJumpRailMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!message || message.role !== "user" || message.isSystemAlert) continue;
    let reply: string | undefined;
    for (let j = i + 1; j < messages.length; j++) {
      const next = messages[j];
      if (!next || next.isSystemAlert) continue;
      if (next.role === "user") break;
      if (next.role === "assistant") {
        reply = next.content;
        break;
      }
    }
    ticks.push({
      id: message.id,
      content: message.content,
      ...(reply !== undefined && reply.length > 0 ? { reply } : {}),
    });
  }
  return ticks;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Maps chat ticks to rail items. `formatPreview` turns raw text into display
 * text (for example mention tokens to names); whitespace is collapsed after it.
 * An empty user text becomes "Message".
 */
export function buildChatJumpRailItems(
  messages: readonly ChatJumpRailMessage[],
  formatPreview: (text: string) => string = (text) => text,
): JumpRailItem[] {
  return messages.map((message) => {
    const title = collapseWhitespace(formatPreview(message.content));
    const reply = message.reply ? collapseWhitespace(formatPreview(message.reply)) : "";
    return {
      id: message.id,
      title: title.length > 0 ? title : "Message",
      preview: reply.length > 0 ? reply : null,
    };
  });
}

export interface ChatJumpRailProps
  extends Omit<
    JumpRailProps,
    "items" | "scrollRef" | "getScrollElement" | "onReveal" | "onBeforeScroll" | "observeKey"
  > {
  /** The whole transcript as ticks (see `buildChatJumpRailTicks`), rendered or not. */
  messages: readonly ChatJumpRailMessage[];
  /**
   * First row the transcript renders. A window that grows upwards has to
   * re-observe, so a change here does.
   */
  renderedFromId?: string;
  /** Renders an older turn outside the transcript window, then scrolls to it. */
  onRevealMessage?: (messageId: string) => void;
  /** Raw text to display text. Default: the text as is. */
  formatPreview?: (text: string) => string;
}

/**
 * `JumpRail` for a chat. Must render inside `<Conversation>` (StickToBottom):
 * it reads the scroll viewport and `stopScroll` from its context and resolves
 * `[data-message-id]` targets in it. Jumping to a turn that is not rendered
 * stops the stick-to-bottom scroll and calls `onRevealMessage`.
 */
export function ChatJumpRail({
  messages,
  renderedFromId,
  onRevealMessage,
  formatPreview,
  testId = "chat-jump-rail",
  ...rest
}: ChatJumpRailProps) {
  const { scrollRef, stopScroll } = useStickToBottomContext();
  // Memoised on `messages`, which keeps its identity while a turn streams.
  const items = useMemo(
    () => buildChatJumpRailItems(messages, formatPreview),
    [messages, formatPreview],
  );
  return (
    <JumpRail
      {...rest}
      testId={testId}
      items={items}
      scrollRef={scrollRef}
      observeKey={renderedFromId ?? null}
      onBeforeScroll={stopScroll}
      {...(onRevealMessage ? { onReveal: onRevealMessage } : {})}
    />
  );
}

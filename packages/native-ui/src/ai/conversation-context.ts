import { createContext, useContext, type RefObject } from "react";
import type { NativeScrollEvent } from "react-native";

// The `Conversation` context on its own, so a message can reach it without the
// thread's components (`message.tsx` reads `overlayOpen`).

/**
 * What the thread scrolls with: the `ScrollView` of `ConversationContent` or
 * the `FlatList` of `ConversationList`. `scrollToEnd` goes to the newest
 * message, which is offset 0 in an inverted list. `scrollTo` goes to an
 * offset; only the `ScrollView` has it, so call it as `scrollTo?.(...)`.
 */
export type ConversationScroller = {
  scrollToEnd: (options?: { animated?: boolean }) => void;
  scrollTo?: (options: { y: number; animated?: boolean }) => void;
};

export type ConversationContextValue = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  scrollRef: RefObject<ConversationScroller | null>;
  /** `bottomInset` and `inverted`, as `isScrolledToBottom`. */
  onScroll: (event: NativeScrollEvent, bottomInset?: number, inverted?: boolean) => void;
  onUserScroll: () => void;
  followContent: () => void;
  /** The height of the `ConversationDock` under the thread, 0 without one. */
  dockHeight: number;
  setDockHeight: (height: number) => void;
  /**
   * True while a message's hold menu is open. Its window takes the focus on
   * Android, and the keyboard handler of `ConversationList` would scroll the
   * thread to its end; frozen, the list stays where the reader left it.
   */
  overlayOpen: boolean;
  setOverlayOpen: (open: boolean) => void;
};

export const ConversationContext = createContext<ConversationContextValue | null>(null);

/** `isAtBottom` and `scrollToBottom` of the enclosing `Conversation`, for a custom scroll button. */
export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) throw new Error("Conversation parts must be used within Conversation");
  return context;
}

/** The enclosing `Conversation`, or null for a message drawn outside one. */
export function useOptionalConversation() {
  return useContext(ConversationContext);
}

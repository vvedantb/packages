import type { ReactNode } from "react";
import { KeyboardAvoidingView, View } from "react-native";
import { cn } from "../cn";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./conversation";

/**
 * The least `ChatThread` reads from a message: an id and a role. The `ai` SDK
 * `UIMessage` fits it, so the package takes no `ai` dependency.
 */
export type UIMessage = {
  id: string;
  role: "system" | "user" | "assistant";
};

export type ChatThreadProps<M extends UIMessage = UIMessage> = {
  messages: M[];
  /** True while a reply is on its way. Marks the last assistant message as streaming and shows `thinking`. */
  working: boolean;
  /** Draws one message. `isStreaming` is true for the last assistant message while `working`. */
  renderMessage: (message: M, isStreaming: boolean) => ReactNode;
  /** A row after the last user message while `working`, such as a `Shimmer` "Thinking". */
  thinking?: ReactNode;
  /** Shown in place of the list when there are no messages. */
  emptyState?: ReactNode;
  /** Last in the column, lifted over the keyboard. A `PromptInput`. */
  footer: ReactNode;
  /** Merged into the `ConversationContent` column classes (`gap-4 px-3 py-3`), such as `px-4 py-4`. */
  contentContainerClassName?: string;
  /** Height of anything above the thread, such as a navigation header, for the keyboard lift. Default 0. */
  keyboardVerticalOffset?: number;
  className?: string;
  testID?: string;
};

/** Index of the last message with `role`, or -1. A loop, not `findLastIndex` (Hermes). */
function lastIndexOfRole(messages: UIMessage[], role: UIMessage["role"]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]!.role === role) return index;
  }
  return -1;
}

/**
 * The chat column as one piece: `Conversation`, `ConversationContent`, the
 * messages, a `thinking` row right after the last user message while
 * `working`, `ConversationScrollButton` and the `footer` last. The whole
 * column sits in a `KeyboardAvoidingView` (`padding`, as `PromptInput`), which
 * also lifts the footer on Android edge-to-edge, where the window does not
 * resize. A `PromptInput` footer has its own `KeyboardAvoidingView`; the outer
 * lift moves it clear of the keyboard, so it adds no second lift.
 */
export function ChatThread<M extends UIMessage = UIMessage>({
  messages,
  working,
  renderMessage,
  thinking,
  emptyState,
  footer,
  contentContainerClassName,
  keyboardVerticalOffset = 0,
  className,
  testID,
}: ChatThreadProps<M>) {
  const lastUser = working ? lastIndexOfRole(messages, "user") : -1;
  const streaming = working ? lastIndexOfRole(messages, "assistant") : -1;

  return (
    <KeyboardAvoidingView
      testID={testID}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      className={cn("flex-1", className)}
    >
      <Conversation>
        <ConversationContent contentContainerClassName={contentContainerClassName}>
          {messages.length === 0
            ? emptyState
            : messages.map((message, index) => (
                <View key={message.id}>
                  {renderMessage(message, index === streaming)}
                  {index === lastUser && thinking != null ? (
                    <View className="mt-4">{thinking}</View>
                  ) : null}
                </View>
              ))}
        </ConversationContent>
        <ConversationScrollButton testID="chat-thread-scroll-bottom" />
      </Conversation>
      {footer}
    </KeyboardAvoidingView>
  );
}

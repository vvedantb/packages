"use client";
import type { ComponentProps } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconArrowDown, IconDownload } from "@tabler/icons-react";
import { Button } from "../ui/button";
import { cn } from "../utils/cn";
import { flatInteractiveClass } from "../ui/surface-classes";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { fastTransition } from "../motion/presets.app-b";
export type ConversationProps = ComponentProps<typeof StickToBottom>;
export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-hidden", className)}
    initial="instant"
    resize="smooth"
    role="log"
    {...props}
  />
);
export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;
export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("flex flex-col gap-4 px-3 py-3", className)}
    {...props}
  />
);
export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};
export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && <p className="text-muted text-sm">{description}</p>}
        </div>
      </>
    )}
  </div>
);
export type ConversationScrollButtonProps = ComponentProps<typeof Button>;
export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  const handleScrollToBottom = () => {
    scrollToBottom();
  };
  return (
    <AnimatePresence initial={false}>
      {isAtBottom ? null : (
        <motion.div
          key="scroll-to-bottom"
          className="absolute bottom-4 left-0 right-0 z-10 flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={fastTransition}
        >
          <Button
            className={cn(flatInteractiveClass, "rounded-full", className)}
            onClick={handleScrollToBottom}
            size="icon"
            type="button"
            variant="outline"
            {...props}
          >
            <IconArrowDown className="size-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export interface ConversationMessage {
  role: "user" | "assistant" | "system" | "data" | "tool";
  content: string;
}
export type ConversationDownloadProps = Omit<
  ComponentProps<typeof Button>,
  "onClick"
> & {
  messages: ConversationMessage[];
  filename?: string;
  formatMessage?: (message: ConversationMessage, index: number) => string;
};
const defaultFormatMessage = (message: ConversationMessage): string => {
  const roleLabel =
    message.role.charAt(0).toUpperCase() + message.role.slice(1);
  return `**${roleLabel}:** ${message.content}`;
};
export const messagesToMarkdown = (
  messages: ConversationMessage[],
  formatMessage: (
    message: ConversationMessage,
    index: number,
  ) => string = defaultFormatMessage,
): string => messages.map((msg, i) => formatMessage(msg, i)).join("\n\n");
export const ConversationDownload = ({
  messages,
  filename = "conversation.md",
  formatMessage = defaultFormatMessage,
  className,
  children,
  ...props
}: ConversationDownloadProps) => {
  const handleDownload = () => {
    const markdown = messagesToMarkdown(messages, formatMessage);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Button
      className={cn(
        cn(flatInteractiveClass, "absolute top-4 right-4 rounded-full"),
        className,
      )}
      onClick={handleDownload}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      {children ?? <IconDownload className="size-4" />}
    </Button>
  );
};

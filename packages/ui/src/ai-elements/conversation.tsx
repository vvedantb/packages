"use client";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import { IconArrowDown, IconDownload } from "@tabler/icons-react";
import { Button } from "../ui/button";
import { cn } from "../utils/cn";
import { flatInteractiveClass } from "../ui/surface-classes";
import { useCn, useUiConfig } from "../ui/ui-config";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { fastTransition } from "../motion/presets.alt";
type MotionDivProps = ComponentProps<typeof m.div>;
/**
 * `UiConfig.Conversation`. `classes` replace built-in classes: `content`
 * (`ConversationContent`), `scroll` (a default `scrollClassName`, merged
 * before the prop), `download`, and the scroll button's `scrollButton`,
 * `scrollButtonMotion` (the animated wrapper; `""` drops its class) and
 * `scrollButtonFrame` (a static wrapper around the presence, absent by
 * default). `scrollButton` holds the scroll button's prop defaults and
 * motion.
 */
export interface ConversationConfig {
  classes?: {
    content?: string;
    scroll?: string;
    download?: string;
    scrollButton?: string;
    scrollButtonMotion?: string;
    scrollButtonFrame?: string;
  };
  scrollButton?: Pick<ConversationScrollButtonProps, "label" | "icon" | "showDelay" | "size"> & {
    initial?: MotionDivProps["initial"];
    animate?: MotionDivProps["animate"];
    exit?: MotionDivProps["exit"];
    transition?: MotionDivProps["transition"];
  };
}
export type ConversationProps = ComponentProps<typeof StickToBottom>;
export const Conversation = ({ className, ...props }: ConversationProps) => {
  const merge = useCn();
  return (
    <StickToBottom
      className={merge("relative flex-1 overflow-y-hidden", className)}
      initial="instant"
      resize="smooth"
      role="log"
      {...props}
    />
  );
};
export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;
export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => {
  const classes = useUiConfig("Conversation")?.classes;
  const merge = useCn();
  const scroll = classes?.scroll;
  return (
    <StickToBottom.Content
      className={merge(classes?.content ?? "flex flex-col gap-4 px-3 py-3", className)}
      {...props}
      {...(scroll === undefined ? {} : { scrollClassName: merge(scroll, props.scrollClassName) })}
    />
  );
};
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
}: ConversationEmptyStateProps) => {
  const merge = useCn();
  return (
    <div
      className={merge(
        "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <div className="space-y-1">
            <h3 className="font-medium text-sm">{title}</h3>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
          </div>
        </>
      )}
    </div>
  );
};
export type ConversationScrollButtonProps = ComponentProps<typeof Button> & {
  /** Text after the icon; also the button's `aria-label` and `title`. */
  label?: string;
  /** Replaces the arrow icon. */
  icon?: ReactNode;
  /**
   * Wait this long (ms) after leaving the bottom before showing the button,
   * so brief layout settles do not flash it. Hiding is immediate. Default 0.
   */
  showDelay?: number;
  /**
   * When this changes (for example the thread id), hide the button at once and
   * cancel a pending show; it shows again on the next scroll away.
   */
  resetKey?: string;
};
/**
 * `wanted`, or (with a delay or reset key) `wanted` held for `delay` ms, and
 * a function that hides it at once.
 */
function useDelayedShow(
  wanted: boolean,
  delay: number,
  resetKey: string | undefined,
): [boolean, () => void] {
  const debounced = delay > 0 || resetKey !== undefined;
  const [shown, setShown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setShown(false);
  };
  // The reset also cancels the pending show timer, a side effect.
  useEffect(() => {
    if (!debounced) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setShown(false);
  }, [resetKey, debounced]);
  useEffect(() => {
    if (!debounced) return;
    if (!wanted) {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
      setShown(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setShown(true);
      timerRef.current = null;
    }, delay);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [wanted, delay, debounced]);
  return [debounced ? shown : wanted, debounced ? hide : () => {}];
}
export const ConversationScrollButton = ({
  className,
  label: labelProp,
  icon: iconProp,
  showDelay,
  resetKey,
  size,
  ...props
}: ConversationScrollButtonProps) => {
  const config = useUiConfig("Conversation");
  const defaults = config?.scrollButton;
  const classes = config?.classes;
  const merge = useCn();
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  const [visible, hide] = useDelayedShow(
    !isAtBottom,
    showDelay ?? defaults?.showDelay ?? 0,
    resetKey,
  );
  const label = labelProp ?? defaults?.label;
  const icon = iconProp ?? defaults?.icon;
  const handleScrollToBottom = () => {
    hide();
    scrollToBottom();
  };
  const motionClass = classes?.scrollButtonMotion ?? "absolute bottom-4 left-0 right-0 z-10 flex justify-center";
  const presence = (
    <LazyMotion features={domAnimation}>
      <AnimatePresence initial={false}>
        {visible ? (
          <m.div
            key="scroll-to-bottom"
            className={motionClass === "" ? undefined : motionClass}
            initial={defaults?.initial ?? { opacity: 0, y: 8 }}
            animate={defaults?.animate ?? { opacity: 1, y: 0 }}
            exit={defaults?.exit ?? { opacity: 0, y: 8 }}
            transition={defaults?.transition ?? fastTransition}
          >
            <Button
              className={merge(classes?.scrollButton ?? [flatInteractiveClass, "rounded-full"], className)}
              onClick={handleScrollToBottom}
              size={size ?? defaults?.size ?? "icon"}
              type="button"
              variant="outline"
              {...(label ? { "aria-label": label, title: label } : {})}
              {...props}
            >
              {icon ?? <IconArrowDown className="size-4" />}
              {label}
            </Button>
          </m.div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
  const frame = classes?.scrollButtonFrame;
  return frame === undefined ? presence : <div className={frame}>{presence}</div>;
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
  const download = useUiConfig("Conversation")?.classes?.download;
  const merge = useCn();
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
      className={merge(
        download ?? cn(flatInteractiveClass, "absolute top-4 right-4 rounded-full"),
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

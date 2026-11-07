import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";
import {
  IconCopy,
  IconRefresh,
  IconThumbDown,
  IconThumbUp,
  type IconProps,
} from "@tabler/icons-react-native";
import { cn } from "../cn";
import { sizeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";
import { ChatIconButton } from "./icon-button";
import { ChatTextColorContext, ResponseText } from "./response-text";

export type MessageRole = "user" | "assistant" | "system";

const MessageContext = createContext<MessageRole>("assistant");

export type MessageProps = ViewProps & {
  from: MessageRole;
  className?: string;
};

/**
 * One message: the web `w-full max-w-[95%] flex-col gap-2`. A user message
 * sits at the end of the row with its parts at the end; an assistant message
 * at the start, its parts full width.
 */
export function Message({ from, className, style, ...props }: MessageProps) {
  const user = from === "user";
  return (
    <MessageContext.Provider value={from}>
      <View
        className={cn("w-full max-w-[95%] gap-2", className)}
        style={[
          { alignSelf: user ? "flex-end" : "flex-start", alignItems: user ? "flex-end" : "stretch" },
          style,
        ]}
        {...props}
      />
    </MessageContext.Provider>
  );
}

/**
 * The web user bubble: `rounded-2xl rounded-br-md bg-primary` (radius 16 with
 * the bottom-right corner at 14, `tokens.radius.md`).
 */
export function userBubbleStyle(scheme: "light" | "dark") {
  return {
    backgroundColor: palette.primary[scheme],
    borderRadius: tokens.radius.lg,
    borderBottomRightRadius: tokens.radius.md,
  };
}

/**
 * A user bubble's look. `primary` is the web default (`bg-primary` with the
 * label colour). `tint` is the chat override Eva uses (`rounded-surface
 * bg-primary/10 px-3 py-2 text-foreground`): a 10% wash of the primary colour
 * with foreground text and every corner at 16.
 */
export type MessageBubble = "primary" | "tint";

/** The `tint` bubble: the primary colour at 10% alpha, radius 16 on every corner. */
export function tintBubbleStyle(scheme: "light" | "dark") {
  return {
    backgroundColor: withAlpha(palette.primary[scheme], 0.1),
    borderRadius: tokens.radius.lg,
  };
}

export type MessageContentProps = ViewProps & {
  /** User messages only. Default `"primary"`. */
  bubble?: MessageBubble;
  className?: string;
};

/**
 * The message body. A user message is a filled bubble: by default `px-4 py-3`
 * with the primary fill and label colour, or with `bubble="tint"` `px-3 py-2`
 * on a 10% primary wash with the foreground colour. An assistant message has
 * no fill and the foreground colour. A string child is drawn as
 * `ResponseText`, and `ResponseText` inside takes the colour.
 */
export function MessageContent({ children, bubble = "primary", className, style, ...props }: MessageContentProps) {
  const from = useContext(MessageContext);
  const scheme = useScheme();
  const user = from === "user";
  const tint = user && bubble === "tint";
  const color = user && !tint ? palette.primaryForeground[scheme] : tokens.color.foreground[scheme];
  const bubbleStyle = !user ? null : tint ? tintBubbleStyle(scheme) : userBubbleStyle(scheme);
  return (
    <ChatTextColorContext.Provider value={color}>
      <View
        className={cn("min-w-0 max-w-full gap-2", user && (tint ? "px-3 py-2" : "px-4 py-3"), className)}
        style={[bubbleStyle, style]}
        {...props}
      >
        {typeof children === "string" ? <ResponseText>{children}</ResponseText> : children}
      </View>
    </ChatTextColorContext.Provider>
  );
}

export type MessageMetaProps = { children: ReactNode; className?: string };

/**
 * The muted clock and duration after a message's actions, as Eva's web chat
 * (`text-2xs tabular-nums text-muted-foreground/60`, "10:21 PM · 1m"): the
 * caption size on phones, the muted colour at 60%, tabular figures.
 */
export function MessageMeta({ children, className }: MessageMetaProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("caption", largerText);
  return (
    <Text
      className={cn(size, "font-instrument-sans", className)}
      style={[sizeStyle(size), { color: withAlpha(tokens.color.muted[scheme], 0.6), fontVariant: ["tabular-nums"] }]}
    >
      {children}
    </Text>
  );
}

export type MessageActionsBarProps = ViewProps & { className?: string };

/** A row of `MessageAction`s under a message, as the web `flex items-center gap-1`. */
export function MessageActionsBar({ className, ...props }: MessageActionsBarProps) {
  return <View className={cn("flex-row items-center gap-1", className)} {...props} />;
}

/** The usual actions, with their icons and accessibility labels. */
export const MESSAGE_ACTIONS = {
  copy: { icon: IconCopy, label: "Copy" },
  retry: { icon: IconRefresh, label: "Retry" },
  like: { icon: IconThumbUp, label: "Good response" },
  dislike: { icon: IconThumbDown, label: "Bad response" },
} as const;

export type MessageActionKind = keyof typeof MESSAGE_ACTIONS;

export type MessageActionProps = {
  /** A preset icon and label from `MESSAGE_ACTIONS`. `icon` and `label` override it. */
  kind?: MessageActionKind;
  icon?: ComponentType<IconProps>;
  /** The accessibility label (the web `label` / `tooltip`). Required without `kind`. */
  label?: string;
  onPress?: () => void;
  /**
   * For feedback: the chosen action draws its icon in the foreground and
   * reports `selected` to VoiceOver and TalkBack.
   */
  selected?: boolean;
  disabled?: boolean;
  testID?: string;
};

/**
 * A ghost icon button under a message: the web `icon-sm` (32, 16 icon) with
 * the slop to 44. Copying is up to the app (`onPress`): React Native's own
 * `Clipboard` is deprecated, and native-ui adds no clipboard package.
 */
export function MessageAction({
  kind,
  icon,
  label,
  onPress,
  selected = false,
  disabled,
  testID,
}: MessageActionProps) {
  const scheme = useScheme();
  const preset = kind ? MESSAGE_ACTIONS[kind] : undefined;
  const Icon = icon ?? preset?.icon ?? IconCopy;
  return (
    <ChatIconButton
      icon={Icon}
      label={label ?? preset?.label ?? ""}
      iconColor={selected ? tokens.color.foreground[scheme] : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
    />
  );
}

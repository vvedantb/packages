import { createContext, useContext, type ComponentType } from "react";
import { View, type ViewProps } from "react-native";
import {
  IconCopy,
  IconRefresh,
  IconThumbDown,
  IconThumbUp,
  type IconProps,
} from "@tabler/icons-react-native";
import { cn } from "../cn";
import { palette } from "../palette";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
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

export type MessageContentProps = ViewProps & { className?: string };

/**
 * The message body. A user message is a filled bubble (`px-4 py-3`, the
 * primary fill and label colour); an assistant message has no fill and the
 * foreground colour. A string child is drawn as `ResponseText`, and
 * `ResponseText` inside takes the colour.
 */
export function MessageContent({ children, className, style, ...props }: MessageContentProps) {
  const from = useContext(MessageContext);
  const scheme = useScheme();
  const user = from === "user";
  const color = user ? palette.primaryForeground[scheme] : tokens.color.foreground[scheme];
  return (
    <ChatTextColorContext.Provider value={color}>
      <View
        className={cn("min-w-0 max-w-full gap-2", user && "px-4 py-3", className)}
        style={[user ? userBubbleStyle(scheme) : null, style]}
        {...props}
      >
        {typeof children === "string" ? <ResponseText>{children}</ResponseText> : children}
      </View>
    </ChatTextColorContext.Provider>
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

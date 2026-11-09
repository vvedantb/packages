import { createContext, useContext, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import {
  IconArrowBackUp,
  IconCopy,
  IconRefresh,
  IconThumbDown,
  IconThumbUp,
  type IconProps,
} from "@tabler/icons-react-native";
import { cn } from "../cn";
import { sizeStyle, typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";
import { ChatIconButton } from "./icon-button";
import { MessageActionSheet, type MessageSheetAction } from "./message-action-sheet";
import { ChatTextColorContext, ResponseText } from "./response-text";

export type MessageRole = "user" | "assistant" | "system";

const MessageContext = createContext<MessageRole>("assistant");

export type MessageProps = ViewProps & {
  from: MessageRole;
  className?: string;
  /**
   * Called on a long press of the message. Without it (and without `actions`)
   * the message is a plain `View`, as before.
   */
  onLongPress?: () => void;
  /**
   * Actions for a `MessageActionSheet` that opens on a long press, such as
   * Reply and Copy. `onLongPress` also runs, before the sheet opens.
   */
  actions?: MessageSheetAction[];
  /** Title of the action sheet. Default "Message actions". */
  actionSheetTitle?: string;
  /**
   * True while the message is the target of a quote tap: a primary wash that
   * fades over about 1.4 seconds, and a ring while it stays true. Set it back
   * to `false` after the scroll, about 1.5 seconds later.
   */
  highlighted?: boolean;
  /**
   * For group chats: which bot sent this message. Draws a `MessageBotLabel`
   * (avatar and name) above the content. Only when set; assistant messages only.
   */
  bot?: MessageBot;
};

/** The bot behind an incoming message in a group chat. */
export type MessageBot = { name: string; avatar?: ReactNode };

/** How long the highlight wash takes to fade, in milliseconds. */
export const MESSAGE_HIGHLIGHT_MS = 1400;

/** Peak opacity of the highlight wash (the primary colour). */
const HIGHLIGHT_WASH = 0.18;

function MessageHighlight() {
  const scheme = useScheme();
  const reduceMotion = useReduceMotion();
  const wash = useSharedValue(reduceMotion ? 0.5 : 1);
  useEffect(() => {
    if (reduceMotion) {
      wash.value = 0.5;
      return;
    }
    wash.value = 1;
    wash.value = withTiming(0, { duration: MESSAGE_HIGHLIGHT_MS });
  }, [wash, reduceMotion]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: wash.value }));
  return (
    <Animated.View
      testID="message-highlight"
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: tokens.radius.lg,
          borderWidth: 1.5,
          borderColor: withAlpha(palette.primary[scheme], 0.5),
          backgroundColor: withAlpha(palette.primary[scheme], HIGHLIGHT_WASH),
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * One message: the web `w-full max-w-[95%] flex-col gap-2`. A user message
 * sits at the end of the row with its parts at the end; an assistant message
 * at the start, its parts full width.
 *
 * With `onLongPress` or `actions` the message is a `Pressable` (same layout,
 * `className`, `style` and view props) and a long press opens the
 * `MessageActionSheet`. It stays a non-accessible container so its buttons and
 * links keep their own focus: also offer the actions in a `MessageActionsBar`
 * for screen reader users. `highlighted` draws the quote-jump highlight.
 */
export function Message({
  from,
  className,
  style,
  onLongPress,
  actions,
  actionSheetTitle,
  highlighted = false,
  bot,
  children,
  ...props
}: MessageProps) {
  const user = from === "user";
  const [sheetOpen, setSheetOpen] = useState(false);
  const hasActions = actions != null && actions.length > 0;
  const longPressable = onLongPress != null || hasActions;
  const layout: StyleProp<ViewStyle> = [
    { alignSelf: user ? "flex-end" : "flex-start", alignItems: user ? "flex-end" : "stretch" },
    style,
  ];
  const merged = cn("w-full max-w-[95%] gap-2", className);
  const parts = (
    <>
      {bot && !user ? <MessageBotLabel name={bot.name} avatar={bot.avatar} /> : null}
      {children}
      {highlighted ? <MessageHighlight /> : null}
    </>
  );
  return (
    <MessageContext.Provider value={from}>
      {longPressable ? (
        <>
          <Pressable
            accessible={false}
            className={merged}
            style={layout as never}
            onLongPress={() => {
              onLongPress?.();
              if (hasActions) setSheetOpen(true);
            }}
            {...props}
          >
            {parts}
          </Pressable>
          {hasActions ? (
            <MessageActionSheet
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              actions={actions}
              title={actionSheetTitle}
            />
          ) : null}
        </>
      ) : (
        <View className={merged} style={layout} {...props}>
          {parts}
        </View>
      )}
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

export type MessageBotLabelProps = {
  name: string;
  /** An avatar node, such as `<Avatar size="xs" />`. Drawn before the name. */
  avatar?: ReactNode;
  className?: string;
  testID?: string;
};

/**
 * Which bot sent a message, for group chats: an optional avatar and the name
 * in the caption size. `Message` draws it for its `bot` prop. To compose it
 * yourself, render it above `MessageContent` (for example in `renderMessage`).
 */
export function MessageBotLabel({ name, avatar, className, testID = "message-bot-label" }: MessageBotLabelProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("caption", largerText);
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`From ${name}`}
      className={cn("flex-row items-center gap-1.5", className)}
    >
      {avatar}
      <Text
        numberOfLines={1}
        className={cn(size, "font-instrument-sans-semibold")}
        style={[sizeStyle(size), typeStyle("semibold"), { color: tokens.color.muted[scheme] }]}
      >
        {name}
      </Text>
    </View>
  );
}

export type MessageContentProps = ViewProps & {
  /** User messages only. Default `"primary"`. */
  bubble?: MessageBubble;
  /** A `MessageQuote` drawn above the content, inside the bubble. */
  quote?: ReactNode;
  className?: string;
};

/**
 * The message body. A user message is a filled bubble: by default `px-4 py-3`
 * with the primary fill and label colour, or with `bubble="tint"` `px-3 py-2`
 * on a 10% primary wash with the foreground colour. An assistant message has
 * no fill and the foreground colour. A string child is drawn as
 * `ResponseText`, and `ResponseText` inside takes the colour.
 */
export function MessageContent({ children, bubble = "primary", quote, className, style, ...props }: MessageContentProps) {
  const from = useContext(MessageContext);
  const scheme = useScheme();
  const user = from === "user";
  const tint = user && bubble === "tint";
  const color = user && !tint ? palette.primaryForeground[scheme] : tokens.color.foreground[scheme];
  const bubbleStyle = !user ? null : tint ? tintBubbleStyle(scheme) : userBubbleStyle(scheme);
  const body = typeof children === "string" ? <ResponseText>{children}</ResponseText> : children;
  return (
    <ChatTextColorContext.Provider value={color}>
      <View
        className={cn("min-w-0 max-w-full gap-2", user && (tint ? "px-3 py-2" : "px-4 py-3"), className)}
        style={[bubbleStyle, style]}
        {...props}
      >
        {quote ? (
          <>
            {quote}
            {body}
          </>
        ) : (
          body
        )}
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
  reply: { icon: IconArrowBackUp, label: "Reply" },
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

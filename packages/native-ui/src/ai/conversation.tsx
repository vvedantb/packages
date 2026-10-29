import {
  createContext,
  useContext,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Platform,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import { IconArrowDown, type IconProps } from "@tabler/icons-react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { Button } from "../Button";
import { cn } from "../cn";
import { sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { NativeOnlyAnimatedView } from "../primitives/native-only-animated-view";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";

/** Within this many points of the end, the thread counts as at the bottom and keeps following new content. */
export const AT_BOTTOM_THRESHOLD = 70;

/** Whether a scroll position is within `AT_BOTTOM_THRESHOLD` of the end. Content shorter than the view is at the bottom. */
export function isScrolledToBottom({ contentOffset, contentSize, layoutMeasurement }: NativeScrollEvent) {
  return contentSize.height - layoutMeasurement.height - contentOffset.y <= AT_BOTTOM_THRESHOLD;
}

type ConversationContextValue = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  scrollRef: RefObject<ScrollView | null>;
  onScroll: (event: NativeScrollEvent) => void;
  onUserScroll: () => void;
  followContent: () => void;
};

const ConversationContext = createContext<ConversationContextValue | null>(null);

/** `isAtBottom` and `scrollToBottom` of the enclosing `Conversation`, for a custom scroll button. */
export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) throw new Error("Conversation parts must be used within Conversation");
  return context;
}

export type ConversationProps = ViewProps & { className?: string };

/**
 * The thread frame (web `relative flex-1`). It sticks to the bottom: while the
 * reader is at the end, new and growing messages stay in view; once they
 * scroll up, it stops following and `ConversationScrollButton` shows.
 */
export function Conversation({ className, ...props }: ConversationProps) {
  const reduceMotion = useReduceMotion();
  const scrollRef = useRef<ScrollView | null>(null);
  const atBottom = useRef(true);
  // Set while our own animated scroll heads down, so its first frames (not
  // yet at the bottom) do not count as the reader leaving.
  const autoScrolling = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const update = (next: boolean) => {
    atBottom.current = next;
    setIsAtBottom(next);
  };

  const value: ConversationContextValue = {
    isAtBottom,
    scrollRef,
    scrollToBottom: () => {
      autoScrolling.current = true;
      update(true);
      scrollRef.current?.scrollToEnd({ animated: !reduceMotion });
    },
    onScroll: (event) => {
      const bottom = isScrolledToBottom(event);
      if (bottom) autoScrolling.current = false;
      else if (autoScrolling.current) return;
      update(bottom);
    },
    onUserScroll: () => {
      autoScrolling.current = false;
    },
    // A jump, not an animation: streamed text grows the content many times a second.
    followContent: () => {
      if (atBottom.current) scrollRef.current?.scrollToEnd({ animated: false });
    },
  };

  return (
    <ConversationContext.Provider value={value}>
      <View className={cn("relative flex-1", className)} {...props} />
    </ConversationContext.Provider>
  );
}

export type ConversationContentProps = ScrollViewProps & { className?: string };

/**
 * The scrolling message column: the web `flex flex-col gap-4 px-3 py-3`. A
 * `ScrollView`; for very long threads an app can drive its own `FlatList`
 * with `useConversation`.
 */
export function ConversationContent({
  className,
  contentContainerClassName,
  onScroll,
  onScrollBeginDrag,
  onContentSizeChange,
  onLayout,
  ...props
}: ConversationContentProps) {
  const conversation = useConversation();
  return (
    <ScrollView
      ref={conversation.scrollRef}
      className={cn("flex-1", className)}
      contentContainerClassName={cn("gap-4 px-3 py-3", contentContainerClassName)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      scrollEventThrottle={16}
      {...props}
      onScroll={(event) => {
        conversation.onScroll(event.nativeEvent);
        onScroll?.(event);
      }}
      onScrollBeginDrag={(event) => {
        conversation.onUserScroll();
        onScrollBeginDrag?.(event);
      }}
      onContentSizeChange={(width, height) => {
        conversation.followContent();
        onContentSizeChange?.(width, height);
      }}
      // The keyboard or composer resizing the view keeps the end in view too.
      onLayout={(event) => {
        conversation.followContent();
        onLayout?.(event);
      }}
    />
  );
}

export type ConversationEmptyStateProps = ViewProps & {
  title?: string;
  description?: string;
  icon?: ComponentType<IconProps>;
  className?: string;
  children?: ReactNode;
};

/** Centred placeholder for a thread with no messages: the web title (medium) and muted description. */
export function ConversationEmptyState({
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon: Icon,
  className,
  children,
  ...props
}: ConversationEmptyStateProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("small", largerText);
  return (
    <View className={cn("flex-1 items-center justify-center gap-3 p-8", className)} {...props}>
      {children ?? (
        <>
          {Icon ? <Icon size={largerText ? 28 : 24} color={tokens.color.muted[scheme]} /> : null}
          <View className="items-center gap-1">
            <Text
              accessibilityRole="header"
              className={cn(size, "text-center font-instrument-sans-medium")}
              style={[sizeStyle(size), textStyle("foreground", scheme), typeStyle("medium")]}
            >
              {title}
            </Text>
            {description ? (
              <Text
                className={cn(size, "text-center font-instrument-sans")}
                style={[sizeStyle(size), textStyle("muted", scheme)]}
              >
                {description}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

export type ConversationScrollButtonProps = {
  /** The accessibility label. Default "Scroll to bottom". */
  label?: string;
  /** Replaces the down arrow. */
  icon?: ComponentType<IconProps>;
  testID?: string;
};

/**
 * Round outline arrow, centred 16 above the bottom of the `Conversation`,
 * shown while the reader is away from the end (the web `absolute bottom-4`).
 * The web `Button` `icon` size (40, slop to 48). It has an opaque surface
 * fill and no shadow, so it reads over the messages under it.
 */
export function ConversationScrollButton({
  label = "Scroll to bottom",
  icon: Icon = IconArrowDown,
  testID,
}: ConversationScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useConversation();
  const scheme = useScheme();
  const largerText = useLargerText();
  if (isAtBottom) return null;
  return (
    <NativeOnlyAnimatedView
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 16, alignItems: "center" }}
    >
      <Button
        variant="outline"
        size="icon"
        accessibilityLabel={label}
        onPress={scrollToBottom}
        testID={testID}
        style={{ borderRadius: tokens.radius.pill, backgroundColor: tokens.color.surface[scheme] }}
      >
        <Icon size={largerText ? 20 : 16} color={tokens.color.foreground[scheme]} />
      </Button>
    </NativeOnlyAnimatedView>
  );
}

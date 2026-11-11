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
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type FlatListProps,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import { IconArrowDown, type IconProps } from "@tabler/icons-react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { EASE_OUT } from "../motion";
import { Button } from "../Button";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, sizeStyle, textStyle, touchSlop, typeStyle } from "../controlStyles";
import { withAlpha } from "../palette";
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

/** What the thread scrolls with: the `ScrollView` of `ConversationContent` or the `FlatList` of `ConversationList`. */
export type ConversationScroller = { scrollToEnd: (options?: { animated?: boolean }) => void };

type ConversationContextValue = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  scrollRef: RefObject<ConversationScroller | null>;
  onScroll: (event: NativeScrollEvent) => void;
  onUserScroll: () => void;
  followContent: () => void;
  /** The height of the `ConversationDock` under the thread, 0 without one. */
  dockHeight: number;
  setDockHeight: (height: number) => void;
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
  const scrollRef = useRef<ConversationScroller | null>(null);
  const atBottom = useRef(true);
  // Set while our own animated scroll heads down, so its first frames (not
  // yet at the bottom) do not count as the reader leaving.
  const autoScrolling = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [dockHeight, setDockHeight] = useState(0);

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
    dockHeight,
    setDockHeight,
  };

  return (
    <ConversationContext.Provider value={value}>
      <View className={cn("relative flex-1", className)} {...props} />
    </ConversationContext.Provider>
  );
}

/** The scroll handlers a thread's scroller passes on, as `ScrollView` and `FlatList` both take them. */
type ConversationScrollHandlers = {
  onScroll?: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | null;
  onScrollBeginDrag?: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | null;
  onContentSizeChange?: ((width: number, height: number) => void) | null;
  onLayout?: ((event: LayoutChangeEvent) => void) | null;
};

/** Taps reach rows while the keyboard is up; a drag lowers it (interactively on iOS); scroll events at 60 Hz. */
const SCROLL_DEFAULTS: Pick<ScrollViewProps, "keyboardShouldPersistTaps" | "keyboardDismissMode" | "scrollEventThrottle"> = {
  keyboardShouldPersistTaps: "handled",
  keyboardDismissMode: Platform.OS === "ios" ? "interactive" : "on-drag",
  scrollEventThrottle: 16,
};

/**
 * The wiring `ConversationContent` and `ConversationList` share: the ref the
 * scroll button and the follow use, taps that reach rows while the keyboard is
 * up, and the handlers that track the bottom and follow new content. The
 * defaults come first so `props` can override them; the handlers come last
 * and call the app's own after the thread's.
 */
function useConversationScroll<P extends ConversationScrollHandlers>({
  onScroll,
  onScrollBeginDrag,
  onContentSizeChange,
  onLayout,
  ...props
}: P) {
  const conversation = useConversation();
  return {
    ref: (scroller: ConversationScroller | null) => {
      conversation.scrollRef.current = scroller;
    },
    ...SCROLL_DEFAULTS,
    ...props,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      conversation.onScroll(event.nativeEvent);
      onScroll?.(event);
    },
    onScrollBeginDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      conversation.onUserScroll();
      onScrollBeginDrag?.(event);
    },
    // The app's handler first, so a scroller that measures itself (`ConversationList`) has the new size to follow.
    onContentSizeChange: (width: number, height: number) => {
      onContentSizeChange?.(width, height);
      conversation.followContent();
    },
    // The keyboard or composer resizing the view keeps the end in view too.
    onLayout: (event: LayoutChangeEvent) => {
      onLayout?.(event);
      conversation.followContent();
    },
  };
}

export type ConversationContentProps = ScrollViewProps & { className?: string };

/**
 * The scrolling message column: the web `flex flex-col gap-4 px-3 py-3`. A
 * `ScrollView`, which draws every message; a thread that can grow long
 * should use `ConversationList`.
 */
export function ConversationContent({ className, contentContainerClassName, ...props }: ConversationContentProps) {
  return (
    <ScrollView
      className={cn("flex-1", className)}
      contentContainerClassName={cn("gap-4 px-3 py-3", contentContainerClassName)}
      {...useConversationScroll(props)}
    />
  );
}

export type ConversationListProps<T> = FlatListProps<T> & {
  className?: string;
  contentContainerClassName?: string;
};

/**
 * `ConversationContent` as a virtualised `FlatList`, for a thread that can
 * grow long: only the messages near the view are drawn. The same sticking to
 * the bottom, scroll button and keyboard behaviour. The column has the
 * `px-3 py-3` padding but no gap, as a `FlatList` gap would also space its
 * hidden-row placeholders: give `ItemSeparatorComponent` for the space
 * between messages, and a stable `keyExtractor`.
 *
 * It scrolls to the end it has measured, not with `FlatList.scrollToEnd`,
 * which places the end from estimated row heights (zero before the rows are
 * measured, so a thread opened at its end would stay at the top).
 */
export function ConversationList<T>({
  className,
  contentContainerClassName,
  onContentSizeChange,
  onLayout,
  ...props
}: ConversationListProps<T>) {
  const conversation = useConversation();
  // Sizes from the list's own events, for the scroll offset; no render reads them.
  const size = useRef({ content: 0, view: 0 });
  const wired = useConversationScroll({
    ...props,
    onContentSizeChange: (width: number, height: number) => {
      size.current.content = height;
      onContentSizeChange?.(width, height);
    },
    onLayout: (event: LayoutChangeEvent) => {
      size.current.view = event.nativeEvent.layout.height;
      onLayout?.(event);
    },
  });
  return (
    <FlatList
      className={cn("flex-1", className)}
      contentContainerClassName={cn("px-3 py-3", contentContainerClassName)}
      {...wired}
      ref={(list: FlatList<T> | null) => {
        conversation.scrollRef.current = list && {
          scrollToEnd: (options) =>
            list.scrollToOffset({ offset: Math.max(0, size.current.content - size.current.view), animated: options?.animated }),
        };
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

export type ConversationDockProps = ViewProps & { className?: string };

/**
 * The group under the thread, inside `Conversation` after the list: the
 * composer, or a docked question card in its place. `ConversationScrollButton`
 * sits centred 16 above its top edge (the web button's `bottom-4` over the
 * dock), so the button stays with the dock as it grows (a reply quote, a
 * taller field) and as the keyboard lifts it, instead of a fixed height over
 * the messages.
 */
export function ConversationDock({ onLayout, ...props }: ConversationDockProps) {
  const { setDockHeight } = useConversation();
  return (
    <View
      {...props}
      onLayout={(event) => {
        setDockHeight(event.nativeEvent.layout.height);
        onLayout?.(event);
      }}
    />
  );
}

export type ConversationScrollButtonProps = {
  /** The accessibility label, and the text with `showLabel`. Default "Scroll to bottom". */
  label?: string;
  /** Replaces the down arrow. */
  icon?: ComponentType<IconProps>;
  /**
   * Draw `label` after the icon in a compact pill, as the web button with a
   * `label` in Eva's chat ("Scroll to end": 28 high, `px-3`, `text-xs`
   * muted, a 60% border on the surface). Default `false`: the round arrow.
   */
  showLabel?: boolean;
  /**
   * The row the button centres in, full width by default. Inset a side (for
   * example `{ right: 10 }`) to centre it on a thread that sits off-centre.
   */
  insets?: { left?: number; right?: number };
  testID?: string;
};

/** The scroll button fades in and out on the strong ease-out. */
const SCROLL_BUTTON_ENTER = FadeIn.duration(150).easing(EASE_OUT);
const SCROLL_BUTTON_EXIT = FadeOut.duration(120).easing(EASE_OUT);

/** The labelled pill's height (web `h-7`). */
const SCROLL_PILL_HEIGHT = 28;

/**
 * Round outline arrow, centred 16 above the bottom of the `Conversation`, or
 * above its `ConversationDock` when it has one, shown while the reader is
 * away from the end (the web `absolute bottom-4`).
 * The web `Button` `icon` size (40, slop to 48). It has an opaque surface
 * fill and no shadow, so it reads over the messages under it. With
 * `showLabel`, a compact pill with the icon and `label`.
 */
export function ConversationScrollButton({
  label = "Scroll to bottom",
  icon: Icon = IconArrowDown,
  showLabel = false,
  insets,
  testID,
}: ConversationScrollButtonProps) {
  const { isAtBottom, scrollToBottom, dockHeight } = useConversation();
  const scheme = useScheme();
  const largerText = useLargerText();
  if (isAtBottom) return null;
  const caption = chatTextSize("caption", largerText);
  return (
    <NativeOnlyAnimatedView
      entering={SCROLL_BUTTON_ENTER}
      exiting={SCROLL_BUTTON_EXIT}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: insets?.left ?? 0,
        right: insets?.right ?? 0,
        bottom: dockHeight + 16,
        alignItems: "center",
      }}
    >
      {showLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={scrollToBottom}
          testID={testID}
          // Wider than 44 with its label; only the height needs slop.
          hitSlop={touchSlop(MIN_TOUCH_TARGET, SCROLL_PILL_HEIGHT)}
          style={({ pressed }) => ({
            minHeight: SCROLL_PILL_HEIGHT,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            borderRadius: tokens.radius.pill,
            borderWidth: 1,
            borderColor: withAlpha(tokens.color.border[scheme], 0.6),
            backgroundColor: tokens.color.surface[scheme],
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon size={largerText ? 20 : 16} color={tokens.color.muted[scheme]} />
          <Text className={cn(caption, "font-instrument-sans")} style={[sizeStyle(caption), textStyle("muted", scheme)]}>
            {label}
          </Text>
        </Pressable>
      ) : (
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
      )}
    </NativeOnlyAnimatedView>
  );
}

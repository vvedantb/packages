import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, sizeStyle, textStyle, touchSlop } from "../controlStyles";
import { palette } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";

export type SuggestionsProps = {
  /** `horizontal` (default) scrolls one row of chips; `vertical` stacks them full width. */
  orientation?: "horizontal" | "vertical";
  className?: string;
  /** Classes for the horizontal row inside the scroll view, after the web `gap-2 px-1`. */
  contentContainerClassName?: string;
  children?: ReactNode;
};

/**
 * Prompt suggestions. Horizontal is a `ScrollView` with no scroll bar (the web
 * row with its scroll arrows; a phone swipes instead).
 */
export function Suggestions({
  orientation = "horizontal",
  className,
  contentContainerClassName,
  children,
}: SuggestionsProps) {
  if (orientation === "vertical") {
    return <View className={cn("w-full gap-2", className)}>{children}</View>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className={cn("w-full grow-0", className)}
      contentContainerClassName={cn("items-center gap-2 px-1", contentContainerClassName)}
    >
      {children}
    </ScrollView>
  );
}

export type SuggestionProps = {
  suggestion: string;
  onPress?: (suggestion: string) => void;
  /** Replaces the text; the accessibility label stays `suggestion`. */
  children?: string;
  disabled?: boolean;
  testID?: string;
};

/** A `text-sm` line with the web `py-1.5`: 32 high. The slop brings it to 44. */
const CHIP_HEIGHT = 32;

/**
 * A round chip with the web suggestion look: `rounded-full border
 * bg-surface-secondary px-3 py-1.5 text-sm text-muted-foreground`. Pressed,
 * it takes the web hover (`bg-surface-tertiary text-foreground`).
 */
export function Suggestion({ suggestion, onPress, children, disabled, testID }: SuggestionProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("small", largerText);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={suggestion}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={touchSlop(MIN_TOUCH_TARGET, CHIP_HEIGHT)}
      onPress={() => onPress?.(suggestion)}
      className={cn("justify-center border", largerText ? "min-h-12 px-4 py-2" : "min-h-8 px-3 py-1.5", disabled && "opacity-45")}
      style={({ pressed }) => ({
        borderRadius: tokens.radius.pill,
        borderColor: tokens.color.border[scheme],
        backgroundColor: pressed ? palette.surfaceTertiary[scheme] : tokens.color.surfaceSecondary[scheme],
      })}
    >
      {({ pressed }) => (
        <Text
          className={cn(size, "font-instrument-sans")}
          style={[sizeStyle(size), textStyle(pressed ? "foreground" : "muted", scheme)]}
        >
          {children ?? suggestion}
        </Text>
      )}
    </Pressable>
  );
}

import { useContext } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, sizeStyle, textStyle, touchSlop, typeStyle } from "../controlStyles";
import { withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";
import { ChatTextColorContext } from "./response-text";

export type MessageQuoteProps = {
  /** Who wrote the quoted message, such as "You" or the bot name. */
  author: string;
  /** The quoted text. Shown on up to two lines. */
  text: string;
  /** Makes the quote a button, so the app can scroll to and highlight the original. */
  onPress?: () => void;
  /** Names the button. Default "Go to quoted message from {author}". Used with `onPress` only. */
  accessibilityLabel?: string;
  className?: string;
  testID?: string;
};

/** Lines of the quoted text before it is cut with an ellipsis. */
export const QUOTE_MAX_LINES = 2;

/**
 * A compact quote inside a message bubble, above the message text: a left
 * border, the author in the caption size and the quoted text on up to two
 * lines. It takes its colour from the enclosing `MessageContent`, so it reads
 * on the primary user bubble as well as on the tint and assistant ones. With
 * `onPress` it is a button (44 point minimum height).
 */
export function MessageQuote({
  author,
  text,
  onPress,
  accessibilityLabel,
  className,
  testID,
}: MessageQuoteProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const inherited = useContext(ChatTextColorContext);
  const color = inherited ?? textStyle("foreground", scheme).color;
  const caption = chatTextSize("caption", largerText);
  const body = chatTextSize("small", largerText);
  const content = (
    <>
      <Text
        numberOfLines={1}
        className={cn(caption, "font-instrument-sans-semibold")}
        style={[sizeStyle(caption), typeStyle("semibold"), { color: withAlpha(color, 0.75) }]}
      >
        {author}
      </Text>
      <Text
        numberOfLines={QUOTE_MAX_LINES}
        className={cn(body, "font-instrument-sans")}
        style={[sizeStyle(body), { color: withAlpha(color, 0.9) }]}
      >
        {text}
      </Text>
    </>
  );
  const style = {
    borderLeftWidth: 3,
    borderLeftColor: withAlpha(color, 0.45),
    borderRadius: 4,
  };
  if (!onPress) {
    return (
      <View
        testID={testID}
        accessible
        accessibilityLabel={`Quoted message from ${author}: ${text}`}
        className={cn("min-w-0 gap-0.5 py-0.5 pl-2.5", className)}
        style={style}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Go to quoted message from ${author}`}
      accessibilityHint={text}
      onPress={onPress}
      hitSlop={touchSlop(MIN_TOUCH_TARGET)}
      className={cn("min-h-11 min-w-0 justify-center gap-0.5 py-0.5 pl-2.5", className)}
      style={style}
    >
      {content}
    </Pressable>
  );
}

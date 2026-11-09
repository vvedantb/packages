import { Pressable, Text, View } from "react-native";
import { IconX } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, fieldStyle, sizeStyle, textStyle, touchSlop, typeStyle } from "../controlStyles";
import { palette } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";

export type ReplyQuoteChipProps = {
  /** Who wrote the message being replied to. */
  author: string;
  /** Its text. Shown on up to two lines. */
  text: string;
  /** Called when the X is pressed. Clear the reply in the app. */
  onDismiss?: () => void;
  /** Default "Replying to {author}". */
  accessibilityLabel?: string;
  /** Names the X button. Default "Dismiss reply quote". */
  dismissLabel?: string;
  className?: string;
  testID?: string;
};

/**
 * The chip above the composer while a reply is pending: a field-style
 * surface with a primary accent bar, the author, up to two lines of the
 * message and an X (44 point target). Pass it as `PromptInput` `replyTo`, or
 * as `header`.
 */
export function ReplyQuoteChip({
  author,
  text,
  onDismiss,
  accessibilityLabel,
  dismissLabel = "Dismiss reply quote",
  className,
  testID,
}: ReplyQuoteChipProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const caption = chatTextSize("caption", largerText);
  const body = chatTextSize("small", largerText);
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel ?? `Replying to ${author}`}
      accessibilityHint={text}
      className={cn("w-full flex-row items-center rounded-field border pl-3", className)}
      style={[
        fieldStyle(scheme),
        { backgroundColor: tokens.color.surfaceSecondary[scheme] },
      ]}
    >
      <View
        className="mr-2.5 self-stretch rounded-full"
        style={{ width: 3, marginVertical: 8, backgroundColor: palette.primary[scheme] }}
      />
      <View className="min-w-0 flex-1 py-2">
        <Text
          numberOfLines={1}
          className={cn(caption, "font-instrument-sans-semibold")}
          style={[sizeStyle(caption), typeStyle("semibold"), textStyle("muted", scheme)]}
        >
          {author}
        </Text>
        <Text
          numberOfLines={2}
          className={cn(body, "font-instrument-sans")}
          style={[sizeStyle(body), textStyle("foreground", scheme)]}
        >
          {text}
        </Text>
      </View>
      <Pressable
        testID={testID ? `${testID}-dismiss` : undefined}
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        onPress={onDismiss}
        hitSlop={touchSlop(MIN_TOUCH_TARGET)}
        className="items-center justify-center"
        style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
      >
        <IconX size={largerText ? 20 : 16} color={tokens.color.muted[scheme]} />
      </Pressable>
    </View>
  );
}

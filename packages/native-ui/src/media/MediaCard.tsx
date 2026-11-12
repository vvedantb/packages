import type { ComponentType, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { IconProps } from "@tabler/icons-react-native";
import { sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";

export type MediaCardProps = {
  icon: ComponentType<IconProps>;
  title: string;
  /** One muted line under the title. */
  description?: string;
  /** Makes the whole card one button. Then leave `action` out: a button cannot hold another. */
  onPress?: () => void;
  /** A control at the end, such as a delete button, for a card that is not itself a button. */
  action?: ReactNode;
  /** A glyph at the end of a pressable card, such as an open-in-browser arrow. Decorative. */
  trailingIcon?: ComponentType<IconProps>;
  /** Fill. Default `tokens.color.surface` (the web `bg-card`). */
  backgroundColor?: string;
  /** Title colour. Default the theme foreground. */
  color?: string;
  /** Icon and description colour. Default the theme muted. */
  mutedColor?: string;
  /** Names the pressable card. Default `title`. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
};

/**
 * A card for one thing a turn produced, such as a saved file or a report: an
 * icon, a title and a muted line, on the surface fill at the surface radius
 * (the web `Surface density="tight"`). It is at least 56 high. With `onPress`
 * the whole card is a button that fades while pressed; otherwise `action`
 * holds its control.
 */
export function MediaCard({
  icon: Icon,
  title,
  description,
  onPress,
  action,
  trailingIcon: Trailing,
  backgroundColor,
  color,
  mutedColor,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: MediaCardProps) {
  const scheme = useScheme();
  const muted = mutedColor ?? tokens.color.muted[scheme];
  const body = (
    <>
      <Icon size={18} color={muted} />
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="font-instrument-sans-medium"
          style={[sizeStyle("text-sm"), typeStyle("medium"), color ? { color } : textStyle("foreground", scheme)]}
        >
          {title}
        </Text>
        {description ? (
          <Text numberOfLines={1} className="font-instrument-sans" style={[sizeStyle("text-xs"), { color: muted }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {Trailing ? <Trailing size={16} color={muted} /> : null}
    </>
  );
  const frame = {
    minHeight: 56,
    borderRadius: tokens.radius.lg,
    backgroundColor: backgroundColor ?? tokens.color.surface[scheme],
  };
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        className="flex-row items-center gap-3 p-3 active:opacity-70"
        style={frame}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View testID={testID} className="flex-row items-center gap-3 p-3" style={frame}>
      {body}
      {action}
    </View>
  );
}

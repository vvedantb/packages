import { Children, type ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";
import { cn } from "./cn";
import { cardStyle, textStyle, typeStyle } from "./controlStyles";
import { AnimatedPressable, usePressScale } from "./pressScale";
import { StatusDot } from "./StatusDot";
import { Spinner } from "./Spinner";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export type PinnedBotTileProps = {
  /** The bot name, under the avatar. Up to two lines. */
  title: string;
  /** The avatar, above the name. */
  leading: ReactNode;
  /** Shows an unread dot at the top start and adds "unread" to the label. */
  unread?: boolean;
  /** Shows a spinner at the top end and adds "generating" to the label. It can show with the unread dot. */
  generating?: boolean;
  onPress: () => void;
  /** Opens actions on a long press. */
  onLongPress?: () => void;
  testID?: string;
};

/**
 * A large pinned-bot tile: the avatar above the name on a `Card` fill, an
 * unread dot or a generating spinner at the top end. At least 112 high, so it
 * is a comfortable touch target in a `BotPinGrid`. The tile is one button named
 * by the title, plus "unread" or "generating".
 */
export function PinnedBotTile({ title, leading, unread = false, generating = false, onPress, onLongPress, testID }: PinnedBotTileProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const press = usePressScale();
  const state = [unread ? "unread" : null, generating ? "generating" : null].filter(Boolean).join(", ");
  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={state ? `${title}, ${state}` : title}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      className={cn("min-w-0 items-center justify-center gap-2 px-3 py-4", largerText ? "min-h-36" : "min-h-28")}
      style={[cardStyle(scheme), press.style]}
    >
      {leading}
      <Text
        numberOfLines={2}
        className={cn("text-center font-instrument-sans-medium", largerText ? "text-lg" : "text-base")}
        style={[textStyle("foreground", scheme), typeStyle("medium")]}
      >
        {title}
      </Text>
      {unread ? (
        <View className="absolute left-3 top-3" testID={testID ? `${testID}-unread` : undefined}>
          <StatusDot tone="active" size="md" />
        </View>
      ) : null}
      {generating ? (
        <View className="absolute right-3 top-3" testID={testID ? `${testID}-generating` : undefined}>
          <Spinner size="sm" decorative />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

export type BotPinGridProps = ViewProps & {
  /** `PinnedBotTile`s. */
  children?: ReactNode;
  className?: string;
};

/**
 * Lays `PinnedBotTile`s out two across, wrapping to new rows, with a 12 gap. A
 * lone last tile keeps half the width. Each child gets a half-width cell.
 */
export function BotPinGrid({ children, className, ...props }: BotPinGridProps) {
  const cells = Children.toArray(children);
  return (
    <View className={cn("flex-row flex-wrap gap-3", className)} {...props}>
      {cells.map((child, index) => (
        <View key={(child as { key?: string | null }).key ?? index} className="min-w-0" style={{ flexBasis: "47%", flexGrow: 1, maxWidth: "50%" }}>
          {child}
        </View>
      ))}
    </View>
  );
}

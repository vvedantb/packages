import type { ComponentType, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { IconProps } from "@tabler/icons-react-native";
import { NEUTRAL_500 } from "./colors";
import { cn } from "./cn";
import { textStyle, typeStyle } from "./controlStyles";
import { FLOATING_ROW_RADIUS } from "./floating";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export type ListRowProps = {
  title: string;
  meta?: string;
  detail?: ReactNode;
  icon?: ComponentType<IconProps>;
  iconColor?: string;
  /** Any node at the start, such as an `Avatar` with an unread dot. Shown in place of `icon`. */
  leading?: ReactNode;
  /** At the end of the title line, such as a `Badge` or a time. The title is cut off first. */
  titleEnd?: ReactNode;
  /** At the end of the row, inside the pressable area. */
  right?: ReactNode;
  /**
   * At the end of the row, outside the pressable area, such as a `Switch`:
   * pressing it does not call `onPress`.
   */
  control?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Names the pressable row. Default `title`. */
  accessibilityLabel?: string;
  onCanvas?: boolean;
  /** On the pressable area when there is a `control`, so a test can press it. */
  testID?: string;
};

/**
 * A list row: an icon or `leading` node, a title with optional `titleEnd`,
 * `meta` and `detail` lines, and `right` content. With `onPress` or
 * `onLongPress` the row is a button named by `title`. A `control` sits beside
 * the pressable area, not in it.
 */
export function ListRow({
  title,
  meta,
  detail,
  icon: Icon,
  iconColor = NEUTRAL_500,
  leading,
  titleEnd,
  right,
  control,
  onPress,
  onLongPress,
  accessibilityLabel,
  onCanvas = false,
  testID,
}: ListRowProps) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const titleText = (
    <Text
      numberOfLines={2}
      className={cn(
        "font-instrument-sans-semibold",
        largerText ? "text-xl" : "text-lg",
        titleEnd != null && "min-w-0 flex-1",
      )}
      style={[textStyle("foreground", scheme), typeStyle("semibold")]}
    >
      {title}
    </Text>
  );
  const content = (
    <>
      {leading != null ? (
        <View className="shrink-0">{leading}</View>
      ) : Icon ? (
        <Icon size={largerText ? 30 : 26} color={iconColor} />
      ) : null}
      <View className="min-w-0 flex-1">
        {titleEnd != null ? (
          <View className="flex-row items-center gap-2">
            {titleText}
            <View className="shrink-0">{titleEnd}</View>
          </View>
        ) : (
          titleText
        )}
        {meta ? (
          <Text
            className={cn(
              "font-instrument-sans",
              largerText ? "text-lg" : "text-base",
            )}
            style={textStyle("muted", scheme)}
          >
            {meta}
          </Text>
        ) : null}
        {detail}
      </View>
      {right}
    </>
  );
  const pressable = Boolean(onPress || onLongPress);
  const height = largerText ? "min-h-[72px]" : "min-h-16";
  const paddingY = largerText ? "py-4" : "py-3";
  const fill = onCanvas ? "bg-surface" : "bg-surface-secondary";
  const rowStyle = { borderRadius: FLOATING_ROW_RADIUS };

  if (control != null) {
    // The control is a sibling of the pressable area, so its presses stay its own.
    const bodyClassName = cn("min-w-0 flex-1 flex-row items-center gap-3 self-stretch pl-4 pr-3", paddingY);
    return (
      <View className={cn("flex-row items-center", height, fill)} style={rowStyle}>
        {pressable ? (
          <Pressable
            testID={testID}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            onPress={onPress}
            onLongPress={onLongPress}
            className={cn(bodyClassName, "active:opacity-70")}
          >
            {content}
          </Pressable>
        ) : (
          <View testID={testID} className={bodyClassName}>
            {content}
          </View>
        )}
        <View className="shrink-0 pr-4">{control}</View>
      </View>
    );
  }

  const className = cn("flex-row items-center gap-3 px-4", height, paddingY, fill);
  if (!pressable) {
    return (
      <View testID={testID} className={className} style={rowStyle}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      onLongPress={onLongPress}
      className={cn(className, "active:opacity-70")}
      style={rowStyle}
    >
      {content}
    </Pressable>
  );
}

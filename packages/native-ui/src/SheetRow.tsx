import type { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import { IconCheck, type IconProps } from "@tabler/icons-react-native";
import { cn } from "./cn";
import { sizeStyle, textStyle, typeStyle } from "./controlStyles";
import { palette } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type SheetRowProps = {
  /** A Tabler icon at the start. */
  icon?: ComponentType<IconProps>;
  title: string;
  /** Muted line under the title, also the accessibility hint. */
  detail?: string;
  /** The current choice: a check at the end, and `selected` for assistive tech. */
  active?: boolean;
  /** A destructive action: title and icon in `palette.danger`. */
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
};

/**
 * One action in a `Sheet` or bottom sheet, a touch size of the web menu item:
 * icon, title and optional detail, at least 56 high (64 with larger text) with
 * the `ListRow` padding (`px-4 py-3`). While pressed it takes the web menu
 * item highlight (`bg-default`). `danger` draws the title and icon in the
 * danger colour; `active` adds a check; `disabled` dims it to 50%, as the web
 * item, and ignores presses.
 */
export function SheetRow({
  icon: Icon,
  title,
  detail,
  active = false,
  danger = false,
  disabled = false,
  onPress,
  testID,
}: SheetRowProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const color = danger ? palette.danger[scheme] : tokens.color.foreground[scheme];
  const titleSize = largerText ? "text-xl" : "text-base";
  const detailSize = largerText ? "text-lg" : "text-sm";
  const iconSize = largerText ? 26 : 22;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 px-4 py-3",
        largerText ? "min-h-16" : "min-h-14",
        disabled && "opacity-50",
      )}
      style={({ pressed }) => ({
        borderRadius: tokens.radius.sm,
        backgroundColor: pressed && !disabled ? palette.default[scheme] : "transparent",
      })}
    >
      {Icon ? <Icon size={iconSize} color={color} /> : null}
      <View className="min-w-0 flex-1">
        <Text
          className={cn("font-instrument-sans-medium", titleSize)}
          style={[{ color }, sizeStyle(titleSize), typeStyle("medium")]}
        >
          {title}
        </Text>
        {detail ? (
          <Text
            className={cn("font-instrument-sans", detailSize)}
            style={[textStyle("muted", scheme), sizeStyle(detailSize)]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {active ? <IconCheck size={iconSize} color={color} strokeWidth={2} /> : null}
    </Pressable>
  );
}

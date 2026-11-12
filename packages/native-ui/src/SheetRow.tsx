import type { ComponentType, ReactNode } from "react";
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
  /** At the start in place of `icon`: a mark that is not a Tabler icon, such as `ProviderIcon`. */
  leading?: ReactNode;
  title: string;
  /** Muted line under the title, also the accessibility hint. */
  detail?: string;
  /**
   * Makes the row one choice of a picker: `true` draws a check at the end.
   * Set (`true` or `false`) on every row of the picker, so assistive tech
   * reads each as a `radio` (a `checkbox` with `multiple`) with `checked`.
   * Leave it out on an action row.
   */
  active?: boolean;
  /** A picker where several rows can be on at once (or a single on/off row): `checkbox`, not `radio`. */
  multiple?: boolean;
  /** A destructive action: title and icon in `palette.danger`. */
  danger?: boolean;
  /** The web `text-warning` item (such as Archive): title and icon in `palette.warning`. */
  warning?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
};

/**
 * One action in a `Sheet` or bottom sheet, a touch size of the web menu item:
 * icon (or another `leading` mark), title and optional detail, at least 56 high (64 with larger text) with
 * the `ListRow` padding (`px-4 py-3`). While pressed it takes the web menu
 * item highlight (`bg-default`). `danger` draws the title and icon in the
 * danger colour, `warning` in the warning colour; `active` makes it a choice with a check; `disabled` dims it to 50%, as the web
 * item, and ignores presses.
 */
export function SheetRow({
  icon: Icon,
  leading,
  title,
  detail,
  active,
  multiple = false,
  danger = false,
  warning = false,
  disabled = false,
  onPress,
  testID,
}: SheetRowProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const color = danger
    ? palette.danger[scheme]
    : warning
      ? palette.warning[scheme]
      : tokens.color.foreground[scheme];
  const titleSize = largerText ? "text-xl" : "text-base";
  const detailSize = largerText ? "text-lg" : "text-sm";
  const iconSize = largerText ? 26 : 22;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={active === undefined ? "button" : multiple ? "checkbox" : "radio"}
      accessibilityLabel={title}
      accessibilityHint={detail}
      accessibilityState={active === undefined ? { disabled } : { disabled, checked: active }}
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
      {leading ?? (Icon ? <Icon size={iconSize} color={color} /> : null)}
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

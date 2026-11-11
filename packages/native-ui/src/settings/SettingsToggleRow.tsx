import { Pressable, View, Text } from "react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { useLargerText } from "../theme";
import { useScheme } from "../useScheme";
import { relaxedSizeStyle } from "./relaxedSizeStyle";

/**
 * One row in a `SettingsSection` list, the web `SettingsToggleRow`: title
 * `text-sm` medium (14 / 20 / 500), description `text-xs leading-relaxed`
 * (12 / 19.5), muted; one step up each with larger text. The web action column
 * is `min-h-10` (40); this one keeps the 44 touch target.
 *
 * With `onCheckedChange` the whole row is the switch, as `LabeledSwitchRow`
 * (the web `<label htmlFor>`): at least 56 high, one `switch` for TalkBack
 * named by the title, with the `action` switch hidden from it.
 */
export function SettingsToggleRow({
  title,
  description,
  action,
  checked,
  onCheckedChange,
  disabled = false,
  accessibilityLabel,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action: React.ReactNode;
  /** The switch state, for the row's `switch` role. */
  checked?: boolean;
  /** Makes the whole row toggle `checked`. */
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** The row's name when `title` is not a string. */
  accessibilityLabel?: string;
  className?: string;
}) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const titleSize = largerText ? "text-base" : "text-sm";
  const descriptionSize = largerText ? "text-sm" : "text-xs";
  const content = (
    <>
      <View className="min-w-0 flex-1">
        {typeof title === "string" ? (
          <Text
            className={cn("font-instrument-sans-medium", titleSize)}
            style={[textStyle("foreground", scheme), sizeStyle(titleSize), typeStyle("medium")]}
          >
            {title}
          </Text>
        ) : (
          title
        )}
        {description != null ? (
          typeof description === "string" ? (
            <Text
              className={cn("mt-1 font-instrument-sans", descriptionSize, "leading-relaxed")}
              style={[textStyle("muted", scheme), relaxedSizeStyle(descriptionSize)]}
            >
              {description}
            </Text>
          ) : (
            description
          )
        ) : null}
      </View>
      <View
        className="shrink-0 items-center justify-center"
        style={{ minHeight: MIN_TOUCH_TARGET }}
        // The row is the accessible switch, so the one inside is hidden from assistive tech.
        accessibilityElementsHidden={onCheckedChange != null}
        importantForAccessibility={onCheckedChange ? "no-hide-descendants" : "auto"}
      >
        {action}
      </View>
    </>
  );
  const rowClass = "flex-row items-center justify-between gap-4 px-4 py-3";
  if (!onCheckedChange) return <View className={cn(rowClass, className)}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={typeof title === "string" ? title : accessibilityLabel}
      accessibilityHint={typeof description === "string" ? description : undefined}
      accessibilityState={{ checked: Boolean(checked), disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      className={cn(rowClass, "min-h-14", className)}
    >
      {content}
    </Pressable>
  );
}

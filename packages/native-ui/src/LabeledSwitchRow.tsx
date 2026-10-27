import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "./cn";
import { Switch } from "./Switch";
import { useLargerText } from "./theme";

export type LabeledSwitchRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  icon?: ReactNode;
  /** Replaces the switch. */
  trailing?: ReactNode;
  className?: string;
  testID?: string;
};

/**
 * Label, optional description and a `Switch`, as the web `LabeledSwitchRow`.
 * The text toggles the switch too (the web `<label htmlFor>`). Use
 * `SettingsToggleRow` inside a `SettingsSection` list instead.
 */
export function LabeledSwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  icon,
  trailing,
  className,
  testID,
}: LabeledSwitchRowProps) {
  const largerText = useLargerText();
  const toggle = () => onCheckedChange?.(!checked);
  return (
    <View className={cn("flex-row items-center justify-between gap-3", className)}>
      <Pressable
        testID={testID}
        accessibilityRole={trailing ? undefined : "switch"}
        accessibilityLabel={label}
        accessibilityHint={description}
        accessibilityState={
          trailing ? undefined : { checked, disabled: Boolean(disabled) }
        }
        disabled={disabled || trailing != null}
        onPress={toggle}
        className="min-w-0 flex-1 flex-row items-start gap-2"
      >
        {icon ? <View className="mt-0.5 shrink-0">{icon}</View> : null}
        <View className="min-w-0 flex-1">
          <Text
            className={cn(
              "font-instrument-sans-semibold text-foreground",
              largerText ? "text-xl" : "text-lg",
              disabled && "opacity-70",
            )}
          >
            {label}
          </Text>
          {description ? (
            <Text
              className={cn(
                "mt-1 font-instrument-sans text-muted-foreground",
                largerText ? "text-lg" : "text-base",
              )}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {trailing ?? (
        // The row above is the accessible switch, so this one is hidden from assistive tech.
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="min-h-12 shrink-0 items-center justify-center"
        >
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
          />
        </View>
      )}
    </View>
  );
}

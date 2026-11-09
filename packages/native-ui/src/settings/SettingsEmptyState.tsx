import type { ComponentType, ReactNode } from "react";
import { Text, View } from "react-native";
import type { IconProps } from "@tabler/icons-react-native";
import { textStyle, typeStyle } from "../controlStyles";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";

export type SettingsEmptyStateProps = {
  title: string;
  description?: string;
  /** Optional icon above the title, as on the web. */
  icon?: ComponentType<IconProps>;
  /** Below the text, such as a `Button`. */
  action?: ReactNode;
  testID?: string;
};

/**
 * A compact empty note for the inside of a `SettingsSection` (web
 * `SettingsEmptyState`): centred title, muted description and an optional
 * action, with no large icon. Use `EmptyState` for a whole screen.
 */
export function SettingsEmptyState({ title, description, icon: Icon, action, testID }: SettingsEmptyStateProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  return (
    <View testID={testID} className="items-center gap-1 px-2 py-4">
      {Icon ? <Icon size={largerText ? 24 : 20} color={tokens.color.muted[scheme]} /> : null}
      <Text
        className="text-center font-instrument-sans-semibold text-base"
        style={[textStyle("foreground", scheme), typeStyle("semibold")]}
      >
        {title}
      </Text>
      {description ? (
        <Text className="text-center font-instrument-sans text-sm" style={textStyle("muted", scheme)}>
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-2">{action}</View> : null}
    </View>
  );
}

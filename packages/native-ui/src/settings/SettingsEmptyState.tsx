import type { ComponentType, ReactNode } from "react";
import { Text, View } from "react-native";
import type { IconProps } from "@tabler/icons-react-native";
import { sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { relaxedSizeStyle } from "./relaxedSizeStyle";

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
 * The empty note for the inside of a `SettingsSection` (web
 * `SettingsEmptyState`): an optional muted icon (28, half opacity), a centred
 * `text-sm` medium title (14 / 20 / 500), a muted `text-xs leading-relaxed`
 * description (12 / 19.5) and an optional action, in `px-4 py-16`. Use
 * `EmptyState` for a whole screen.
 */
export function SettingsEmptyState({ title, description, icon: Icon, action, testID }: SettingsEmptyStateProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  return (
    <View testID={testID} className="items-center justify-center px-4 py-16">
      {Icon ? (
        <View className="mb-5 opacity-50">
          <Icon size={largerText ? 32 : 28} color={tokens.color.muted[scheme]} />
        </View>
      ) : null}
      <Text
        className="text-center font-instrument-sans-medium text-sm"
        style={[textStyle("foreground", scheme), sizeStyle("text-sm"), typeStyle("medium")]}
      >
        {title}
      </Text>
      {description ? (
        <Text
          className="mt-2 max-w-sm text-center font-instrument-sans text-xs leading-relaxed"
          style={[textStyle("muted", scheme), relaxedSizeStyle("text-xs")]}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-6">{action}</View> : null}
    </View>
  );
}

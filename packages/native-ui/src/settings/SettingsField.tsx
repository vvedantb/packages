import { View, Text } from "react-native";
import { sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { useScheme } from "../useScheme";
import { relaxedSizeStyle } from "./relaxedSizeStyle";

/**
 * One labelled control in a `SettingsSection` body, the web stacked
 * `SettingsField`: label `text-sm` medium (14 / 20 / 500) above the control,
 * help text `text-xs leading-relaxed` (12 / 19.5), muted, below it.
 */
export function SettingsField({
  label,
  description,
  children,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const scheme = useScheme();
  return (
    <View>
      {typeof label === "string" ? (
        <Text
          className="mb-2 text-sm font-instrument-sans-medium"
          style={[textStyle("foreground", scheme), sizeStyle("text-sm"), typeStyle("medium")]}
        >
          {label}
        </Text>
      ) : (
        label
      )}
      {children}
      {description != null ? (
        typeof description === "string" ? (
          <Text
            className="mt-1.5 text-xs leading-relaxed font-instrument-sans"
            style={[textStyle("muted", scheme), relaxedSizeStyle("text-xs")]}
          >
            {description}
          </Text>
        ) : (
          description
        )
      ) : null}
    </View>
  );
}

import { View, Text } from "react-native";
import { textStyle, typeStyle } from "../controlStyles";
import { useScheme } from "../useScheme";

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
          className="mb-2 text-base font-instrument-sans-semibold"
          style={[textStyle("foreground", scheme), typeStyle("semibold")]}
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
            className="mt-1.5 text-sm font-instrument-sans"
            style={textStyle("muted", scheme)}
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

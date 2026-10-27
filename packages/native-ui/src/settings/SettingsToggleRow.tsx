import { View, Text } from "react-native";
import { cn } from "../cn";
import { textStyle, typeStyle } from "../controlStyles";
import { useLargerText } from "../theme";
import { useScheme } from "../useScheme";

export function SettingsToggleRow({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action: React.ReactNode;
  className?: string;
}) {
  const largerText = useLargerText();
  const scheme = useScheme();
  return (
    <View
      className={cn(
        "flex-row items-center justify-between gap-4 px-4 py-3",
        largerText ? "min-h-[72px]" : "min-h-16",
        className,
      )}
    >
      <View className="min-w-0 flex-1">
        {typeof title === "string" ? (
          <Text
            className={cn(
              "font-instrument-sans-semibold",
              largerText ? "text-xl" : "text-lg",
            )}
            style={[textStyle("foreground", scheme), typeStyle("semibold")]}
          >
            {title}
          </Text>
        ) : (
          title
        )}
        {description != null ? (
          typeof description === "string" ? (
            <Text
              className={cn(
                "mt-1 font-instrument-sans",
                largerText ? "text-lg" : "text-base",
              )}
              style={textStyle("muted", scheme)}
            >
              {description}
            </Text>
          ) : (
            description
          )
        ) : null}
      </View>
      <View className={cn("shrink-0 items-center justify-center", "min-h-12")}>
        {action}
      </View>
    </View>
  );
}

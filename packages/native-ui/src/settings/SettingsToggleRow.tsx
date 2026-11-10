import { View, Text } from "react-native";
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
 */
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
  const titleSize = largerText ? "text-base" : "text-sm";
  const descriptionSize = largerText ? "text-sm" : "text-xs";
  return (
    <View className={cn("flex-row items-center justify-between gap-4 px-4 py-3", className)}>
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
      <View className="shrink-0 items-center justify-center" style={{ minHeight: MIN_TOUCH_TARGET }}>
        {action}
      </View>
    </View>
  );
}

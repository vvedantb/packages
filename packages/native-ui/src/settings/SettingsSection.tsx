import { View, Text } from "react-native";
import { cn } from "../cn";
import { textStyle } from "../controlStyles";
import { FloatingSurface } from "../FloatingSurface";
import { useScheme } from "../useScheme";

type SettingsSectionBodyVariant = "form" | "list" | "compact";

export function SettingsSection({
  title,
  description,
  action,
  footer,
  children,
  bodyVariant = "form",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  bodyVariant?: SettingsSectionBodyVariant;
  className?: string;
}) {
  const scheme = useScheme();
  const hasBody = children != null;
  const hasCard = hasBody || footer != null;

  return (
    <View className={cn("flex-col gap-2", className)}>
      <View className="flex-row items-start justify-between gap-4 px-4">
        <View className="min-w-0 flex-1">
          {typeof title === "string" ? (
            <Text
              className="text-lg font-instrument-sans-bold"
              style={textStyle("foreground", scheme)}
            >
              {title}
            </Text>
          ) : (
            title
          )}
          {description != null ? (
            typeof description === "string" ? (
              <Text
                className="mt-0.5 text-base font-instrument-sans"
                style={textStyle("muted", scheme)}
              >
                {description}
              </Text>
            ) : (
              description
            )
          ) : null}
        </View>
        {action != null ? <View className="shrink-0">{action}</View> : null}
      </View>

      {hasCard ? (
        <FloatingSurface>
          {hasBody ? (
            <View
              className={
                bodyVariant === "list"
                  ? "flex-col"
                  : bodyVariant === "compact"
                    ? "px-4 py-3"
                    : "px-4 py-5"
              }
            >
              {children}
            </View>
          ) : null}
          {footer != null ? (
            <View className="flex-row items-center justify-end gap-2 bg-background px-4 py-3">
              {footer}
            </View>
          ) : null}
        </FloatingSurface>
      ) : null}
    </View>
  );
}

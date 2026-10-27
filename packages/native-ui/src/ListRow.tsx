import type { ComponentType, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { IconProps } from "@tabler/icons-react-native";
import { NEUTRAL_500 } from "./colors";
import { cn } from "./cn";
import { textStyle, typeStyle } from "./controlStyles";
import { FLOATING_ROW_RADIUS } from "./floating";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export function ListRow({
  title,
  meta,
  detail,
  icon: Icon,
  iconColor = NEUTRAL_500,
  right,
  onPress,
  onCanvas = false,
  testID,
}: {
  title: string;
  meta?: string;
  detail?: ReactNode;
  icon?: ComponentType<IconProps>;
  iconColor?: string;
  right?: ReactNode;
  onPress?: () => void;
  onCanvas?: boolean;
  testID?: string;
}) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const content = (
    <>
      {Icon ? <Icon size={largerText ? 30 : 26} color={iconColor} /> : null}
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={2}
          className={cn(
            "font-instrument-sans-semibold",
            largerText ? "text-xl" : "text-lg",
          )}
          style={[textStyle("foreground", scheme), typeStyle("semibold")]}
        >
          {title}
        </Text>
        {meta ? (
          <Text
            className={cn(
              "font-instrument-sans",
              largerText ? "text-lg" : "text-base",
            )}
            style={textStyle("muted", scheme)}
          >
            {meta}
          </Text>
        ) : null}
        {detail}
      </View>
      {right}
    </>
  );
  const className = cn(
    "flex-row items-center gap-3 px-4",
    largerText ? "min-h-[72px] py-4" : "min-h-16 py-3",
    onCanvas ? "bg-surface" : "bg-surface-secondary",
  );
  const rowStyle = { borderRadius: FLOATING_ROW_RADIUS };

  if (!onPress) {
    return (
      <View testID={testID} className={className} style={rowStyle}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className={cn(className, "active:opacity-70")}
      style={rowStyle}
    >
      {content}
    </Pressable>
  );
}

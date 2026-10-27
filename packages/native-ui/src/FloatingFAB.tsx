import type { ReactNode } from "react";
import { Platform, Pressable, View } from "react-native";
import { cn } from "./cn";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingSurface } from "./FloatingSurface";
import { useAccentColor, useLargerText } from "./theme";
import {
  FLOATING_INSET,
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_HEIGHT_LARGE,
} from "./floating";

export function FloatingFAB({
  onPress,
  label,
  testID,
  children,
}: {
  onPress: () => void;
  label: string;
  testID?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const largerText = useLargerText();
  const accentColor = useAccentColor();
  const size = largerText ? 64 : 56;
  const tabBar = largerText
    ? FLOATING_TAB_BAR_HEIGHT_LARGE
    : FLOATING_TAB_BAR_HEIGHT;

  return (
    <View
      pointerEvents="box-none"
      className={cn("z-10", Platform.OS === "web" ? "fixed" : "absolute")}
      style={{
        right: insets.right + FLOATING_INSET,
        bottom: FLOATING_INSET + Math.max(insets.bottom, 8) + tabBar + 20,
      }}
    >
      <FloatingSurface radius={size / 2} blur={false}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          className="items-center justify-center"
          style={({ pressed }) => ({
            width: size,
            height: size,
            backgroundColor: accentColor,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {children}
        </Pressable>
      </FloatingSurface>
    </View>
  );
}

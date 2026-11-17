import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import { cn } from "./cn";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingSurface } from "./FloatingSurface";
import { AnimatedPressable, usePressScale } from "./pressScale";
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
  const press = usePressScale({ scale: 0.95 });
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
        <AnimatedPressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          // Layout in `style` and no `className`: NativeWind drops a function
          // `style` next to a `className`, and the press scale and dim come
          // from the animated style, not a function style.
          style={[
            {
              alignItems: "center",
              justifyContent: "center",
              width: size,
              height: size,
              backgroundColor: accentColor,
            },
            press.style,
          ]}
        >
          {children}
        </AnimatedPressable>
      </FloatingSurface>
    </View>
  );
}

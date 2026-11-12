import { Platform } from "react-native";
import { tokens } from "./tokens";

export const FLOATING_INSET = tokens.spacing.unit;
export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_HEIGHT_LARGE = 72;
export const FLOATING_RADIUS = tokens.radius.card;
/**
 * List rows: 20, the field radius before 0.3.3 (web fields are 10). Toasts
 * used it until 0.3.12 and the upgrade card until 0.3.8; both are 16 now.
 */
export const FLOATING_ROW_RADIUS = 20;
export const FLOATING_PILL_RADIUS = tokens.radius.pill;

const FLOATING_BOX_SHADOW = "0px 8px 24px rgba(10, 10, 10, 0.12)";

/**
 * Only the shadow keys, not `ViewStyle`: an Expo-widened `ViewStyle`
 * (`position: "fixed"`, `backgroundImage`) is not assignable to a React
 * Native 0.88 View `style`. A plain inferred type would be `{}` and lose
 * `floatingShadow.shadowColor` and the rest for callers.
 */
type FloatingShadowStyle = {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  boxShadow?: string;
};

export const floatingShadow: FloatingShadowStyle =
  Platform.select({
    ios: {
      shadowColor: "#0a0a0a",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    default: {
      boxShadow: FLOATING_BOX_SHADOW,
    },
  }) ?? {};

export const floatingHairline = tokens.color.hairline;

export const floatingFill = tokens.color.fill;

/** The `tokens.color.surface` pair itself, so `configureTheme` reaches it. */
export const floatingSolidFill = tokens.color.surface;

/**
 * Where `FloatingTabBar` sits: `FLOATING_INSET` in from the screen sides (and,
 * in landscape, the notch) and above the home indicator. `BulkActionBar` with
 * `placement="tabBar"` takes the same slot while the tab bar hides.
 */
export function tabBarSlotStyle(insets: { left: number; right: number; bottom: number }): {
  position: "absolute";
  left: number;
  right: number;
  bottom: number;
} {
  return {
    position: "absolute",
    left: insets.left + FLOATING_INSET,
    right: insets.right + FLOATING_INSET,
    bottom: FLOATING_INSET + Math.max(insets.bottom, 8),
  };
}

/** The height of `FloatingTabBar`, and of `BulkActionBar` in its slot. */
export function tabBarHeight(largerText: boolean) {
  return largerText ? FLOATING_TAB_BAR_HEIGHT_LARGE : FLOATING_TAB_BAR_HEIGHT;
}

export function tabBarReserve(largerText: boolean, bottomInset: number) {
  return tabBarHeight(largerText) + FLOATING_INSET + Math.max(bottomInset, 8) + 28;
}

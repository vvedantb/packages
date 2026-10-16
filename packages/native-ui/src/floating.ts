import { Platform, type ViewStyle } from "react-native";
import { tokens } from "./tokens";

export const FLOATING_INSET = tokens.spacing.unit;
export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_HEIGHT_LARGE = 72;
export const FLOATING_RADIUS = tokens.radius.card;
export const FLOATING_ROW_RADIUS = tokens.radius.field;
export const FLOATING_PILL_RADIUS = tokens.radius.pill;

const FLOATING_BOX_SHADOW = "0px 8px 24px rgba(10, 10, 10, 0.12)";

export const floatingShadow: ViewStyle =
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

export const floatingSolidFill = {
  light: tokens.color.surface.light,
  dark: tokens.color.surface.dark,
} as const;

export function tabBarReserve(largerText: boolean, bottomInset: number) {
  const bar = largerText
    ? FLOATING_TAB_BAR_HEIGHT_LARGE
    : FLOATING_TAB_BAR_HEIGHT;
  return bar + FLOATING_INSET + Math.max(bottomInset, 8) + 28;
}

import { forwardRef, type ComponentRef, type ComponentType } from "react";
import { View } from "react-native";
import type { IconProps } from "@tabler/icons-react-native";
import { touchSlop } from "./controlStyles";
import { AnimatedPressable, usePressScale } from "./pressScale";
import { withAlpha } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type IconButtonVariant = "default" | "overlay";
export type IconButtonSize = "sm" | "md" | "lg";

export type IconButtonProps = {
  icon: ComponentType<IconProps>;
  /** Names the button for VoiceOver and TalkBack; it has no text. */
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** `overlay` is for camera chrome over a live preview. Default `default`. */
  variant?: IconButtonVariant;
  /** `sm` 32, `md` 40, `lg` 48 across. Default `md`. */
  size?: IconButtonSize;
  testID?: string;
  /** Default: the foreground in `default`, white in `overlay`. */
  iconColor?: string;
};

/** Diameter and icon size per size, a step up with larger text. */
const METRICS = {
  regular: { sm: [32, 16], md: [40, 20], lg: [48, 24] },
  larger: { sm: [44, 20], md: [48, 24], lg: [56, 28] },
} as const;

/** Fill, border and icon colour per variant. */
export function iconButtonColors(variant: IconButtonVariant, scheme: "light" | "dark") {
  return variant === "overlay"
    ? {
        backgroundColor: withAlpha(tokens.color.black, 0.35),
        borderColor: withAlpha(tokens.color.white, 0.2),
        color: tokens.color.white,
      }
    : {
        backgroundColor: tokens.color.surface[scheme],
        borderColor: tokens.color.border[scheme],
        color: tokens.color.foreground[scheme],
      };
}

/**
 * A round icon-only button. `default` is a bordered surface, like
 * `HeaderIconButton` in `tokens` colours. `overlay` is a translucent black
 * circle with a white icon, the same in light and dark, for camera chrome over
 * a live preview (close, flash, flip). Sizes are the web icon buttons (`sm`
 * 32, `md` 40) and 48, each reaching 44 with its hit slop. Not the AI chat
 * `ChatIconButton`.
 */
export const IconButton = forwardRef<ComponentRef<typeof View>, IconButtonProps>(function IconButton({
  icon: Icon,
  label,
  onPress,
  disabled = false,
  variant = "default",
  size = "md",
  testID,
  iconColor,
}, ref) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const [diameter, iconSize] = METRICS[largerText ? "larger" : "regular"][size];
  const { color, ...frame } = iconButtonColors(variant, scheme);
  const press = usePressScale({ restOpacity: disabled ? 0.5 : 1, disabled });
  return (
    <View ref={ref} collapsable={false} style={{ width: diameter, height: diameter }}>
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={touchSlop(diameter)}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      className="items-center justify-center"
      style={[{ width: diameter, height: diameter, borderRadius: diameter / 2, borderWidth: 1, ...frame }, press.style]}
    >
      <Icon size={iconSize} color={iconColor ?? color} />
    </AnimatedPressable>
    </View>
  );
});

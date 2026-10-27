import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { PINK_600 } from "./colors";
import { ActivityIndicator, View } from "react-native";
import { Button as PrimitiveButton } from "./primitives/button";
import { Text as PrimitiveText } from "./primitives/text";
import { cn } from "./cn";
import { buttonColors, type ButtonVariant } from "./controlStyles";
import { floatingShadow } from "./floating";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

/** `sm`, `default` and `lg` are the web names for `small`, `medium` and `large`. `icon` is a square button. */
type ButtonSize = "small" | "medium" | "large" | "sm" | "default" | "lg" | "icon";

interface ButtonProps extends Omit<
  React.ComponentPropsWithoutRef<typeof PrimitiveButton>,
  "variant" | "size" | "children" | "onPress"
> {
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof MaterialIcons.glyphMap;
  leftIcon?: React.ReactNode;
  /** Web name for `leftIcon`. `leftIcon` wins when both are set. */
  startContent?: React.ReactNode;
  /** Rendered after the label. */
  endContent?: React.ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  fullWidth?: boolean;
  children?: React.ReactNode;
  shadowType?: "flat" | "shadow";
  className?: string;
}

const SIZE_ALIAS = {
  small: "small",
  medium: "medium",
  large: "large",
  sm: "small",
  default: "medium",
  lg: "large",
  icon: "icon",
} as const;

// `regular` is the web `Button` (`sm` h-8 px-3, `default` h-10 px-4, `lg`
// h-11 px-6, `icon` h-10 w-10). `larger` is the larger-text step-up, unchanged
// from 0.3.2.
const HEIGHT = {
  regular: {
    small: "h-8 px-3",
    medium: "h-10 px-4",
    large: "h-11 px-6",
    icon: "h-10 w-10 px-0",
  },
  larger: {
    small: "h-14 px-5",
    medium: "h-16 px-6",
    large: "h-[72px] px-6",
    icon: "h-14 w-14 px-0",
  },
};

const TEXT = {
  regular: { small: "text-xs", medium: "text-sm", large: "text-sm", icon: "text-sm" },
  larger: { small: "text-base", medium: "text-xl", large: "text-2xl", icon: "text-base" },
};

// The web sizes are under the 44 pt touch target; the slop brings each to 48.
const HIT_SLOP = {
  regular: { small: 8, medium: 4, large: 2, icon: 4 },
  larger: { small: 8, medium: undefined, large: undefined, icon: 8 },
};

/** Web `rounded-lg` (`--radius`, 16). A style, because apps' NativeWind themes set their own `rounded-lg`. */
const RADIUS = tokens.radius.lg;

// Colours come from `buttonColors` as styles, except `tinted`, which keeps
// the pink classes that `outline` used before 0.3.0.
const VARIANT_CLASS: Partial<Record<ButtonVariant, string>> = {
  link: "h-auto border-0 px-0",
  tinted: "border-0 bg-pink-50 dark:bg-pink-900/20",
};

const TEXT_CLASS: Partial<Record<ButtonVariant, string>> = {
  link: "underline",
  tinted: "text-pink-700 dark:text-pink-300",
};

const PRIMITIVE_VARIANT = {
  primary: "default",
  default: "default",
  outline: "outline",
  secondary: "secondary",
  destructive: "destructive",
  ghost: "ghost",
  link: "link",
  tinted: "secondary",
} as const;

export type { ButtonProps, ButtonSize, ButtonVariant };

export function Button({
  onPress,
  variant = "primary",
  icon,
  leftIcon,
  startContent,
  endContent,
  loading,
  size = "medium",
  fullWidth = true,
  children,
  shadowType = "shadow",
  className,
  ...props
}: ButtonProps) {
  const scale = useLargerText() ? "larger" : "regular";
  const scheme = useScheme();
  const resolvedSize = SIZE_ALIAS[size];
  const colors = buttonColors(variant, scheme);
  const contentColor = colors?.color ?? PINK_600;
  const elevate =
    shadowType === "shadow" && (variant === "primary" || variant === "default");
  const baseStyle = [
    { borderRadius: RADIUS },
    elevate ? floatingShadow : null,
    colors
      ? { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor }
      : null,
  ];
  const callerStyle = props.style;

  return (
    <PrimitiveButton
      onPress={onPress}
      variant={PRIMITIVE_VARIANT[variant]}
      hitSlop={HIT_SLOP[scale][resolvedSize]}
      className={cn(
        "relative border",
        HEIGHT[scale][resolvedSize],
        // Column flex children stretch by default (React Native Web too), so
        // a button that is not full width must opt out with `self-start`.
        resolvedSize !== "icon" && (fullWidth ? "w-full" : "self-start"),
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
      disabled={loading || props.disabled}
      accessibilityState={{
        ...props.accessibilityState,
        disabled: Boolean(loading || props.disabled),
        busy: Boolean(loading),
      }}
      style={
        typeof callerStyle === "function"
          ? (state) => [baseStyle, callerStyle(state)]
          : [baseStyle, callerStyle]
      }
    >
      <View className="flex-row items-center justify-center gap-2">
        {loading ? (
          <ActivityIndicator size="small" color={contentColor} />
        ) : (
          <>
            {leftIcon ??
              startContent ??
              (icon ? (
                <MaterialIcons
                  name={icon}
                  size={scale === "larger" ? 26 : 16}
                  color={contentColor}
                />
              ) : null)}
            {typeof children === "string" || typeof children === "number" ? (
              <PrimitiveText
                className={cn(
                  TEXT[scale][resolvedSize],
                  "font-instrument-sans-medium",
                  TEXT_CLASS[variant],
                )}
                style={colors ? { color: colors.color } : undefined}
              >
                {children}
              </PrimitiveText>
            ) : (
              children
            )}
            {endContent}
          </>
        )}
      </View>
    </PrimitiveButton>
  );
}

import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { PINK_600 } from "./colors";
import { ActivityIndicator, View } from "react-native";
import { Button as PrimitiveButton } from "./primitives/button";
import { Text as PrimitiveText } from "./primitives/text";
import { cn } from "./cn";
import { floatingShadow } from "./floating";
import { palette } from "./palette";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

/**
 * `primary` and `default` are the same (`default` is the web name). `outline`
 * keeps the native pink tint; the web `outline` (a bordered neutral button) is
 * closest to `secondary` here.
 */
type ButtonVariant =
  | "primary"
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "ghost"
  | "link";

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

const HEIGHT = {
  regular: {
    small: "h-12 px-5",
    medium: "h-14 px-6",
    large: "h-16 px-6",
    icon: "h-12 w-12 px-0",
  },
  larger: {
    small: "h-14 px-5",
    medium: "h-16 px-6",
    large: "h-[72px] px-6",
    icon: "h-14 w-14 px-0",
  },
};

const TEXT = {
  regular: { small: "text-sm", medium: "text-lg", large: "text-xl", icon: "text-sm" },
  larger: { small: "text-base", medium: "text-xl", large: "text-2xl", icon: "text-base" },
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "",
  default: "",
  outline: "border-0 bg-pink-50 dark:bg-pink-900/20",
  secondary: "bg-neutral-100 dark:bg-neutral-800",
  destructive: "border-0",
  ghost: "border-0 bg-transparent",
  link: "h-auto border-0 bg-transparent px-0",
};

const TEXT_CLASS: Record<ButtonVariant, string> = {
  primary: "text-white",
  default: "text-white",
  outline: "text-pink-700 dark:text-pink-300",
  secondary: "text-pink-700 dark:text-pink-300",
  destructive: "text-white",
  ghost: "text-foreground",
  link: "text-foreground underline",
};

const PRIMITIVE_VARIANT = {
  primary: "default",
  default: "default",
  outline: "secondary",
  secondary: "secondary",
  destructive: "destructive",
  ghost: "ghost",
  link: "link",
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
  const contentColor =
    variant === "outline" || variant === "secondary"
      ? PINK_600
      : variant === "ghost" || variant === "link"
        ? tokens.color.foreground[scheme]
        : "#fff";
  const elevate =
    shadowType === "shadow" && (variant === "primary" || variant === "default");
  const variantStyle =
    variant === "destructive" ? { backgroundColor: palette.destructive } : null;

  return (
    <PrimitiveButton
      onPress={onPress}
      variant={PRIMITIVE_VARIANT[variant]}
      hitSlop={resolvedSize === "small" || resolvedSize === "icon" ? 8 : undefined}
      className={cn(
        "relative rounded-full border border-white/40 dark:border-white/10",
        HEIGHT[scale][resolvedSize],
        fullWidth && resolvedSize !== "icon" && "w-full",
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
        typeof props.style === "function"
          ? props.style
          : [elevate ? floatingShadow : null, variantStyle, props.style]
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
                  size={scale === "larger" ? 26 : 22}
                  color={contentColor}
                />
              ) : null)}
            {typeof children === "string" || typeof children === "number" ? (
              <PrimitiveText
                className={cn(
                  TEXT[scale][resolvedSize],
                  "font-instrument-sans-semibold",
                  TEXT_CLASS[variant],
                )}
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

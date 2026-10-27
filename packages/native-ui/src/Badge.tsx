import type { ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";
import { cn } from "./cn";
import { typeStyle } from "./controlStyles";
import { palette, withAlpha } from "./palette";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

/** The web `Badge` variants. */
export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "destructive-soft"
  | "outline"
  | "success"
  | "warning";

export type BadgeProps = ViewProps & {
  variant?: BadgeVariant;
  className?: string;
  /** Extra classes for the label when `children` is a string or number. */
  textClassName?: string;
  children?: ReactNode;
};

type Scheme = "light" | "dark";

/** Border, fill and text colours per variant, from the web classes (`border-danger/25 bg-danger/12 text-danger` and so on). */
export function badgeColors(variant: BadgeVariant, scheme: Scheme) {
  const tone = (hex: string, border: number, fill: number) => ({
    borderColor: withAlpha(hex, border),
    backgroundColor: withAlpha(hex, fill),
    color: hex,
  });
  switch (variant) {
    case "secondary":
      return {
        borderColor: tokens.color.separator[scheme],
        backgroundColor: palette.default[scheme],
        color: palette.defaultForeground[scheme],
      };
    case "destructive":
      return tone(palette.danger[scheme], 0.25, 0.12);
    case "destructive-soft":
      return {
        borderColor: tokens.color.border[scheme],
        backgroundColor: withAlpha(palette.danger[scheme], 0.1),
        color: palette.danger[scheme],
      };
    case "outline":
      return {
        borderColor: tokens.color.separator[scheme],
        backgroundColor: "transparent",
        color: tokens.color.muted[scheme],
      };
    case "success":
      return tone(palette.success[scheme], 0.25, 0.12);
    case "warning":
      return tone(palette.warning[scheme], 0.25, 0.12);
    default:
      return {
        borderColor: tokens.color.border[scheme],
        backgroundColor: palette.default[scheme],
        color: tokens.color.foreground[scheme],
      };
  }
}

/** Small rounded status label, with the web `Badge` variant names and colours. */
export function Badge({
  variant = "default",
  className,
  textClassName,
  children,
  style,
  ...props
}: BadgeProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const { color, ...frame } = badgeColors(variant, scheme);
  return (
    <View
      className={cn(
        "flex-row items-center gap-1 self-start rounded-full border px-2.5 py-1",
        className,
      )}
      style={[frame, style]}
      {...props}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          className={cn(
            "font-instrument-sans-medium",
            largerText ? "text-base" : "text-sm",
            textClassName,
          )}
          style={[{ color }, typeStyle("medium")]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

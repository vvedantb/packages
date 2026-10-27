import { Text, type TextProps } from "react-native";
import { cn } from "./cn";
import { sizeStyle, textStyle, typeStyle } from "./controlStyles";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export type LabelProps = TextProps & {
  className?: string;
  /** Dims the label (the web `peer-disabled` style). */
  disabled?: boolean;
};

/**
 * Field label, the web `Label` type: `text-sm` medium (14 / 500), `text-lg`
 * with larger text. Link it to a field with
 * `nativeID` here and `accessibilityLabelledBy` on the field (Android), or
 * give the field its own `accessibilityLabel`. The colour is a style that
 * follows the colour scheme; recolour with `style`.
 */
export function Label({ className, disabled, style, ...props }: LabelProps) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const size = largerText ? "text-lg" : "text-sm";
  return (
    <Text
      className={cn("font-instrument-sans-medium", size, disabled && "opacity-70", className)}
      style={[textStyle("foreground", scheme), sizeStyle(size), typeStyle("medium"), style]}
      {...props}
    />
  );
}

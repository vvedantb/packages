import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { IconCheck, IconMinus } from "@tabler/icons-react-native";
import { cn } from "./cn";
import { checkboxColors, touchSlop } from "./controlStyles";
import { selectionHaptic } from "./haptics";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export type CheckboxProps = Omit<PressableProps, "onPress" | "children"> & {
  /** `"indeterminate"` shows a dash; a press then checks it. */
  checked: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
  /** Shown while checked. Default a check icon (a dash when indeterminate). */
  icon?: ReactNode;
  className?: string;
};

/**
 * Controlled checkbox with a Pressable and a Tabler check, as the web
 * `Checkbox` (`checked` / `onCheckedChange`). Colours from `checkboxColors`:
 * the palette primary when checked, as on the web (not the theme accent).
 * 16 square with a 14 check, as on the web (24 and 18 with larger text), plus
 * a hit slop (`touchSlop`) that makes the target 44.
 */
export function Checkbox({
  checked,
  onCheckedChange,
  icon,
  disabled,
  className,
  style,
  ...props
}: CheckboxProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const on = checked !== false;
  const { color, ...fill } = checkboxColors(on, scheme);
  const boxStyle = { borderRadius: largerText ? 6 : 4, ...fill };
  const box = largerText ? 24 : 16;
  const iconSize = largerText ? 18 : 14;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: checked === "indeterminate" ? "mixed" : checked,
        disabled: Boolean(disabled),
      }}
      hitSlop={touchSlop(box)}
      disabled={disabled}
      onPress={() => {
        selectionHaptic();
        onCheckedChange?.(checked !== true);
      }}
      className={cn(
        "items-center justify-center border active:opacity-70",
        largerText ? "h-6 w-6" : "h-4 w-4",
        disabled && "opacity-50",
        className,
      )}
      style={
        typeof style === "function"
          ? (state) => [boxStyle, style(state)]
          : [boxStyle, style]
      }
      {...props}
    >
      {on
        ? (icon ??
          (checked === "indeterminate" ? (
            <IconMinus size={iconSize} color={color} stroke={2} />
          ) : (
            <IconCheck size={iconSize} color={color} stroke={2} />
          )))
        : null}
    </Pressable>
  );
}

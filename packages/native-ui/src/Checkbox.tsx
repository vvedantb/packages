import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { IconCheck, IconMinus } from "@tabler/icons-react-native";
import { cn } from "./cn";
import { selectionHaptic } from "./haptics";
import { tokens } from "./tokens";
import { useAccentColor, useLargerText } from "./theme";
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
 * `Checkbox` (`checked` / `onCheckedChange`). Checked fill is the theme accent.
 * 24 square (28 with larger text) plus a 12 hit slop.
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
  const accent = useAccentColor();
  const largerText = useLargerText();
  const on = checked !== false;
  const iconSize = largerText ? 20 : 16;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: checked === "indeterminate" ? "mixed" : checked,
        disabled: Boolean(disabled),
      }}
      hitSlop={12}
      disabled={disabled}
      onPress={() => {
        selectionHaptic();
        onCheckedChange?.(checked !== true);
      }}
      className={cn(
        "items-center justify-center border active:opacity-70",
        largerText ? "h-7 w-7" : "h-6 w-6",
        disabled && "opacity-50",
        className,
      )}
      style={
        typeof style === "function"
          ? style
          : [
              {
                borderRadius: 6,
                borderColor: on ? accent : tokens.color.border[scheme],
                backgroundColor: on ? accent : tokens.color.surface[scheme],
              },
              style,
            ]
      }
      {...props}
    >
      {on
        ? (icon ??
          (checked === "indeterminate" ? (
            <IconMinus size={iconSize} color={tokens.color.white} stroke={3} />
          ) : (
            <IconCheck size={iconSize} color={tokens.color.white} stroke={3} />
          )))
        : null}
    </Pressable>
  );
}

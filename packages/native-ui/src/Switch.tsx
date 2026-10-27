import * as React from "react";
import { Switch as PrimitiveSwitch } from "./primitives/switch";
import { cn } from "./cn";
import { switchColors, switchSize, touchSlop } from "./controlStyles";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

type SwitchProps = Omit<
  React.ComponentPropsWithoutRef<typeof PrimitiveSwitch>,
  "checked" | "onCheckedChange"
> & {
  value?: boolean;
  checked?: boolean;
  onValueChange?: (value: boolean) => void;
  onCheckedChange?: (value: boolean) => void;
  /** Track fill when on or off, in place of the `palette` colours. */
  onColor?: string;
  offColor?: string;
};

const Switch = React.forwardRef<
  React.ElementRef<typeof PrimitiveSwitch>,
  SwitchProps
>(({ value, checked, onValueChange, onCheckedChange, onColor, offColor, ...props }, ref) => {
  const resolvedValue = checked ?? value ?? false;
  const colors = switchColors(resolvedValue, useScheme());
  const trackColor = resolvedValue ? onColor : offColor;
  const size = switchSize(useLargerText());

  const handleCheckedChange = (nextValue: boolean) => {
    onCheckedChange?.(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <PrimitiveSwitch
      ref={ref}
      checked={resolvedValue}
      onCheckedChange={handleCheckedChange}
      // The web size on screen, a 44 target to touch.
      hitSlop={touchSlop(size.width, size.height)}
      accessibilityRole="switch"
      className={cn(size.track, "justify-center")}
      trackStyle={
        trackColor ? { backgroundColor: trackColor, borderColor: trackColor } : colors.track
      }
      thumbStyle={colors.thumb}
      thumbClassName={cn(size.thumb, resolvedValue ? size.on : "translate-x-0")}
      {...props}
      accessibilityState={{
        ...props.accessibilityState,
        checked: resolvedValue,
        disabled: Boolean(props.disabled),
      }}
    />
  );
});

Switch.displayName = "Switch";

export { Switch };
export type { SwitchProps };

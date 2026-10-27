import * as React from "react";
import { Switch as PrimitiveSwitch } from "./primitives/switch";
import { cn } from "./cn";
import { switchColors } from "./controlStyles";
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

  const handleCheckedChange = (nextValue: boolean) => {
    onCheckedChange?.(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <PrimitiveSwitch
      ref={ref}
      checked={resolvedValue}
      onCheckedChange={handleCheckedChange}
      hitSlop={12}
      className="h-8 w-14"
      trackStyle={
        trackColor ? { backgroundColor: trackColor, borderColor: trackColor } : colors.track
      }
      thumbStyle={colors.thumb}
      thumbClassName={cn(
        "h-7 w-7",
        resolvedValue ? "translate-x-6" : "translate-x-0",
      )}
      {...props}
    />
  );
});

Switch.displayName = "Switch";

export { Switch };
export type { SwitchProps };

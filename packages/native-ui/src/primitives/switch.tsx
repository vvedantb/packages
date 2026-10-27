import * as SwitchPrimitives from "@rn-primitives/switch";
import * as React from "react";
import { Platform, type ViewStyle } from "react-native";
import { cn } from "../cn";

type SwitchProps = React.ComponentPropsWithoutRef<
  typeof SwitchPrimitives.Root
> & {
  className?: string;
  thumbClassName?: string;
  /**
   * Track and thumb colours. Flat objects: on web each part is a Radix slot,
   * which spreads `style`, so these are the only styles applied there.
   */
  trackStyle?: ViewStyle;
  thumbStyle?: ViewStyle;
};

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(
  (
    {
      className,
      thumbClassName,
      trackStyle,
      thumbStyle,
      checked,
      style,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isChecked = Boolean(checked);
    const resolvedStyle =
      Platform.OS === "web" || typeof style === "function"
        ? trackStyle
        : [trackStyle, style];

    return (
      <SwitchPrimitives.Root
        ref={ref}
        checked={checked}
        disabled={disabled}
        style={resolvedStyle}
        className={cn(
          "h-[1.15rem] w-8 shrink-0 rounded-full border border-transparent",
          Platform.select({
            web: "outline-none transition-all",
          }),
          isChecked ? "bg-primary" : "bg-input dark:bg-input/80",
          disabled && "opacity-50",
          className,
        )}
        {...props}
      >
        <SwitchPrimitives.Thumb
          style={thumbStyle}
          className={cn(
            "h-4 w-4 rounded-full bg-background transition-transform",
            isChecked
              ? "translate-x-3.5 dark:bg-primary-foreground"
              : "translate-x-0 dark:bg-foreground",
            thumbClassName,
          )}
        />
      </SwitchPrimitives.Root>
    );
  },
);

Switch.displayName = "Switch";

export { Switch };

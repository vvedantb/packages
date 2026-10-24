import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../utils/cn";
import { useCn, useUiConfig } from "./ui-config";

/** `UiConfig.Switch`: `classes` replace the built-in part classes. */
export interface SwitchConfig {
  classes?: { root?: string; thumb?: string };
}

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => {
  const classes = useUiConfig("Switch")?.classes;
  const merge = useCn();
  return (
    <SwitchPrimitive.Root
      className={merge(
        classes?.root ??
          "peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border bg-default transition-[background-color,border-color] duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:bg-default dark:data-[state=unchecked]:border-muted/60 dark:data-[state=unchecked]:bg-muted/40 before:absolute before:inset-[-8px] before:content-['']",
        className,
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitive.Thumb
        className={
          classes?.thumb ??
          cn(
            "pointer-events-none block size-4 rounded-full bg-background ring-0 transition-[transform,background-color] duration-200 ease-smooth data-[state=checked]:translate-x-4 data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0 dark:data-[state=unchecked]:bg-foreground",
          )
        }
      />
    </SwitchPrimitive.Root>
  );
});
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "../utils/cn";
import { useCn, useUiConfig } from "./ui-config";

/** `UiConfig.Checkbox`: `classes` replace built-in part classes; `icon` is the default for the prop. */
export interface CheckboxConfig {
  classes?: { root?: string; indicator?: string };
  icon?: React.ReactNode;
}

type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  /** Shown in the indicator while checked. Default a 14px check icon. */
  icon?: React.ReactNode;
};

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, icon, ...props }, ref) => {
  const config = useUiConfig("Checkbox");
  const merge = useCn();
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={merge(
        config?.classes?.root ??
          "peer relative h-4 w-4 shrink-0 rounded-[4px] border border-border bg-field-background transition-[background-color,border-color] duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground before:absolute before:inset-[-12px] before:content-['']",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={config?.classes?.indicator ?? cn("flex items-center justify-center text-current")}
      >
        {icon ?? config?.icon ?? <IconCheck className="h-3.5 w-3.5" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
export type { CheckboxProps };

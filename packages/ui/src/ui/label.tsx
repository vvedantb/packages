import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../utils/cn";
import { useUiConfig } from "./ui-config";

export interface LabelConfig {
  /** Replaces the built-in classes of a part. */
  classes?: { root?: string };
}

const labelClass =
  "text-sm font-medium leading-none tracking-normal text-foreground/90 peer-disabled:cursor-not-allowed peer-disabled:opacity-70";

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(useUiConfig("Label")?.classes?.root ?? labelClass, className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };

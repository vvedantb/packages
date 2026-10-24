import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../utils/cn";
import { useUiConfig } from "./ui-config";

export interface ProgressConfig {
  /** Replaces the built-in classes of a part. A part left out keeps its default. */
  classes?: { root?: string; indicator?: string };
}

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const classes = useUiConfig("Progress")?.classes;
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        classes?.root ?? "relative h-2.5 w-full overflow-hidden rounded-full bg-default/85",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={
          classes?.indicator ??
          "h-full w-full flex-1 rounded-full bg-primary transition-transform duration-300 ease-smooth"
        }
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };

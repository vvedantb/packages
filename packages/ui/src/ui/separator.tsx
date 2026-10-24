import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { useCn, useUiConfig } from "./ui-config";

export interface SeparatorConfig {
  /** Replaces the built-in classes of a part. `root` excludes the orientation size classes. */
  classes?: { root?: string };
}

const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref,
  ) => {
    const root = useUiConfig("Separator")?.classes?.root;
    const merge = useCn();
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={merge(
          root ?? "shrink-0 bg-separator",
          orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
          className,
        )}
        {...props}
      />
    );
  },
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };

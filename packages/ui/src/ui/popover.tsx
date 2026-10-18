import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../utils/cn";
import {
  floatingSurfaceAnimateClass,
  floatingSurfaceClass,
} from "./_menu-classes";
import { fitViewportClass } from "./_menu-parts";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    /**
     * Grow from the trigger, keep 8px from the viewport edge (unless
     * `collisionPadding` is set) and, on small screens, cap width and height.
     */
    fitViewport?: boolean;
  }
>(({ className, align = "center", sideOffset = 6, fitViewport, collisionPadding, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={fitViewport ? (collisionPadding ?? 8) : collisionPadding}
      className={cn(
        "z-50 w-72 max-sm:max-w-[calc(100vw-2rem)] max-sm:max-h-[85dvh] max-sm:overflow-y-auto p-4 outline-none",
        floatingSurfaceClass,
        floatingSurfaceAnimateClass,
        fitViewport &&
          `origin-[var(--radix-popper-transform-origin)] max-sm:max-w-[calc(100vw-1.5rem)] ${fitViewportClass}`,
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };

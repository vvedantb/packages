import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../utils/cn";
import {
  floatingSurfaceAnimateClass,
  floatingSurfaceClass,
} from "./_menu-classes";
import { fitViewportClass } from "./_menu-parts";
import { useUiConfig } from "./ui-config";

type PopoverContentProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>;

/** App defaults for `Popover*` (see `UiConfigProvider`). */
export interface PopoverConfig {
  /** Replaces the built-in classes of a part. */
  classes?: { trigger?: string; content?: string };
  /** Default for `PopoverContent` `sideOffset`. */
  sideOffset?: number;
  /** Default for `PopoverContent` `collisionPadding`. */
  collisionPadding?: PopoverContentProps["collisionPadding"];
}

const Popover = PopoverPrimitive.Root;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverTrigger = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>((props, ref) => {
  const trigger = useUiConfig("Popover")?.classes?.trigger;
  // Without config, pass props untouched: Radix's Slot turns an explicit
  // `className={undefined}` into `class=""`.
  if (trigger === undefined) return <PopoverPrimitive.Trigger ref={ref} {...props} />;
  const { className, ...rest } = props;
  return <PopoverPrimitive.Trigger ref={ref} className={cn(trigger, className)} {...rest} />;
});
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps & {
    /**
     * Grow from the trigger, keep 8px from the viewport edge (unless
     * `collisionPadding` is set) and, on small screens, cap width and height.
     */
    fitViewport?: boolean;
  }
>(({ className, align = "center", sideOffset, fitViewport, collisionPadding, ...props }, ref) => {
  const config = useUiConfig("Popover");
  const padding = collisionPadding ?? config?.collisionPadding;
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset ?? config?.sideOffset ?? 6}
        collisionPadding={fitViewport ? (padding ?? 8) : padding}
        className={cn(
          config?.classes?.content ?? [
            "z-50 w-72 max-sm:max-w-[calc(100vw-2rem)] max-sm:max-h-[85dvh] max-sm:overflow-y-auto p-4 outline-none",
            floatingSurfaceClass,
            floatingSurfaceAnimateClass,
          ],
          fitViewport &&
            `origin-[var(--radix-popper-transform-origin)] max-sm:max-w-[calc(100vw-1.5rem)] ${fitViewportClass}`,
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };

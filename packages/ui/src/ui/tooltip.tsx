import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../utils/cn";
import { useUiConfig } from "./ui-config";

/** App defaults for `Tooltip*` (see `UiConfigProvider`). */
export interface TooltipConfig {
  /** Replaces the built-in classes of a part. */
  classes?: { content?: string };
  /** Default for `TooltipProvider` `delayDuration` (Radix: 700ms). */
  delayDuration?: number;
  /** Default for `TooltipContent` `sideOffset`. */
  sideOffset?: number;
  /** Default for `TooltipContent` `portal`. */
  portal?: boolean;
}

function TooltipProvider({
  delayDuration,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  const config = useUiConfig("Tooltip");
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration ?? config?.delayDuration}
      {...props}
    />
  );
}
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    /** Render into `document.body` so a clipping parent cannot cut it off. */
    portal?: boolean;
  }
>(({ className, sideOffset, portal, ...props }, ref) => {
  const config = useUiConfig("Tooltip");
  const content = (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset ?? config?.sideOffset ?? 4}
      className={cn(
        config?.classes?.content ??
          "z-50 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg bg-overlay px-2.5 py-1.5 text-xs text-overlay-foreground smooth-shadow-ring-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  );
  return (portal ?? config?.portal) ? (
    <TooltipPrimitive.Portal>{content}</TooltipPrimitive.Portal>
  ) : (
    content
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

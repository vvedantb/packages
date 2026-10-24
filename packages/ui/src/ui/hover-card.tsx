import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "../utils/cn";
import {
  floatingSurfaceAnimateClass,
  floatingSurfaceClass,
} from "./_menu-classes";
import { useUiConfig } from "./ui-config";

/** App defaults for `HoverCard*` (see `UiConfigProvider`). */
export interface HoverCardConfig {
  /** Replaces the built-in classes of a part. */
  classes?: { content?: string };
  /** Default for `HoverCard` `openDelay` (Radix: 700ms). */
  openDelay?: number;
  /** Default for `HoverCard` `closeDelay` (Radix: 300ms). */
  closeDelay?: number;
  /** Default for `HoverCardContent` `sideOffset`. */
  sideOffset?: number;
  /** Default for `HoverCardContent` `portal`. */
  portal?: boolean;
}

function HoverCard({
  openDelay,
  closeDelay,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  const config = useUiConfig("HoverCard");
  return (
    <HoverCardPrimitive.Root
      openDelay={openDelay ?? config?.openDelay}
      closeDelay={closeDelay ?? config?.closeDelay}
      {...props}
    />
  );
}

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ComponentRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> & {
    /** Render into `document.body` so a clipping parent cannot cut it off. */
    portal?: boolean;
  }
>(({ className, align = "center", sideOffset, portal, ...props }, ref) => {
  const config = useUiConfig("HoverCard");
  const content = (
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset ?? config?.sideOffset ?? 4}
      className={cn(
        config?.classes?.content ?? [
          "z-50 w-72 max-sm:max-w-[calc(100vw-2rem)] max-sm:max-h-[85dvh] max-sm:overflow-y-auto p-4 outline-none",
          floatingSurfaceClass,
          floatingSurfaceAnimateClass,
        ],
        className,
      )}
      {...props}
    />
  );
  return (portal ?? config?.portal) ? (
    <HoverCardPrimitive.Portal>{content}</HoverCardPrimitive.Portal>
  ) : (
    content
  );
});
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };

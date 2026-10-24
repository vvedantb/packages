import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { IconX } from "@tabler/icons-react";
import { cn } from "../utils/cn";
import { useUiConfig } from "./ui-config";

// A modal panel pinned to the left or right edge, built on Radix Dialog. Unlike
// `Sheet` (vaul) it has no drag gesture or handle: it slides in with CSS and
// closes with its close button, Escape or a click on the overlay.

type SideSheetSide = "left" | "right";

/** App defaults for `SideSheet*` (see `UiConfigProvider`). */
export interface SideSheetConfig {
  /** Replaces the built-in classes of a part. */
  classes?: {
    trigger?: string;
    overlay?: string;
    /** Content classes shared by both sides. */
    content?: string;
    /** Content classes for `side="left"`. */
    left?: string;
    /** Content classes for `side="right"`. */
    right?: string;
    close?: string;
  };
  /** Default for `SideSheetContent` `side`. */
  side?: SideSheetSide;
}

const SideSheet = DialogPrimitive.Root;
const SideSheetPortal = DialogPrimitive.Portal;
const SideSheetClose = DialogPrimitive.Close;
const SideSheetTitle = DialogPrimitive.Title;
const SideSheetDescription = DialogPrimitive.Description;

const SideSheetTrigger = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>((props, ref) => {
  const trigger = useUiConfig("SideSheet")?.classes?.trigger;
  // Without config, pass props untouched: Radix's Slot turns an explicit
  // `className={undefined}` into `class=""`.
  if (trigger === undefined) return <DialogPrimitive.Trigger ref={ref} {...props} />;
  const { className, ...rest } = props;
  return <DialogPrimitive.Trigger ref={ref} className={cn(trigger, className)} {...rest} />;
});
SideSheetTrigger.displayName = "SideSheetTrigger";

const SideSheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const overlay = useUiConfig("SideSheet")?.classes?.overlay;
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        overlay ??
          "fixed inset-0 z-50 bg-backdrop backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
        className,
      )}
      {...props}
    />
  );
});
SideSheetOverlay.displayName = "SideSheetOverlay";

const sideClass: Record<SideSheetSide, string> = {
  left: "left-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
  right: "right-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
};

const SideSheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Edge the panel is pinned to. Default `"left"`. */
    side?: SideSheetSide;
    hideCloseButton?: boolean;
  }
>(({ className, children, side: sideProp, hideCloseButton, ...props }, ref) => {
  const config = useUiConfig("SideSheet");
  const classes = config?.classes;
  const side = sideProp ?? config?.side ?? "left";
  return (
    <SideSheetPortal>
      <SideSheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          classes?.content ??
            "fixed top-0 z-50 flex h-dvh w-80 max-w-[88vw] flex-col bg-overlay text-overlay-foreground smooth-shadow-ring-xl outline-hidden duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
          classes?.[side] ?? sideClass[side],
          className,
        )}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            className={
              classes?.close ??
              "absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-overlay-foreground/70 transition-[background-color,transform] hover:bg-surface-tertiary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            }
          >
            <IconX className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SideSheetPortal>
  );
});
SideSheetContent.displayName = "SideSheetContent";

export {
  SideSheet,
  SideSheetPortal,
  SideSheetOverlay,
  SideSheetTrigger,
  SideSheetClose,
  SideSheetContent,
  SideSheetTitle,
  SideSheetDescription,
};

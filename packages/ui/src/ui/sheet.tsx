"use client";

import * as React from "react";
import { useMotionBlur } from "@web-kits/motion-blur/react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "../utils/cn";
import { assignRef } from "../utils/ref";
import {
  connectBodyPointerEventsFix,
  connectKeyboardScroll,
  connectOverlayViewport,
} from "./overlay-a11y";

type SheetSide = "top" | "bottom" | "left" | "right";

// vaul animates and drags from the Root's `direction`; SheetContent reads it
// so `<Sheet direction="right">` places the panel on the right by default.
const SheetDirectionContext = React.createContext<SheetSide>("bottom");

function Sheet({
  shouldScaleBackground = false,
  direction = "bottom",
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return (
    <SheetDirectionContext.Provider value={direction}>
      <DrawerPrimitive.Root
        shouldScaleBackground={shouldScaleBackground}
        direction={direction}
        {...props}
      />
    </SheetDirectionContext.Provider>
  );
}

const SheetTrigger = DrawerPrimitive.Trigger;
const SheetPortal = DrawerPrimitive.Portal;
const SheetClose = DrawerPrimitive.Close;
const SheetHandle = DrawerPrimitive.Handle;
const SheetTitle = DrawerPrimitive.Title;
const SheetDescription = DrawerPrimitive.Description;

const overlayMotionClass =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none";

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-backdrop backdrop-blur-md",
      overlayMotionClass,
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

// Position and size. Stays on the element vaul moves.
const sheetSideLayoutClass: Record<SheetSide, string> = {
  bottom:
    "inset-x-0 bottom-[var(--overlay-vv-bottom,0px)] mt-24 flex max-h-[min(96dvh,calc(var(--overlay-vv-height,100dvh)-1.5rem))] h-auto flex-col",
  top: "inset-x-0 top-0 mb-24 flex h-auto max-h-[var(--overlay-vv-height,100dvh)] flex-col",
  left: "inset-y-2 left-2 right-auto flex h-auto w-80 max-w-[88vw] flex-col",
  right: "inset-y-2 left-auto right-2 flex h-auto w-80 max-w-[88vw] flex-col",
};

// Corners and safe-area padding. Go on the visible surface.
const sheetSideSurfaceClass: Record<SheetSide, string> = {
  bottom: "rounded-t-2xl pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
  top: "rounded-b-2xl pt-[max(0.75rem,env(safe-area-inset-top,0px))]",
  left: "rounded-2xl",
  right: "rounded-2xl",
};

// Without `motionBlur`, one element is both the moving part and the surface.
const sheetContentClass =
  "fixed z-50 overflow-y-auto bg-overlay/95 text-overlay-foreground smooth-shadow-ring-xl outline-hidden backdrop-blur-xl motion-reduce:transition-none";

// With `motionBlur`, the element vaul moves has to stay transparent, because the
// blur is drawn into its first child. It also stops clipping (no overflow), so
// the streak and the surface shadow can reach past its edges. `after:hidden`
// drops vaul's `::after` fill: it inherits the now transparent background, and
// the old `overflow-y-auto` clipped it anyway.
const sheetBlurHostClass =
  "fixed z-50 outline-hidden motion-reduce:transition-none after:hidden";

// The visible surface inside it. It fills the host and is the scroll container.
const sheetBlurSurfaceClass =
  "flex min-h-0 flex-auto flex-col overflow-y-auto bg-overlay/95 text-overlay-foreground smooth-shadow-ring-xl backdrop-blur-xl";

/**
 * `@web-kits/motion-blur` reads transforms with `DOMMatrix` and the computed
 * `translate`, polls `getAnimations()` and checks `matchMedia`, and throws
 * without them. jsdom, happy-dom and browsers without the individual transform
 * properties lack some of these, so the blur stays off there and the sheet
 * still renders.
 */
function supportsMotionBlur(node: HTMLElement): boolean {
  return (
    typeof DOMMatrix === "function" &&
    typeof window.matchMedia === "function" &&
    typeof node.getAnimations === "function" &&
    typeof window.getComputedStyle(node).translate === "string"
  );
}

const syncedEchoCopies = new WeakSet<Element>();

/**
 * Echo draws copies of the surface next to it, and a fresh copy starts at
 * scroll 0. Give each copy the surface's scroll once, so a scrolled sheet does
 * not flash its top while it closes.
 */
function syncEchoScroll(host: HTMLElement): void {
  const surface = host.firstElementChild;
  if (!(surface instanceof HTMLElement)) return;
  for (let copy = surface.nextElementSibling; copy; copy = copy.nextElementSibling) {
    if (syncedEchoCopies.has(copy) || copy.getAttribute("aria-hidden") !== "true") continue;
    syncedEchoCopies.add(copy);
    copy.scrollTop = surface.scrollTop;
    copy.scrollLeft = surface.scrollLeft;
  }
}

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    /** Defaults to the parent Sheet's `direction`. */
    side?: SheetSide;
    /**
     * Blur the sheet while it slides in, out or is dragged, with
     * `@web-kits/motion-blur` (Echo, 180° shutter). Off under
     * `prefers-reduced-motion`. When `true`, the content element moves and
     * stays transparent, and an inner `data-slot="sheet-surface"` div holds the
     * fill, shadow, corners and scroll. `className` then styles the moving
     * element only (size, position); use `surfaceClassName` for the surface.
     * Default `false`.
     */
    motionBlur?: boolean;
    /**
     * Classes for the visible surface: the inner div when `motionBlur` is on,
     * otherwise the content element itself (after `className`).
     */
    surfaceClassName?: string;
  }
>(({ className, children, side: sideProp, motionBlur = false, surfaceClassName, ...props }, ref) => {
  const direction = React.useContext(SheetDirectionContext);
  const side = sideProp ?? direction;
  const overlayCleanupRef = React.useRef<(() => void) | null>(null);
  const blurCleanupRef = React.useRef<(() => void) | null>(null);
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  const onBlurFrame = React.useCallback(() => {
    if (hostRef.current) syncEchoScroll(hostRef.current);
  }, []);
  // Called on every render (hook rules); it does nothing until its ref is set.
  const { ref: attachMotionBlur } = useMotionBlur({ onFrame: onBlurFrame });

  const detachMotionBlur = React.useCallback(() => {
    blurCleanupRef.current?.();
    blurCleanupRef.current = null;
  }, []);

  const connectMotionBlur = React.useCallback(
    (node: HTMLDivElement) => {
      detachMotionBlur();
      if (!supportsMotionBlur(node)) return;
      blurCleanupRef.current = attachMotionBlur(node) ?? null;
    },
    [attachMotionBlur, detachMotionBlur],
  );

  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      overlayCleanupRef.current?.();
      overlayCleanupRef.current = null;
      detachMotionBlur();
      hostRef.current = node;
      if (node) {
        const viewport = connectOverlayViewport(node);
        const keyboard = connectKeyboardScroll(node);
        const pointerEvents = connectBodyPointerEventsFix();
        if (motionBlur) connectMotionBlur(node);
        overlayCleanupRef.current = () => {
          viewport();
          keyboard();
          pointerEvents();
        };
      }
      assignRef(ref, node);
    },
    [ref, motionBlur, connectMotionBlur, detachMotionBlur],
  );

  React.useLayoutEffect(() => {
    return () => {
      overlayCleanupRef.current?.();
      overlayCleanupRef.current = null;
      detachMotionBlur();
    };
  }, [detachMotionBlur]);

  // vaul may keep the same content node when only `motionBlur` flips, so the
  // callback ref above does not always re-run. Sync attach/detach here.
  React.useLayoutEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    if (motionBlur) connectMotionBlur(node);
    else detachMotionBlur();
  }, [motionBlur, connectMotionBlur, detachMotionBlur]);

  const handle =
    side === "bottom" || side === "top" ? (
      <div className="flex min-h-11 shrink-0 items-center justify-center">
        <SheetHandle className="relative mx-auto h-1 w-12 shrink-0 rounded-full bg-surface-tertiary after:absolute after:inset-x-[-16px] after:inset-y-[-20px] after:content-['']" />
      </div>
    ) : null;

  return (
    <SheetPortal>
      <SheetOverlay />
      <DrawerPrimitive.Content
        ref={mergedRef}
        className={
          motionBlur
            ? cn(sheetBlurHostClass, sheetSideLayoutClass[side], className)
            : cn(
                sheetContentClass,
                sheetSideLayoutClass[side],
                sheetSideSurfaceClass[side],
                className,
                surfaceClassName,
              )
        }
        {...props}
      >
        {motionBlur ? (
          <div
            data-slot="sheet-surface"
            className={cn(sheetBlurSurfaceClass, sheetSideSurfaceClass[side], surfaceClassName)}
          >
            {handle}
            {children}
          </div>
        ) : (
          <>
            {handle}
            {children}
          </>
        )}
      </DrawerPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 p-4 text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky bottom-0 mt-auto flex flex-col-reverse gap-2 bg-overlay/95 p-4 sm:flex-row sm:justify-end",
      "pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
      "[&_button]:max-sm:min-h-11",
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHandle,
  SheetTitle,
  SheetDescription,
  SheetHeader,
  SheetFooter,
};

// The same parts under vaul's name, for apps that call the sliding panel a
// drawer. One implementation, so `DrawerContent` takes `motionBlur` too.
export {
  Sheet as Drawer,
  SheetPortal as DrawerPortal,
  SheetOverlay as DrawerOverlay,
  SheetTrigger as DrawerTrigger,
  SheetClose as DrawerClose,
  SheetContent as DrawerContent,
  SheetHandle as DrawerHandle,
  SheetTitle as DrawerTitle,
  SheetDescription as DrawerDescription,
  SheetHeader as DrawerHeader,
  SheetFooter as DrawerFooter,
};

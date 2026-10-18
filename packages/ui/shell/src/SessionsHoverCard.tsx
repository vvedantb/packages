import { forwardRef, useEffect, useState } from "react";
import type { ComponentPropsWithoutRef, ComponentRef, ReactNode } from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { HoverCard, HoverCardTrigger } from "../../src/ui/hover-card";
import { floatingSurfaceAnimateClass, floatingSurfaceClass } from "../../src/ui/_menu-classes";
import { cn } from "../../src/utils/cn";

export type SessionsHoverCardContext = { open: boolean };

export type SessionsHoverCardSurface = "overlay" | "surface" | "glass";

/**
 * Surface classes. Only `overlay` carries the shared floating surface, so the
 * others need no `!` overrides, and `className` merges over all of them.
 */
const surfaceClasses: Record<SessionsHoverCardSurface, string> = {
  overlay: floatingSurfaceClass,
  surface: "rounded-surface bg-overlay text-overlay-foreground smooth-shadow-ring-lg",
  glass: "rounded-surface glass-panel-strong text-foreground smooth-shadow-ring-lg",
};

export type SessionsHoverCardProps = Omit<
  ComponentPropsWithoutRef<typeof HoverCardTrigger>,
  "className" | "children"
> & {
  /**
   * The trigger. With `asChild` (default) it is the element that triggers the
   * card, such as a list row. Trigger props and the ref go to that element,
   * which keeps its own handlers. With `asChild={false}` the children render
   * inside a default trigger element.
   */
  children: ReactNode;
  /** Default `true`. */
  asChild?: boolean;
  /**
   * Render the content in a portal on `document.body`, so `overflow:hidden`
   * ancestors do not clip it. Default `true`. Use `false` to keep the content
   * in place in the DOM.
   */
  portal?: boolean;
  /**
   * `"overlay"` (default): floating overlay, `rounded-lg`. `"surface"`: same
   * fill with `rounded-surface`. `"glass"`: `glass-panel-strong` with
   * `rounded-surface`.
   */
  surface?: SessionsHoverCardSurface;
  header?: ReactNode;
  /**
   * Body slot. A function runs only while the card is open, so it can start
   * fetches for preview data.
   */
  body?: ReactNode | ((ctx: SessionsHoverCardContext) => ReactNode);
  /** Runs each time the card opens. Its result replaces `body`. */
  loadContent?: () => Promise<ReactNode> | ReactNode;
  /** Shown while `loadContent` is pending. */
  loadingFallback?: ReactNode;
  footer?: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Delay before opening, in milliseconds. */
  openDelay?: number;
  /** Delay before closing, in milliseconds. */
  closeDelay?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Merged over the default `w-64 p-3` and the surface classes. */
  className?: string;
};

/** `:focus-visible` is true for keyboard focus only. Treat unsupported engines as keyboard. */
function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

type LoadState = { status: "loading" } | { status: "ready"; node: ReactNode };

/** Mounts only while the card is open, so `loadContent` never runs while closed. */
function LoadedBody({
  loadContent,
  fallback,
}: {
  loadContent: () => Promise<ReactNode> | ReactNode;
  fallback: ReactNode;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(loadContent)
      .then((node) => {
        if (!cancelled) setState({ status: "ready", node });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "ready", node: null });
      });
    return () => {
      cancelled = true;
    };
    // Run once per open. A new `loadContent` identity must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{state.status === "ready" ? state.node : fallback}</>;
}

/** Calls the render prop. Mounts only inside open content, never while closed. */
function RenderBody({
  render,
  open,
}: {
  render: (ctx: SessionsHoverCardContext) => ReactNode;
  open: boolean;
}) {
  return <>{render({ open })}</>;
}

/**
 * Hover card shell for list rows such as a sessions sidebar. It sets delay,
 * position, width and padding, and gives header, body and footer slots. The
 * app supplies the content.
 */
export const SessionsHoverCard = forwardRef<
  ComponentRef<typeof HoverCardTrigger>,
  SessionsHoverCardProps
>(function SessionsHoverCard({
  children,
  asChild = true,
  portal = true,
  surface = "overlay",
  header,
  body,
  loadContent,
  loadingFallback = null,
  footer,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openDelay = 400,
  closeDelay = 150,
  side = "right",
  align = "start",
  sideOffset = 8,
  className,
  onFocus,
  onPointerLeave,
  ...triggerProps
}, ref) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;

  const handleOpenChange = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };

  // Open on keyboard focus only. Focus that returns after a context menu or a
  // click is pointer-driven, so it must not open the card.
  const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
    onFocus?.(event as never);
    if (event.defaultPrevented) return;
    if (!isFocusVisible(event.currentTarget)) event.preventDefault();
  };

  // Always close on pointer leave, even while focus stays on the trigger.
  const handlePointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    onPointerLeave?.(event as never);
    if (event.pointerType !== "touch" && open) handleOpenChange(false);
  };

  const bodyNode = loadContent ? (
    <LoadedBody loadContent={loadContent} fallback={loadingFallback} />
  ) : typeof body === "function" ? (
    <RenderBody render={body} open={open} />
  ) : (
    body
  );

  const content = (
    <HoverCardPrimitive.Content
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 outline-none max-sm:max-h-[85dvh] max-sm:max-w-[calc(100vw-2rem)] max-sm:overflow-y-auto",
        surfaceClasses[surface],
        floatingSurfaceAnimateClass,
        "w-64 p-3",
        className,
      )}
    >
      {header ? (
        <div className="mb-2 text-sm font-medium text-foreground">{header}</div>
      ) : null}
      {bodyNode != null ? (
        <div className="text-sm text-muted-foreground">{bodyNode}</div>
      ) : null}
      {footer ? (
        <div className="mt-2 text-xs text-muted-foreground">{footer}</div>
      ) : null}
    </HoverCardPrimitive.Content>
  );

  return (
    <HoverCard
      open={open}
      onOpenChange={handleOpenChange}
      openDelay={openDelay}
      closeDelay={closeDelay}
    >
      <HoverCardTrigger
        ref={ref}
        asChild={asChild}
        {...triggerProps}
        onFocus={handleFocus}
        onPointerLeave={handlePointerLeave}
      >
        {children}
      </HoverCardTrigger>
      {portal ? <HoverCardPrimitive.Portal>{content}</HoverCardPrimitive.Portal> : content}
    </HoverCard>
  );
});

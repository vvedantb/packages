import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../src/ui/hover-card";
import { cn } from "../../src/utils/cn";

export type SessionsHoverCardContext = { open: boolean };

export type SessionsHoverCardProps = {
  /** The element that triggers the card, such as a list row. Rendered with `asChild`. */
  children: ReactNode;
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
  /** Merged over the default `w-64 p-3`. */
  className?: string;
};

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
export function SessionsHoverCard({
  children,
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
}: SessionsHoverCardProps) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;

  const handleOpenChange = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };

  const bodyNode = loadContent ? (
    <LoadedBody loadContent={loadContent} fallback={loadingFallback} />
  ) : typeof body === "function" ? (
    <RenderBody render={body} open={open} />
  ) : (
    body
  );

  return (
    <HoverCard
      open={open}
      onOpenChange={handleOpenChange}
      openDelay={openDelay}
      closeDelay={closeDelay}
    >
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn("w-64 p-3", className)}
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
      </HoverCardContent>
    </HoverCard>
  );
}

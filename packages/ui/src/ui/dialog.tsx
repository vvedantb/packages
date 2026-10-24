import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { IconX } from "@tabler/icons-react";
import { cn } from "../utils/cn";
import { assignRef } from "../utils/ref";
import { connectModalSurface } from "./modalTransition";
import {
  connectBodyPointerEventsFix,
  connectKeyboardScroll,
  connectOverlayViewport,
  treeHasDialogDescription,
  useCompactOverlay,
} from "./overlay-a11y";
import { useUiConfig } from "./ui-config";

/** App defaults for `Dialog*` (see `UiConfigProvider`). */
export interface DialogConfig {
  /** Replaces the built-in classes of a part. */
  classes?: {
    trigger?: string;
    overlay?: string;
    /** Content classes shared by both layouts. */
    content?: string;
    /** Content layout classes for the centred dialog. */
    centered?: string;
    /** Content layout classes for the compact bottom sheet. */
    compact?: string;
    close?: string;
    header?: string;
    body?: string;
    footer?: string;
    title?: string;
    description?: string;
  };
  /** Default for `DialogContent` `viewportAware`. */
  viewportAware?: boolean;
}

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogTrigger = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>((props, ref) => {
  const trigger = useUiConfig("Dialog")?.classes?.trigger;
  // Without config, pass props untouched: Radix's Slot turns an explicit
  // `className={undefined}` into `class=""`.
  if (trigger === undefined) return <DialogPrimitive.Trigger ref={ref} {...props} />;
  const { className, ...rest } = props;
  return <DialogPrimitive.Trigger ref={ref} className={cn(trigger, className)} {...rest} />;
});
DialogTrigger.displayName = DialogPrimitive.Trigger.displayName;

const overlayMotionClass =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none";

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const overlay = useUiConfig("Dialog")?.classes?.overlay;
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        overlay ?? ["fixed inset-0 z-50 bg-backdrop backdrop-blur-md", overlayMotionClass],
        className,
      )}
      {...props}
    />
  );
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DEFAULT_ALERT_DESCRIPTION = "This action needs confirmation.";

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideCloseButton?: boolean;
    /**
     * Bottom sheet on compact viewports, visual-viewport sizing, keyboard-aware
     * scrolling and the body pointer-events fix. Default `true`. `false` keeps a
     * centred dialog at every size and leaves the viewport and body alone.
     */
    viewportAware?: boolean;
  }
>(
  (
    {
      className,
      children,
      hideCloseButton,
      viewportAware: viewportAwareProp,
      role,
      onOpenAutoFocus,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const config = useUiConfig("Dialog");
    const classes = config?.classes;
    const viewportAware = viewportAwareProp ?? config?.viewportAware ?? true;
    const compactViewport = useCompactOverlay();
    const compact = viewportAware && compactViewport;
    const isAlert = role === "alertdialog";
    const contentNodeRef = React.useRef<HTMLDivElement | null>(null);
    const surfaceCleanupRef = React.useRef<(() => void) | null>(null);
    const overlayCleanupRef = React.useRef<(() => void) | null>(null);
    const generatedDescriptionId = React.useId();
    const hasDescription = treeHasDialogDescription(children, DialogDescription);
    const missingDescription =
      isAlert && ariaDescribedBy == null && !hasDescription;

    React.useEffect(() => {
      if (!missingDescription) return;
      const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
        .process?.env?.NODE_ENV;
      if (nodeEnv === "production") return;
      console.warn(
        '[Dialog] role="alertdialog" requires a description. Add DialogDescription or aria-describedby.',
      );
    }, [missingDescription]);

    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        surfaceCleanupRef.current?.();
        surfaceCleanupRef.current = null;
        overlayCleanupRef.current?.();
        overlayCleanupRef.current = null;

        contentNodeRef.current = node;
        if (node) {
          if (!compact) {
            surfaceCleanupRef.current = connectModalSurface(node);
          }
          if (!viewportAware) {
            assignRef(ref, node);
            return;
          }
          const viewport = connectOverlayViewport(node);
          const keyboard = connectKeyboardScroll(node);
          const pointerEvents = connectBodyPointerEventsFix();
          overlayCleanupRef.current = () => {
            viewport();
            keyboard();
            pointerEvents();
          };
        }

        assignRef(ref, node);
      },
      [ref, compact, viewportAware],
    );

    React.useLayoutEffect(() => {
      return () => {
        surfaceCleanupRef.current?.();
        surfaceCleanupRef.current = null;
        overlayCleanupRef.current?.();
        overlayCleanupRef.current = null;
      };
    }, []);

    const handleOpenAutoFocus = (event: Event) => {
      onOpenAutoFocus?.(event);
      if (!isAlert || event.defaultPrevented) return;
      event.preventDefault();
      const root = contentNodeRef.current;
      const cancel = root?.querySelector<HTMLElement>("[data-alert-cancel]");
      (cancel ?? root)?.focus();
    };

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={mergedRef}
          {...(role ? { role } : {})}
          {...(missingDescription
            ? { "aria-describedby": generatedDescriptionId }
            : ariaDescribedBy != null
              ? { "aria-describedby": ariaDescribedBy }
              : {})}
          onOpenAutoFocus={handleOpenAutoFocus}
          data-compact={compact ? "true" : undefined}
          className={cn(
            classes?.content ??
              "glass-panel-strong z-50 flex w-full flex-col gap-4 p-6 text-overlay-foreground smooth-shadow-ring-xl",
            compact
              ? classes?.compact ?? cn(
                  "overflow-y-auto fixed inset-x-0 top-auto w-full max-w-none rounded-t-2xl rounded-b-none pt-3",
                  "max-h-[var(--overlay-vv-height,100dvh)]",
                  "bottom-[var(--overlay-vv-bottom,0px)]",
                  "pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]",
                  "data-[compact=true]:[&_button]:min-h-11 data-[compact=true]:[&_[data-slot=dialog-footer]]:flex-col-reverse data-[compact=true]:[&_[data-slot=dialog-footer]]:sm:flex-col-reverse",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
                  "motion-reduce:animate-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
                )
              : classes?.centered ??
                  "t-modal fixed left-1/2 top-1/2 max-h-[90dvh] max-w-lg max-sm:w-[calc(100vw-2rem)] overflow-y-auto rounded-lg",
            className,
          )}
          {...props}
        >
          {compact ? (
            <div
              aria-hidden
              className="mx-auto mb-1 flex min-h-11 w-full shrink-0 items-center justify-center"
            >
              <span className="h-1 w-12 rounded-full bg-surface-tertiary" />
            </div>
          ) : null}
          {missingDescription ? (
            <DialogPrimitive.Description
              id={generatedDescriptionId}
              className="sr-only"
            >
              {DEFAULT_ALERT_DESCRIPTION}
            </DialogPrimitive.Description>
          ) : null}
          {children}
          {!hideCloseButton && (
            <DialogPrimitive.Close
              className={
                classes?.close ??
                cn(
                  "absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-overlay-foreground/70 transition-[background-color,transform] hover:bg-surface-tertiary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:pointer-events-none",
                  "motion-reduce:transition-none",
                )
              }
            >
              <IconX className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const header = useUiConfig("Dialog")?.classes?.header;
  return (
    <div
      className={cn(header ?? "flex flex-col gap-1.5 pr-10 text-left", className)}
      {...props}
    />
  );
};
DialogHeader.displayName = "DialogHeader";

const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const body = useUiConfig("Dialog")?.classes?.body;
  return (
    <div
      className={cn(
        body ?? "min-h-11 flex-1 overflow-y-auto overscroll-contain",
        className,
      )}
      {...props}
    />
  );
};
DialogBody.displayName = "DialogBody";

// no fill of its own: the footer is not sticky, so it shows the content's
// surface. a token here (it was `bg-overlay`) showed as an inset block when
// that surface differs (an app's own `glass-panel-strong`, or `bg-*` on the
// content)
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const footer = useUiConfig("Dialog")?.classes?.footer;
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        footer ?? [
          "mt-auto flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end",
          "pb-[max(0px,env(safe-area-inset-bottom,0px))]",
          "[&_button]:max-sm:min-h-11",
        ],
        className,
      )}
      {...props}
    />
  );
};
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const title = useUiConfig("Dialog")?.classes?.title;
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        title ?? "text-lg font-semibold tracking-normal text-foreground text-balance",
        className,
      )}
      {...props}
    />
  );
});
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  const description = useUiConfig("Dialog")?.classes?.description;
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn(
        description ??
          // `--muted` is ~3.5:1 on overlay; mix toward overlay-foreground for 4.5:1.
          "text-sm leading-relaxed text-[color-mix(in_oklch,var(--color-popover-foreground,var(--overlay-foreground))_72%,var(--color-popover,var(--overlay)))]",
        className,
      )}
      {...props}
    />
  );
});
DialogDescription.displayName = DialogPrimitive.Description.displayName;

const DialogRawContent = DialogPrimitive.Content;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogRawContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

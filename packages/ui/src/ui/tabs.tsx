import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { assignRef } from "../utils/ref";
import { syncTabsPill, type TabsPillMotion } from "./tabsSliding";
import { useCn, useUiConfig } from "./ui-config";

const Tabs = TabsPrimitive.Root;

// `pills` (default): isolated rounded pills with a gap, no shared track.
// `segmented`: connected bar with a sliding pill, kept for marketing surfaces.
// `soft`: borderless wrapping pills, the active one filled. Uses no `t-tabs`
// CSS, so triggers can hold an absolutely placed child (e.g. a progress bar).
type TabsListVariant = "pills" | "segmented" | "soft";
type TabsListSize = "default" | "sm";

/**
 * `UiConfig.Tabs`. `classes` replace built-in part classes (`list` replaces
 * the list classes of every variant, `trigger` those of every trigger).
 * `variant` is the default for the `TabsList` prop; `pillMotion` picks how the
 * segmented pill moves: `x` (default) or `xy`, both axes on transform for
 * lists that wrap or run in a column.
 */
export interface TabsConfig {
  variant?: TabsListVariant;
  pillMotion?: TabsPillMotion;
  classes?: {
    list?: string;
    size?: Partial<Record<TabsListSize, string>>;
    pill?: string;
    trigger?: string;
    content?: string;
  };
}

// `sm` shrinks the triggers from the list, so callers do not size each one.
const tabsListSizeClasses: Record<TabsListSize, string> = {
  default: "",
  sm: "[&_.t-tab]:px-2.5 [&_.t-tab]:py-1 [&_.t-tab]:text-xs",
};

const TabsListVariantContext = React.createContext<TabsListVariant>("pills");

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: TabsListVariant;
    /** `sm` makes the triggers smaller. No classes for `default`. */
    size?: TabsListSize;
  }
>(({ className, children, variant: variantProp, size, ...props }, ref) => {
  const config = useUiConfig("Tabs");
  const cn = useCn();
  const variant = variantProp ?? config?.variant ?? "pills";
  const pillMotion = config?.pillMotion ?? "x";
  const listRef = React.useRef<React.ComponentRef<
    typeof TabsPrimitive.List
  > | null>(null);
  const pillRef = React.useRef<HTMLSpanElement>(null);
  const pillReadyRef = React.useRef(false);

  const mergedRef = React.useCallback(
    (node: React.ComponentRef<typeof TabsPrimitive.List> | null) => {
      listRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  React.useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) {
      return;
    }

    const snap = () => {
      syncTabsPill(list, pill, false, pillMotion);
    };

    const animate = () => {
      syncTabsPill(list, pill, true, pillMotion);
    };

    snap();

    requestAnimationFrame(() => {
      pillReadyRef.current = true;
    });

    const onWindowResize = () => {
      snap();
    };
    window.addEventListener("resize", onWindowResize);

    const resizeObserver = new ResizeObserver(() => {
      snap();
    });
    resizeObserver.observe(list);

    const mutationObserver = new MutationObserver(() => {
      if (pillReadyRef.current) {
        animate();
      } else {
        snap();
      }
    });
    mutationObserver.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-selected"],
    });

    return () => {
      window.removeEventListener("resize", onWindowResize);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [variant, pillMotion]);

  return (
    <TabsListVariantContext value={variant}>
      <TabsPrimitive.List
        ref={mergedRef}
        className={cn(
          config?.classes?.list ?? [
            variant === "soft"
              ? "flex flex-wrap items-center justify-center gap-1.5"
              : "t-tabs max-sm:max-w-full max-sm:justify-center-safe max-sm:overflow-x-auto max-sm:scrollbar-none",
            variant === "segmented" && "t-tabs--segmented",
            variant === "pills" && "t-tabs--pills",
          ],
          config?.classes?.size?.[size ?? "default"] ?? tabsListSizeClasses[size ?? "default"],
          className,
        )}
        data-variant={variant}
        {...props}
      >
        {variant === "segmented" ? (
          <span
            ref={pillRef}
            className={config?.classes?.pill ?? "t-tabs-pill"}
            aria-hidden="true"
          />
        ) : null}
        {children}
      </TabsPrimitive.List>
    </TabsListVariantContext>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const trigger = useUiConfig("Tabs")?.classes?.trigger;
  const cn = useCn();
  const soft = React.use(TabsListVariantContext) === "soft";
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        trigger ??
          (soft
            ? "relative flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm text-muted-foreground transition-[transform,background-color] hover:bg-surface-secondary active:scale-[0.97] data-[state=active]:bg-surface-secondary data-[state=active]:text-foreground"
            : "t-tab inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"),
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  const content = useUiConfig("Tabs")?.classes?.content;
  const cn = useCn();
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        content ??
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

const tabsBarVariants = cva(
  "flex shrink-0 flex-wrap items-center gap-2 border-b border-border",
  {
    variants: {
      size: {
        default: "px-3 py-2",
        sm: "px-2 py-1.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

/**
 * Page- or panel-level tab strip: a `TabsList` on the hairline that divides it
 * from the content below, with an optional trailing `actions` slot for toolbar
 * controls. `size="sm"` for nested panels; `className` overrides the padding.
 */
const TabsBar = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> &
    VariantProps<typeof tabsBarVariants> & { actions?: React.ReactNode }
>(({ className, children, actions, size, ...props }, ref) => {
  const cn = useCn();
  return (
    <div ref={ref} className={cn(tabsBarVariants({ size }), className)} {...props}>
      {children}
      {actions ? (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
});
TabsBar.displayName = "TabsBar";

// raw radix primitives, use these when you need a tabs layout that the
// styled `tabs`/`tabslist`/`tabstrigger`/`tabscontent` defaults don't fit
// (e.g a vertical sidebar of tabs inside a popover) the styled exports
// above are tuned for horizontal pill, style tab bars
export { TabsPrimitive };

export { Tabs, TabsBar, TabsList, TabsTrigger, TabsContent };

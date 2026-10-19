import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../src/utils/cn";
import { railTileClass, railTileStateClass } from "./app-shell-classes";
import { SidebarIconTooltip } from "./SidebarIconTooltip";

export type SidebarRailProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "className"> & {
  /** Pinned at the top, above the scroll body. */
  top?: ReactNode;
  /** Scroll body. */
  children?: ReactNode;
  /** Pinned at the bottom. */
  footer?: ReactNode;
  /** Adds a right border between the rail and the panel. Default `false`. */
  showDivider?: boolean;
  /** Render the body as its single child element (for example a tabs list), with the body classes merged. */
  bodyAsChild?: boolean;
  /**
   * Render the body as a Radix tabs list (arrow-key roving focus). Use it
   * inside a Tabs root with `orientation="vertical"` and give each `RailTile`
   * a `tabValue`. Default `false`.
   */
  tabs?: boolean;
  className?: string;
  topClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
};

/** Icon rail column. Width reads `--app-shell-rail-width`; override with `className`. Other props go to the root `<div>`. */
export function SidebarRail({
  top,
  children,
  footer,
  showDivider = false,
  bodyAsChild = false,
  tabs = false,
  className,
  topClassName,
  bodyClassName,
  footerClassName,
  ...props
}: SidebarRailProps) {
  const Body = bodyAsChild ? Slot : "div";
  const bodyClass = cn(
    "flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto py-2",
    bodyClassName,
  );
  return (
    <div
      {...props}
      className={cn(
        "flex h-full w-[var(--app-shell-rail-width)] shrink-0 flex-col items-center bg-background",
        showDivider && "border-r border-separator",
        className,
      )}
    >
      {top == null ? null : (
        <div className={cn("flex w-full flex-col items-center gap-1.5 px-0 pt-3", topClassName)}>
          {top}
        </div>
      )}
      {tabs ? (
        <TabsPrimitive.List asChild={bodyAsChild} className={bodyClass}>
          {children}
        </TabsPrimitive.List>
      ) : (
        <Body className={bodyClass}>{children}</Body>
      )}
      {footer == null ? null : (
        <div className={cn("flex w-full flex-col items-center gap-1.5 py-3", footerClassName)}>
          {footer}
        </div>
      )}
    </div>
  );
}

export type RailTileProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
  /** `aria-label`, and the tooltip unless `tooltip` is set. */
  label: string;
  /** Active state. With `asChild`, also sets `aria-current="page"`. */
  active?: boolean;
  /** Tooltip text. Default `label`. */
  tooltip?: string;
  /** Default `true`. */
  showTooltip?: boolean;
  /** Rendered after the children, inside the tile (for example a count with `railBadgeClass`). */
  badge?: ReactNode;
  /** Render the single child element (for example a router link) as the tile. */
  asChild?: boolean;
  /**
   * Render a Radix tabs trigger for this value (inside a `SidebarRail tabs`).
   * The label is sr-only text instead of `aria-label`; `asChild` is ignored.
   */
  tabValue?: string;
  children: ReactNode;
};

/** Rail tile with a right-side tooltip. Renders a native `<button>`, its child with `asChild`, or a tabs trigger with `tabValue`. */
export function RailTile({
  label,
  active = false,
  tooltip,
  showTooltip = true,
  badge,
  asChild = false,
  tabValue,
  className,
  children,
  ...props
}: RailTileProps) {
  return (
    <SidebarIconTooltip label={tooltip ?? label} enabled={showTooltip}>
      {tabValue !== undefined ? (
        <TabsPrimitive.Trigger
          {...props}
          value={tabValue}
          className={cn(railTileClass, "group relative", railTileStateClass(active), className)}
        >
          {children}
          <span className="sr-only">{label}</span>
          {badge}
        </TabsPrimitive.Trigger>
      ) : asChild ? (
        <Slot
          {...props}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(railTileClass, "group", railTileStateClass(active), className)}
        >
          <Slottable>{children}</Slottable>
          {badge}
        </Slot>
      ) : (
        <button
          type="button"
          {...props}
          aria-label={label}
          className={cn(railTileClass, "group", railTileStateClass(active), className)}
        >
          {children}
          {badge}
        </button>
      )}
    </SidebarIconTooltip>
  );
}

export type RailDividerProps = { className?: string };

export function RailDivider({ className }: RailDividerProps) {
  return <div className={cn("h-px w-8 bg-separator", className)} aria-hidden />;
}

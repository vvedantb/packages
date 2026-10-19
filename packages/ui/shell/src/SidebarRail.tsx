import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpandFilled } from "@tabler/icons-react";
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

/**
 * Icon rail column. Width reads `--app-shell-rail-width`; override with `className`. Other props go to the root `<div>`.
 *
 * Legacy (still supported): the `top`, `footer`, `bodyAsChild`, `tabs` and
 * `*ClassName` props. Compose `Sidebar.Rail`, `.RailHeader`, `.RailBody` and
 * `.RailFooter` instead.
 */
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
  return (
    <Rail {...props} showDivider={showDivider} className={className}>
      {top == null ? null : <RailHeader className={topClassName}>{top}</RailHeader>}
      <RailBody asChild={bodyAsChild} tabs={tabs} className={bodyClassName}>
        {children}
      </RailBody>
      {footer == null ? null : <RailFooter className={footerClassName}>{footer}</RailFooter>}
    </Rail>
  );
}

export type SidebarRailRootProps = ComponentPropsWithoutRef<"div"> & {
  /** Adds a right border between the rail and the panel. Default `false`. */
  showDivider?: boolean;
};

/** Rail column `<div>`. Width reads `--app-shell-rail-width`. */
export function Rail({ showDivider = false, className, ...props }: SidebarRailRootProps) {
  return (
    <div
      {...props}
      className={cn(
        "flex h-full w-[var(--app-shell-rail-width)] shrink-0 flex-col items-center bg-background",
        showDivider && "border-r border-separator",
        className,
      )}
    />
  );
}

export type SidebarRailHeaderProps = ComponentPropsWithoutRef<"div">;

/** Block pinned at the top of the rail, above the scroll body. */
export function RailHeader({ className, ...props }: SidebarRailHeaderProps) {
  return <div {...props} className={cn("flex w-full flex-col items-center gap-1.5 px-0 pt-3", className)} />;
}

export type SidebarRailBodyProps = ComponentPropsWithoutRef<"div"> & {
  /** Render the body as its single child element (for example a `<nav>`), with the body classes merged. */
  asChild?: boolean;
  /**
   * Render a Radix tabs list (arrow-key roving focus). Use it inside a Tabs
   * root with `orientation="vertical"` and give each item a `tabValue`.
   */
  tabs?: boolean;
};

/** Scroll body of the rail. */
export function RailBody({ asChild = false, tabs = false, className, ...props }: SidebarRailBodyProps) {
  const bodyClass = cn("flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto py-2", className);
  if (tabs) return <TabsPrimitive.List {...props} asChild={asChild} className={bodyClass} />;
  const Body = asChild ? Slot : "div";
  return <Body {...props} className={bodyClass} />;
}

export type SidebarRailFooterProps = ComponentPropsWithoutRef<"div">;

/** Block pinned at the bottom of the rail. */
export function RailFooter({ className, ...props }: SidebarRailFooterProps) {
  return <div {...props} className={cn("flex w-full flex-col items-center gap-1.5 py-3", className)} />;
}

export type SidebarRailItemProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
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
export function RailItem({
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
}: SidebarRailItemProps) {
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

export type RailTileProps = SidebarRailItemProps;

/** Legacy name of `Sidebar.RailItem`. */
export const RailTile = RailItem;

export type SidebarRailSeparatorProps = ComponentPropsWithoutRef<"div">;

/** Short horizontal rule between rail items. */
export function RailSeparator({ className, ...props }: SidebarRailSeparatorProps) {
  return <div {...props} className={cn("h-px w-8 bg-separator", className)} aria-hidden />;
}

export type RailDividerProps = { className?: string };

/** Legacy name of `Sidebar.RailSeparator`. */
export function RailDivider({ className }: RailDividerProps) {
  return <RailSeparator className={className} />;
}

export type RailCollapseTileProps = {
  /** Panel is collapsed: shows the expand icon and "Show sidebar". */
  collapsed: boolean;
  onToggle: () => void;
};

/** Rail tile that shows or hides the sidebar panel. */
export function RailCollapseTile({ collapsed, onToggle }: RailCollapseTileProps) {
  return (
    <RailItem label={collapsed ? "Show sidebar" : "Hide sidebar"} onClick={onToggle}>
      {collapsed ? (
        <IconLayoutSidebarLeftExpandFilled className="size-[22px]" />
      ) : (
        <IconLayoutSidebarLeftCollapse className="size-[22px]" />
      )}
    </RailItem>
  );
}

import { createContext, use, useLayoutEffect, useRef, type ComponentPropsWithoutRef, type ReactNode, type RefObject } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpandFilled } from "@tabler/icons-react";
import { cn } from "../../src/utils/cn";
import { APP_ICONS } from "../../src/brand/AppIcons";
import type { ProductAppName } from "../../src/brand/AppWordmark";
import { moveTabsPillXY } from "../../src/ui/tabsSliding";
import { SIDEBAR_RAIL_APP_ICON_SIZE, railGroupClass, railGroupPillClass, railTileClass, railTileStateClass } from "./app-shell-classes";
import { SidebarIconTooltip } from "./SidebarIconTooltip";
import { toggleShellPanel } from "./shell-panel-motion";
import { useAppShellPanelDock, useAppShellVariant } from "./shell-variant";

export type SidebarRailProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "className"> & {
  /** Pinned at the top, above the scroll body. */
  top?: ReactNode;
  /** Scroll body. */
  children?: ReactNode;
  /** Pinned at the bottom. */
  footer?: ReactNode;
  /** Adds a right border between the rail and the panel. Default `false`. No effect in an `AppShell variant="rail"`. */
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
 *
 * In an `AppShell variant="rail"` each of `top`, the body and `footer` sits on
 * its own `RailGroup` trough, and `showDivider` and `RailDivider` draw nothing.
 * A `bodyAsChild` body is left as it is.
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
  const rail = useAppShellVariant() === "rail";
  const slot = (node: ReactNode) => (rail ? <RailGroup className={railSlotGroupClass}>{node}</RailGroup> : node);
  return (
    <Rail {...props} showDivider={showDivider && !rail} className={className}>
      {top == null ? null : <RailHeader className={topClassName}>{slot(top)}</RailHeader>}
      <RailBody asChild={bodyAsChild} tabs={tabs} className={bodyClassName}>
        {bodyAsChild ? children : slot(children)}
      </RailBody>
      {footer == null ? null : <RailFooter className={footerClassName}>{slot(footer)}</RailFooter>}
    </Rail>
  );
}

/** A slot's trough hides while the slot renders nothing (the pill is then its only child). */
const railSlotGroupClass = "[&:not(:has(>:not([data-rail-pill])))]:hidden";

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
  return <div {...props} className={cn("flex w-full flex-col items-center gap-1 px-0 pt-3", className)} />;
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
  const bodyClass = cn("flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-2", className);
  if (tabs) return <TabsPrimitive.List {...props} asChild={asChild} className={bodyClass} />;
  const Body = asChild ? Slot : "div";
  return <Body {...props} className={bodyClass} />;
}

/** True inside a `RailGroup`: its tiles take the segmented fills. */
const RailGroupContext = createContext(false);

/** Whether the caller sits in a `Sidebar.RailGroup`. Custom rail tiles pass it to `railTileStateClass`. */
export function useInRailGroup(): boolean {
  return use(RailGroupContext);
}

export type SidebarRailGroupProps = ComponentPropsWithoutRef<"div">;

/** Marks the active `RailItem`, so its group's pill can find it. */
const ACTIVE_TILE_SELECTOR = "[data-rail-tile][data-active]";

/**
 * Keeps the group's pill under its active tile. The first placement and any
 * resize snap; a change of active tile slides, as `TabsList` does. With no
 * active tile the pill hides, and the next one snaps in rather than sliding
 * from where the pill was last.
 */
function useRailGroupPill(groupRef: RefObject<HTMLDivElement | null>, pillRef: RefObject<HTMLSpanElement | null>) {
  useLayoutEffect(() => {
    const group = groupRef.current;
    const pill = pillRef.current;
    if (!group || !pill) return;
    let shown = false;
    const sync = (animate: boolean) => {
      const tile = group.querySelector<HTMLElement>(ACTIVE_TILE_SELECTOR);
      if (!tile) {
        pill.style.opacity = "0";
        shown = false;
        return;
      }
      moveTabsPillXY(pill, tile, animate && shown);
      pill.style.opacity = "1";
      shown = true;
    };
    sync(false);
    const resizeObserver = new ResizeObserver(() => sync(false));
    resizeObserver.observe(group);
    const mutationObserver = new MutationObserver(() => sync(true));
    mutationObserver.observe(group, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-active"] });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [groupRef, pillRef]);
}

/**
 * A group of rail tiles on one shared trough, like segmented tabs: one pill
 * slides to the active tile. Put groups in `RailHeader`, `RailBody` and
 * `RailFooter`; the space between troughs divides them, so drop
 * `RailSeparator` and `showDivider`. Centre a body group with
 * `className="justify-center-safe"` on `RailBody`.
 */
export function RailGroup({ className, children, ...props }: SidebarRailGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  useRailGroupPill(groupRef, pillRef);
  return (
    <RailGroupContext value>
      <div {...props} ref={groupRef} role="group" className={cn(railGroupClass, className)}>
        <span ref={pillRef} aria-hidden data-rail-pill="" className={railGroupPillClass} />
        {children}
      </div>
    </RailGroupContext>
  );
}

export type SidebarRailFooterProps = ComponentPropsWithoutRef<"div">;

/** Block pinned at the bottom of the rail. */
export function RailFooter({ className, ...props }: SidebarRailFooterProps) {
  return <div {...props} className={cn("flex w-full flex-col items-center gap-1 py-3", className)} />;
}

type SidebarRailItemBaseProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
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
};

export type SidebarRailItemProps = SidebarRailItemBaseProps &
  (
    | {
        /**
         * Product app id for the home tile. The tile renders `APP_ICONS[app]` at
         * `SIDEBAR_RAIL_APP_ICON_SIZE` (24px), so apps cannot drift. With `asChild` the
         * icon goes inside the child element (for example `<Link to="/" />`). Without
         * `asChild`, `children` are ignored.
         */
        app: ProductAppName;
        children?: ReactNode;
      }
    | {
        app?: undefined;
        /** The tile icon. The caller controls its size. */
        children: ReactNode;
      }
  );

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
  app,
  children,
  ...props
}: SidebarRailItemProps) {
  const grouped = use(RailGroupContext);
  const stateClass = railTileStateClass(active, grouped);
  // Markers for the group's pill; ungrouped tiles keep their old DOM.
  const groupMarks = grouped ? { "data-rail-tile": "", "data-active": active ? "" : undefined } : undefined;
  const AppIcon = app ? APP_ICONS[app] : null;
  const appIcon = AppIcon ? <AppIcon size={SIDEBAR_RAIL_APP_ICON_SIZE} /> : null;
  const content = appIcon ?? children;
  return (
    <SidebarIconTooltip label={tooltip ?? label} enabled={showTooltip}>
      {tabValue !== undefined ? (
        <TabsPrimitive.Trigger
          {...props}
          value={tabValue}
          {...groupMarks}
          className={cn(railTileClass, "group relative", stateClass, className)}
        >
          {content}
          <span className="sr-only">{label}</span>
          {badge}
        </TabsPrimitive.Trigger>
      ) : asChild ? (
        <Slot
          {...props}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          {...groupMarks}
          className={cn(railTileClass, "group", stateClass, className)}
        >
          {appIcon}
          <Slottable>{children}</Slottable>
          {badge}
        </Slot>
      ) : (
        <button
          type="button"
          {...props}
          aria-label={label}
          {...groupMarks}
          className={cn(railTileClass, "group", stateClass, className)}
        >
          {content}
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

/** Legacy name of `Sidebar.RailSeparator`. Draws nothing in an `AppShell variant="rail"`: the gap between troughs divides. */
export function RailDivider({ className }: RailDividerProps) {
  if (useAppShellVariant() === "rail") return null;
  return <RailSeparator className={className} />;
}

/** Spread on the rail tile that the panel docks into, when it is not a `RailCollapseTile`. */
export const shellDockTileProps = { "data-shell-dock-tile": "" } as const;

export type RailCollapseTileProps = {
  /** Panel is collapsed: shows the expand icon and "Show sidebar". */
  collapsed: boolean;
  onToggle: () => void;
};

/**
 * Rail tile that shows or hides the sidebar panel. In an `AppShell
 * variant="rail"` (unless `panelMotion="none"`) the panel shrinks into this
 * tile and grows back out of it (`toggleShellPanel`).
 */
export function RailCollapseTile({ collapsed, onToggle }: RailCollapseTileProps) {
  const dock = useAppShellPanelDock();
  return (
    <RailItem
      label={collapsed ? "Show sidebar" : "Hide sidebar"}
      onClick={dock ? () => toggleShellPanel(collapsed, onToggle) : onToggle}
      {...(dock ? shellDockTileProps : undefined)}
    >
      {collapsed ? (
        <IconLayoutSidebarLeftExpandFilled className="size-[22px]" />
      ) : (
        <IconLayoutSidebarLeftCollapse className="size-[22px]" />
      )}
    </RailItem>
  );
}

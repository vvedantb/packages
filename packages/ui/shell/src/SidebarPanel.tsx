import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { IconX } from "@tabler/icons-react";
import { Button, type ButtonProps } from "../../src/ui/button";
import { cn } from "../../src/utils/cn";
import { panelCloseButtonClass, sidebarHeaderRowClass, sidebarNavIconClass, sidebarNavItemClass } from "./app-shell-classes";
import { useOptionalSidebar } from "./SidebarChrome";

export type SidebarPanelProps = {
  title: string;
  /** Legacy (still supported): rendered in the header, before the close button. Compose `Sidebar.PanelActions`. */
  headerTrailing?: ReactNode;
  /** Legacy (still supported): when set, a close button follows `headerTrailing`. Pass it on the mobile drawer only. */
  onClose?: () => void;
  /** Legacy (still supported): close button label. Default `"Close navigation"`. */
  closeLabel?: string;
  /** Legacy (still supported): merged onto the close button. */
  closeButtonClassName?: string;
  /** Desktop: hides the panel (`md:hidden`) and leaves the rail. */
  collapsed?: boolean;
  className?: string;
  /** Panel body: nav, footer and so on. */
  children?: ReactNode;
};

/** Sidebar panel column beside the rail: a header and the app's body. Composed from `Sidebar.Panel` parts. */
export function SidebarPanel({
  title,
  headerTrailing,
  onClose,
  closeLabel,
  closeButtonClassName,
  collapsed = false,
  className,
  children,
}: SidebarPanelProps) {
  return (
    <Panel collapsed={collapsed} panelHidden={false} className={className}>
      <PanelHeader>
        <PanelTitle>{title}</PanelTitle>
        {headerTrailing || onClose ? (
          <PanelActions>
            {headerTrailing}
            {onClose ? (
              <PanelClose onClick={onClose} label={closeLabel} className={closeButtonClassName} />
            ) : null}
          </PanelActions>
        ) : null}
      </PanelHeader>
      {children}
    </Panel>
  );
}

export type SidebarPanelRootProps = ComponentPropsWithoutRef<"div"> & {
  /** Desktop: hides the panel (`md:hidden`). Default the `Sidebar.Root` `collapsed`, else `false`. */
  collapsed?: boolean;
  /** Renders nothing. Default the `Sidebar.Root` `panelHidden`, else `false`. */
  panelHidden?: boolean;
};

/** Panel column `<div>` beside the rail. */
export function Panel({ collapsed, panelHidden, className, ...props }: SidebarPanelRootProps) {
  const sidebar = useOptionalSidebar();
  if (panelHidden ?? sidebar?.panelHidden ?? false) return null;
  return (
    <div
      {...props}
      className={cn(
        // No border-r: the main content card floats beside this panel, so a
        // right edge line reads as a hard divider.
        "relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background",
        (collapsed ?? sidebar?.collapsed ?? false) && "md:hidden",
        className,
      )}
    />
  );
}

export type SidebarPanelHeaderProps = ComponentPropsWithoutRef<"div">;

/** Padded header row of the panel. Holds `PanelTitle` and `PanelActions`. `className` goes to the outer padding `<div>`. */
export function PanelHeader({ className, children, ...props }: SidebarPanelHeaderProps) {
  return (
    <div {...props} className={cn("px-2 pt-3", className)}>
      <div className={sidebarHeaderRowClass}>{children}</div>
    </div>
  );
}

export type SidebarPanelTitleProps = ComponentPropsWithoutRef<"h2">;

/** Panel title `<h2>`, truncated. */
export function PanelTitle({ className, ...props }: SidebarPanelTitleProps) {
  return (
    <h2
      {...props}
      className={cn(
        "min-w-0 flex-1 truncate text-left text-base font-semibold leading-none tracking-tight text-foreground",
        className,
      )}
    />
  );
}

export type SidebarPanelActionsProps = ComponentPropsWithoutRef<"div">;

/** Trailing actions in the panel header. */
export function PanelActions({ className, ...props }: SidebarPanelActionsProps) {
  return <div {...props} className={cn("flex items-center justify-end gap-0.5", className)} />;
}

export type SidebarPanelCloseProps = ButtonProps & {
  /** `aria-label`. Default `"Close navigation"`. */
  label?: string;
};

/** Ghost close button. Without `onClick` it closes the `Sidebar.Root` drawer. */
export function PanelClose({ label = "Close navigation", onClick, className, children, ...props }: SidebarPanelCloseProps) {
  const sidebar = useOptionalSidebar();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      {...props}
      onClick={onClick ?? (() => sidebar?.onMobileOpenChange(false))}
      aria-label={label}
      className={cn(panelCloseButtonClass, className)}
    >
      {children ?? <IconX className="h-4 w-4" />}
    </Button>
  );
}

export type SidebarNavItemProps = ComponentPropsWithoutRef<"button"> & {
  /** Current route: static fill, `font-medium`, `aria-current="page"`. */
  active?: boolean;
  /** Collapsed panel: centred icon, no horizontal padding. */
  iconOnly?: boolean;
  /** Leading icon element; gets `sidebarNavIconClass(active)` merged onto it. */
  icon?: ReactElement;
  /** Render the single child element (for example a router link) as the row. */
  asChild?: boolean;
};

/** Panel nav row (`sidebarNavItemClass`). Renders a native `<button>`, or its child with `asChild`. */
export function NavItem({
  active = false,
  iconOnly = false,
  icon,
  asChild = false,
  className,
  children,
  ...props
}: SidebarNavItemProps) {
  const Row = asChild ? Slot : "button";
  return (
    <Row
      type={asChild ? undefined : "button"}
      {...props}
      aria-current={active ? "page" : undefined}
      className={cn(sidebarNavItemClass({ active, iconOnly }), className)}
    >
      {icon ? <Slot className={sidebarNavIconClass(active)}>{icon}</Slot> : null}
      <Slottable>{children}</Slottable>
    </Row>
  );
}

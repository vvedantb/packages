import type { ReactNode } from "react";
import { IconX } from "@tabler/icons-react";
import { Button } from "../../src/ui/button";
import { cn } from "../../src/utils/cn";
import { panelCloseButtonClass } from "./app-shell-classes";
import { SidebarHeader } from "./SidebarHeader";

export type SidebarPanelProps = {
  title: string;
  /** Rendered in the header, before the close button. */
  headerTrailing?: ReactNode;
  /** When set, a close button follows `headerTrailing`. Pass it on the mobile drawer only. */
  onClose?: () => void;
  /** Close button label. Default `"Close navigation"`. */
  closeLabel?: string;
  /** Merged onto the close button. */
  closeButtonClassName?: string;
  /** Desktop: hides the panel (`md:hidden`) and leaves the rail. */
  collapsed?: boolean;
  className?: string;
  /** Panel body: nav, footer and so on. */
  children?: ReactNode;
};

/** Sidebar panel column beside the rail: a `SidebarHeader` and the app's body. */
export function SidebarPanel({
  title,
  headerTrailing,
  onClose,
  closeLabel = "Close navigation",
  closeButtonClassName,
  collapsed = false,
  className,
  children,
}: SidebarPanelProps) {
  const trailing =
    headerTrailing || onClose ? (
      <>
        {headerTrailing}
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={closeLabel}
            className={cn(panelCloseButtonClass, closeButtonClassName)}
          >
            <IconX className="h-4 w-4" />
          </Button>
        ) : null}
      </>
    ) : null;

  return (
    <div
      className={cn(
        // No border-r: the main content card floats beside this panel, so a
        // right edge line reads as a hard divider.
        "relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background",
        collapsed && "md:hidden",
        className,
      )}
    >
      <div className="px-2 pt-3">
        <SidebarHeader title={title} trailing={trailing} />
      </div>
      {children}
    </div>
  );
}

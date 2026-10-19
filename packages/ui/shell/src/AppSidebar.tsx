import { useEffect, useId, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { IconMenu2 } from "@tabler/icons-react";
import { Button } from "../../src/ui/button";
import { motionEase, motionTiming } from "../../src/motion/presets";
import { cn } from "../../src/utils/cn";
import { mobileMenuButtonClass } from "./app-shell-classes";
import { SidebarResizeHandle, useSidebarResizeContext } from "./SidebarResize";

export type AppSidebarProps = {
  /** Icon rail, usually a `SidebarRail`. */
  rail: ReactNode;
  /** Panel beside the rail, usually a `SidebarPanel`. Not rendered while `panelHidden`. */
  panel?: ReactNode;
  /** Desktop: show only the rail. The panel stays mounted (hide it with `SidebarPanel collapsed`). */
  collapsed?: boolean;
  /** The current section has no panel: the sidebar is rail-wide on every viewport. */
  panelHidden?: boolean;
  /** From the app's desktop media query (for example `(min-width: 768px)`). */
  isDesktop: boolean;
  /** Mobile drawer state. Owned by the app (which also closes it on route change). */
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  /** `id` of the drawer, used by the menu button `aria-controls`. Default from `useId`. */
  id?: string;
  /** Extra `data-*` attributes for the `<aside>`, for example a view-transition target. */
  asideProps?: Record<`data-${string}`, string | undefined>;
  /** Merged onto the `<aside>`. */
  className?: string;
  /** Centred in the mobile header when truthy. */
  mobileTitle?: ReactNode;
  /** Trailing actions in the mobile header, for example icon buttons. Replaces the end spacer. */
  mobileHeaderActions?: ReactNode;
  /** Menu button icon. Default a 20px menu icon. */
  mobileMenuIcon?: (open: boolean) => ReactNode;
  /** Default `"Open navigation menu"`. */
  mobileMenuLabel?: string;
  /** Backdrop label. Default `"Close navigation"`. */
  closeLabel?: string;
};

const defaultMobileMenuIcon = () => <IconMenu2 size={20} />;

/**
 * Sidebar chrome: the mobile header, the drawer backdrop and the `<aside>`
 * (fixed on desktop, a swipe-to-close drawer below it). Reads the
 * `--app-shell-*` width variables set by `AppShell`. Inside a resizable
 * `AppShell` it adds the resize handle while the panel shows on desktop.
 */
export function AppSidebar({
  rail,
  panel,
  collapsed = false,
  panelHidden = false,
  isDesktop,
  mobileOpen,
  onMobileOpenChange,
  id,
  asideProps,
  className,
  mobileTitle,
  mobileHeaderActions,
  mobileMenuIcon = defaultMobileMenuIcon,
  mobileMenuLabel = "Open navigation menu",
  closeLabel = "Close navigation",
}: AppSidebarProps) {
  const autoId = useId();
  const drawerId = id ?? autoId;
  const layout = isDesktop ? "desktop" : "drawer";
  const resize = useSidebarResizeContext();
  const showResizeHandle = resize !== null && isDesktop && !collapsed && !panelHidden;

  // Reaching the desktop breakpoint closes the drawer, so it does not reopen
  // on the way back down. Runs on breakpoint change only.
  useEffect(() => {
    if (isDesktop && mobileOpen) onMobileOpenChange(false);
  }, [isDesktop]);

  const close = () => onMobileOpenChange(false);

  const handleDrawerDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (isDesktop || !mobileOpen) return;
    if (info.offset.x < -72 || info.velocity.x < -500) {
      close();
    }
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !isDesktop && mobileOpen) {
      close();
    }
  };

  return (
    <>
      {/* Three columns keep the title centred and stop it overlapping the actions: it truncates instead. */}
      <header
        onKeyDown={closeOnEscape}
        className="fixed inset-x-0 top-0 z-30 grid h-[var(--app-shell-mobile-header-height)] grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)] items-center gap-2 bg-surface px-3 pt-[env(safe-area-inset-top,0px)] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:hidden"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMobileOpenChange(true)}
          aria-label={mobileMenuLabel}
          aria-expanded={mobileOpen}
          aria-controls={drawerId}
          className={cn(mobileMenuButtonClass, "justify-self-start")}
        >
          {mobileMenuIcon(mobileOpen)}
        </Button>
        {mobileTitle ? (
          <h1 className="pointer-events-none min-w-0 truncate text-center text-base font-semibold leading-tight tracking-tight text-foreground">
            {mobileTitle}
          </h1>
        ) : (
          <span aria-hidden="true" />
        )}
        {mobileHeaderActions ? (
          <div
            data-app-sidebar-mobile-actions=""
            className="flex shrink-0 items-center justify-self-end gap-2"
          >
            {mobileHeaderActions}
          </div>
        ) : (
          <div className="h-11 w-11 shrink-0 justify-self-end" aria-hidden="true" />
        )}
      </header>

      <AnimatePresence initial={false}>
        {mobileOpen && !isDesktop ? (
          <motion.button
            type="button"
            aria-label={closeLabel}
            className="fixed inset-0 z-40 bg-backdrop/80 md:hidden"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTiming.sidebar, ease: motionEase }}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        id={drawerId}
        data-sidebar-layout={layout}
        {...asideProps}
        inert={!isDesktop && !mobileOpen}
        onKeyDown={closeOnEscape}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex bg-background pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] md:py-0",
          panelHidden
            ? "w-[var(--app-shell-rail-width)]"
            : "w-[min(var(--app-shell-sidebar-width),calc(100vw-1.5rem))]",
          collapsed || panelHidden
            ? "md:w-[var(--app-shell-rail-width)]"
            : "md:w-[var(--app-shell-sidebar-width)]",
          !resize?.isResizing &&
            "md:transition-[width] md:[transition-duration:280ms] md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          className,
        )}
        initial={false}
        animate={{ x: isDesktop || mobileOpen ? 0 : "-100%" }}
        transition={{ duration: motionTiming.sidebar, ease: motionEase }}
        drag={!isDesktop && mobileOpen ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.45, right: 0.08 }}
        onDragEnd={handleDrawerDragEnd}
      >
        {rail}
        {panelHidden ? null : panel}
        {showResizeHandle ? <SidebarResizeHandle /> : null}
      </motion.aside>
    </>
  );
}

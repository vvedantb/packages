import {
  createContext,
  useContext,
  useEffect,
  useId,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type HTMLMotionProps, type PanInfo } from "motion/react";
import { IconMenu2 } from "@tabler/icons-react";
import { Button, type ButtonProps } from "../../src/ui/button";
import { motionEase, motionTiming } from "../../src/motion/presets";
import { cn } from "../../src/utils/cn";
import { mobileMenuButtonClass } from "./app-shell-classes";
import { SidebarResizeHandle, useSidebarResizeContext, type SidebarResizeHandleProps } from "./SidebarResize";

type SidebarContextValue = {
  isDesktop: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  collapsed: boolean;
  panelHidden: boolean;
  drawerId: string;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** The nearest `Sidebar.Root`, or `null`. */
export function useOptionalSidebar(): SidebarContextValue | null {
  return useContext(SidebarContext);
}

function useSidebar(part: string): SidebarContextValue {
  const sidebar = useContext(SidebarContext);
  if (!sidebar) throw new Error(`Sidebar.${part} must be inside Sidebar.Root`);
  return sidebar;
}

export type SidebarRootProps = {
  /** From the app's desktop media query (for example `(min-width: 768px)`). */
  isDesktop: boolean;
  /** Mobile drawer state. Owned by the app (which also closes it on route change). */
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  /** Desktop: show only the rail. `Sidebar.Panel` hides itself (`md:hidden`). Default `false`. */
  collapsed?: boolean;
  /** The current section has no panel: rail-wide on every viewport, `Sidebar.Panel` renders nothing. Default `false`. */
  panelHidden?: boolean;
  /** `id` of the drawer (`Sidebar.Aside`), used by the menu button `aria-controls`. Default from `useId`. */
  id?: string;
  children?: ReactNode;
};

/** Sidebar state for the other parts. Renders no DOM. Closes the drawer when the desktop breakpoint is reached. */
function Root({
  isDesktop,
  mobileOpen,
  onMobileOpenChange,
  collapsed = false,
  panelHidden = false,
  id,
  children,
}: SidebarRootProps) {
  const autoId = useId();

  // Reaching the desktop breakpoint closes the drawer, so it does not reopen
  // on the way back down. Runs on breakpoint change only.
  useEffect(() => {
    if (isDesktop && mobileOpen) onMobileOpenChange(false);
  }, [isDesktop]);

  return (
    <SidebarContext.Provider
      value={{ isDesktop, mobileOpen, onMobileOpenChange, collapsed, panelHidden, drawerId: id ?? autoId }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

function closeOnEscape(sidebar: SidebarContextValue, event: KeyboardEvent) {
  if (event.key === "Escape" && !sidebar.isDesktop && sidebar.mobileOpen) {
    sidebar.onMobileOpenChange(false);
  }
}

export type SidebarMobileHeaderProps = ComponentProps<"header">;

/** Fixed header below `md`. Escape inside it closes the drawer. */
function MobileHeader({ className, onKeyDown, ...props }: SidebarMobileHeaderProps) {
  const sidebar = useSidebar("MobileHeader");
  return (
    <header
      {...props}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        closeOnEscape(sidebar, event);
      }}
      className={cn(
        "fixed inset-x-0 top-0 z-30 flex h-[var(--app-shell-mobile-header-height)] items-center gap-2 bg-background/80 px-3 pt-[env(safe-area-inset-top,0px)] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] backdrop-blur-md md:hidden",
        className,
      )}
    />
  );
}

const defaultMobileMenuIcon = () => <IconMenu2 size={20} />;

export type SidebarMobileMenuButtonProps = Omit<ButtonProps, "children"> & {
  /** `aria-label`. Default `"Open navigation menu"`. */
  label?: string;
  /** Icon for the drawer state. Default a 20px menu icon. */
  icon?: (open: boolean) => ReactNode;
};

/** Opens the drawer. */
function MobileMenuButton({
  label = "Open navigation menu",
  icon = defaultMobileMenuIcon,
  className,
  onClick,
  ...props
}: SidebarMobileMenuButtonProps) {
  const sidebar = useSidebar("MobileMenuButton");
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      {...props}
      onClick={(event) => {
        onClick?.(event);
        sidebar.onMobileOpenChange(true);
      }}
      aria-label={label}
      aria-expanded={sidebar.mobileOpen}
      aria-controls={sidebar.drawerId}
      className={cn(mobileMenuButtonClass, className)}
    >
      {icon(sidebar.mobileOpen)}
    </Button>
  );
}

export type SidebarMobileTitleProps = ComponentProps<"h1">;

/** Centred title in the mobile header. Renders nothing without children. */
function MobileTitle({ className, children, ...props }: SidebarMobileTitleProps) {
  if (!children) return null;
  return (
    <h1
      {...props}
      className={cn(
        "pointer-events-none absolute inset-x-14 top-[env(safe-area-inset-top,0px)] bottom-0 flex items-center justify-center truncate text-center text-base font-semibold leading-none tracking-tight text-foreground text-balance",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export type SidebarMobileActionsProps = ComponentProps<"div">;

/** Trailing actions in the mobile header. Without children, a menu-button-sized spacer keeps the title centred. */
function MobileActions({ className, children, ...props }: SidebarMobileActionsProps) {
  if (!children) {
    return <div {...props} className={cn("ml-auto h-11 w-11 shrink-0", className)} aria-hidden="true" />;
  }
  return (
    <div
      data-app-sidebar-mobile-actions=""
      {...props}
      className={cn("ml-auto flex shrink-0 items-center gap-2", className)}
    >
      {children}
    </div>
  );
}

export type SidebarBackdropProps = Omit<HTMLMotionProps<"button">, "children"> & {
  /** `aria-label`. Default `"Close navigation"`. */
  label?: string;
};

/** Drawer backdrop below `md`; a click closes the drawer. Fades in and out. */
function Backdrop({ label = "Close navigation", className, onClick, ...props }: SidebarBackdropProps) {
  const sidebar = useSidebar("Backdrop");
  return (
    <AnimatePresence initial={false}>
      {sidebar.mobileOpen && !sidebar.isDesktop ? (
        <motion.button
          type="button"
          aria-label={label}
          {...props}
          className={cn("fixed inset-0 z-40 bg-backdrop/80 md:hidden", className)}
          onClick={(event) => {
            onClick?.(event);
            sidebar.onMobileOpenChange(false);
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTiming.sidebar, ease: motionEase }}
        />
      ) : null}
    </AnimatePresence>
  );
}

export type SidebarAsideProps = HTMLMotionProps<"aside">;

/**
 * The `<aside>`: fixed on desktop, a swipe-to-close drawer below it. Width
 * reads the `--app-shell-*` variables. `id` overrides the Root drawer id
 * (keep them equal so `aria-controls` points here).
 */
function Aside({ id, className, onKeyDown, children, ...props }: SidebarAsideProps) {
  const sidebar = useSidebar("Aside");
  const resize = useSidebarResizeContext();
  const { isDesktop, mobileOpen, collapsed, panelHidden } = sidebar;

  const handleDrawerDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isDesktop || !mobileOpen) return;
    if (info.offset.x < -72 || info.velocity.x < -500) {
      sidebar.onMobileOpenChange(false);
    }
  };

  return (
    <motion.aside
      id={id ?? sidebar.drawerId}
      data-sidebar-layout={isDesktop ? "desktop" : "drawer"}
      {...props}
      inert={!isDesktop && !mobileOpen}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        closeOnEscape(sidebar, event);
      }}
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
      {children}
    </motion.aside>
  );
}

export type SidebarResizeHandlePartProps = SidebarResizeHandleProps;

/**
 * `SidebarResizeHandle` inside a resizable `AppShell`. Under a `Sidebar.Root`
 * it shows only on desktop while the panel shows (not collapsed or hidden).
 * Place it inside `Sidebar.Aside`.
 */
function ResizeHandle(props: SidebarResizeHandlePartProps) {
  const sidebar = useOptionalSidebar();
  const resize = useSidebarResizeContext();
  const show =
    resize !== null &&
    (sidebar === null || (sidebar.isDesktop && !sidebar.collapsed && !sidebar.panelHidden));
  return show ? <SidebarResizeHandle {...props} /> : null;
}

export const SidebarChromeParts = {
  Root,
  MobileHeader,
  MobileMenuButton,
  MobileTitle,
  MobileActions,
  Backdrop,
  Aside,
  ResizeHandle,
};

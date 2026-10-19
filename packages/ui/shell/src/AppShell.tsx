import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../src/utils/cn";
import {
  SidebarResizeProvider,
  useSidebarResizeState,
  type SidebarResizeOptions,
} from "./SidebarResize";

export type AppShellProps = {
  /** Rendered between the skip link and `<main>`, usually an `AppSidebar`. */
  sidebar?: ReactNode;
  children?: ReactNode;
  /**
   * `true` when only the rail shows on desktop (sidebar collapsed, or the
   * current section has no panel). Main then offsets by the rail width
   * instead of the sidebar width.
   */
  panelHidden?: boolean;
  /** Sets `--app-shell-rail-width`. Default `"4rem"`. */
  railWidth?: string;
  /** Sets `--app-shell-sidebar-width` (rail plus panel). Default `"20rem"`. Ignored with `resizable`. */
  sidebarWidth?: string;
  /**
   * Opt-in resizable panel. The shell owns the persisted panel width, sets
   * `--app-shell-sidebar-width` to `calc(<railWidth> + <width>px)` and shares
   * the state with `AppSidebar`, `SidebarResizeHandle` and `useAppShellResize`.
   */
  resizable?: SidebarResizeOptions;
  /** Sets `--app-shell-mobile-header-height`. Default `"calc(3.5rem + env(safe-area-inset-top, 0px))"`. */
  mobileHeaderHeight?: string;
  /** Default `"Skip to main content"`. */
  skipLinkLabel?: string;
  /** `id` of `<main>` and the skip link target. Default `"main-content"`. */
  mainId?: string;
  className?: string;
  mainClassName?: string;
  /** Merged onto the content card inside `<main>`. */
  contentClassName?: string;
};

type ShellVars = CSSProperties & Record<`--app-shell-${string}`, string>;

/** Full-height app frame: skip link, a sidebar slot and the main content card. */
export function AppShell({
  sidebar,
  children,
  panelHidden = false,
  railWidth = "4rem",
  sidebarWidth = "20rem",
  resizable,
  mobileHeaderHeight = "calc(3.5rem + env(safe-area-inset-top, 0px))",
  skipLinkLabel = "Skip to main content",
  mainId = "main-content",
  className,
  mainClassName,
  contentClassName,
}: AppShellProps) {
  const resize = useSidebarResizeState(resizable);
  const style: ShellVars = {
    "--app-shell-rail-width": railWidth,
    "--app-shell-sidebar-width": resize ? `calc(${railWidth} + ${resize.width}px)` : sidebarWidth,
    "--app-shell-mobile-header-height": mobileHeaderHeight,
  };
  return (
    <SidebarResizeProvider value={resize}>
      <div className={cn("relative h-dvh overflow-hidden bg-background", className)} style={style}>
        <a
          href={`#${mainId}`}
          className="sr-only focus:absolute focus:left-3 focus:top-[max(0.75rem,env(safe-area-inset-top))] focus:z-[100] focus:block focus:rounded-lg focus:bg-surface-secondary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {skipLinkLabel}
        </a>
        {sidebar}
        <main
          id={mainId}
          tabIndex={-1}
          className={cn(
            "relative z-10 flex h-full min-h-0 outline-none md:p-2",
            panelHidden
              ? "md:ml-[var(--app-shell-rail-width)]"
              : "md:ml-[var(--app-shell-sidebar-width)]",
            !resize?.isResizing &&
              "md:transition-[margin-left] md:[transition-duration:280ms] md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
            mainClassName,
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden bg-surface pt-[var(--app-shell-mobile-header-height)] md:rounded-lg md:pt-0",
              contentClassName,
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </SidebarResizeProvider>
  );
}

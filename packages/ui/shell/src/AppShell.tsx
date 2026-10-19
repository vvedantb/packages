import { createContext, useContext, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../src/utils/cn";
import {
  SidebarResizeProvider,
  useSidebarResizeContext,
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

type AppShellContextValue = { mainId: string; panelHidden: boolean };

const AppShellContext = createContext<AppShellContextValue>({
  mainId: "main-content",
  panelHidden: false,
});

export type AppShellRootProps = ComponentProps<"div"> &
  Pick<AppShellProps, "panelHidden" | "railWidth" | "sidebarWidth" | "resizable" | "mobileHeaderHeight" | "mainId">;

/** Frame `<div>`: sets the `--app-shell-*` variables and owns the resize state. `style` merges over the variables. */
function Root({
  panelHidden = false,
  railWidth = "4rem",
  sidebarWidth = "20rem",
  resizable,
  mobileHeaderHeight = "calc(3.5rem + env(safe-area-inset-top, 0px))",
  mainId = "main-content",
  className,
  style,
  ...props
}: AppShellRootProps) {
  const resize = useSidebarResizeState(resizable);
  const vars: ShellVars = {
    "--app-shell-rail-width": railWidth,
    "--app-shell-sidebar-width": resize ? `calc(${railWidth} + ${resize.width}px)` : sidebarWidth,
    "--app-shell-mobile-header-height": mobileHeaderHeight,
  };
  return (
    <AppShellContext.Provider value={{ mainId, panelHidden }}>
      <SidebarResizeProvider value={resize}>
        <div
          {...props}
          className={cn("relative h-dvh overflow-hidden bg-background", className)}
          style={{ ...vars, ...style }}
        />
      </SidebarResizeProvider>
    </AppShellContext.Provider>
  );
}

export type AppShellSkipLinkProps = Omit<ComponentProps<"a">, "children" | "href"> & {
  /** Default `"Skip to main content"`. */
  label?: ReactNode;
  /** Default the Root `mainId`. */
  targetId?: string;
};

/** Visually hidden link to `<main>`, shown on focus. */
function SkipLink({ label = "Skip to main content", targetId, className, ...props }: AppShellSkipLinkProps) {
  const { mainId } = useContext(AppShellContext);
  return (
    <a
      href={`#${targetId ?? mainId}`}
      {...props}
      className={cn(
        "sr-only focus:absolute focus:left-3 focus:top-[max(0.75rem,env(safe-area-inset-top))] focus:z-[100] focus:block focus:rounded-lg focus:bg-surface-secondary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
        className,
      )}
    >
      {label}
    </a>
  );
}

export type AppShellMainProps = ComponentProps<"main">;

/** `<main>`, offset by the sidebar (or rail while the Root `panelHidden`). `id` defaults to the Root `mainId`. */
function Main({ id, className, ...props }: AppShellMainProps) {
  const { mainId, panelHidden } = useContext(AppShellContext);
  const resize = useSidebarResizeContext();
  return (
    <main
      id={id ?? mainId}
      tabIndex={-1}
      {...props}
      className={cn(
        "relative z-10 flex h-full min-h-0 outline-none md:p-2",
        panelHidden ? "md:ml-[var(--app-shell-rail-width)]" : "md:ml-[var(--app-shell-sidebar-width)]",
        !resize?.isResizing &&
          "md:transition-[margin-left] md:[transition-duration:280ms] md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
        className,
      )}
    />
  );
}

export type AppShellContentProps = ComponentProps<"div">;

/** Content card inside `<main>`. Pads for the mobile header below `md`. */
function Content({ className, ...props }: AppShellContentProps) {
  return (
    <div
      {...props}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-surface pt-[var(--app-shell-mobile-header-height)] md:rounded-lg md:pt-0",
        className,
      )}
    />
  );
}

/**
 * Legacy (still supported): full-height app frame with a skip link, a sidebar
 * slot and the main content card. Composed from `AppShell.Root`, `.SkipLink`,
 * `.Main` and `.Content`.
 */
function LegacyAppShell({
  sidebar,
  children,
  panelHidden = false,
  railWidth,
  sidebarWidth,
  resizable,
  mobileHeaderHeight,
  skipLinkLabel,
  mainId = "main-content",
  className,
  mainClassName,
  contentClassName,
}: AppShellProps) {
  return (
    <Root
      panelHidden={panelHidden}
      railWidth={railWidth}
      sidebarWidth={sidebarWidth}
      resizable={resizable}
      mobileHeaderHeight={mobileHeaderHeight}
      mainId={mainId}
      className={className}
    >
      <SkipLink label={skipLinkLabel} targetId={mainId} />
      {sidebar}
      <Main id={mainId} className={mainClassName}>
        <Content className={contentClassName}>{children}</Content>
      </Main>
    </Root>
  );
}
LegacyAppShell.displayName = "AppShell";

/** App frame. Call it with props (legacy), or compose `AppShell.Root`, `.SkipLink`, `.Main` and `.Content`. */
export const AppShell = Object.assign(LegacyAppShell, { Root, SkipLink, Main, Content });

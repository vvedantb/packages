import type { ReactNode } from "react";
import { SidebarChromeParts as Parts } from "./SidebarChrome";

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

/**
 * Sidebar chrome: the mobile header, the drawer backdrop and the `<aside>`
 * (fixed on desktop, a swipe-to-close drawer below it). Reads the
 * `--app-shell-*` width variables set by `AppShell`. Inside a resizable
 * `AppShell` it adds the resize handle while the panel shows on desktop.
 *
 * Legacy (still supported): the `rail`, `panel` and `mobile*` slot props.
 * Compose `Sidebar.Root`, `.MobileHeader`, `.Backdrop`, `.Aside` and
 * `.ResizeHandle` instead.
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
  mobileMenuIcon,
  mobileMenuLabel,
  closeLabel,
}: AppSidebarProps) {
  return (
    <Parts.Root
      isDesktop={isDesktop}
      mobileOpen={mobileOpen}
      onMobileOpenChange={onMobileOpenChange}
      collapsed={collapsed}
      panelHidden={panelHidden}
      id={id}
    >
      <Parts.MobileHeader>
        <Parts.MobileMenuButton label={mobileMenuLabel} icon={mobileMenuIcon} />
        <Parts.MobileTitle>{mobileTitle}</Parts.MobileTitle>
        <Parts.MobileActions>{mobileHeaderActions}</Parts.MobileActions>
      </Parts.MobileHeader>
      <Parts.Backdrop label={closeLabel} />
      <Parts.Aside {...asideProps} className={className}>
        {rail}
        {panelHidden ? null : panel}
        <Parts.ResizeHandle />
      </Parts.Aside>
    </Parts.Root>
  );
}

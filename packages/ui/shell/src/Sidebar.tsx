import { SidebarChromeParts } from "./SidebarChrome";
import { SidebarIconTooltip } from "./SidebarIconTooltip";
import {
  AccountAvatar,
  AccountBadge,
  AccountContent,
  AccountLabel,
  AccountMenu,
  AccountSeparator,
  AccountTrigger,
} from "./SidebarAccountMenu";
import { Panel, PanelActions, PanelClose, PanelHeader, PanelTitle } from "./SidebarPanel";
import { Rail, RailBody, RailFooter, RailHeader, RailItem, RailSeparator } from "./SidebarRail";

export type {
  SidebarAsideProps,
  SidebarBackdropProps,
  SidebarMobileActionsProps,
  SidebarMobileHeaderProps,
  SidebarMobileMenuButtonProps,
  SidebarMobileTitleProps,
  SidebarResizeHandlePartProps,
  SidebarRootProps,
} from "./SidebarChrome";
export type {
  SidebarRailBodyProps,
  SidebarRailFooterProps,
  SidebarRailHeaderProps,
  SidebarRailItemProps,
  SidebarRailRootProps,
  SidebarRailSeparatorProps,
} from "./SidebarRail";
export type {
  SidebarPanelActionsProps,
  SidebarPanelCloseProps,
  SidebarPanelHeaderProps,
  SidebarPanelRootProps,
  SidebarPanelTitleProps,
} from "./SidebarPanel";
export type {
  SidebarAccountAvatarProps,
  SidebarAccountBadgeProps,
  SidebarAccountContentProps,
  SidebarAccountLabelProps,
  SidebarAccountMenuRootProps,
  SidebarAccountSeparatorProps,
  SidebarAccountTriggerProps,
} from "./SidebarAccountMenu";

/**
 * Composable sidebar parts. `Sidebar.Root` holds the drawer and layout state;
 * the chrome, rail, panel and account parts read it. See the README
 * "Composable parts" section for a full shell.
 */
export const Sidebar = {
  ...SidebarChromeParts,
  Rail,
  RailHeader,
  RailBody,
  RailFooter,
  /** Alias of `RailFooter`. */
  Footer: RailFooter,
  RailItem,
  RailSeparator,
  Tooltip: SidebarIconTooltip,
  Panel,
  PanelHeader,
  PanelTitle,
  PanelActions,
  PanelClose,
  AccountMenu,
  AccountTrigger,
  AccountAvatar,
  AccountContent,
  AccountLabel,
  AccountSeparator,
  AccountBadge,
};

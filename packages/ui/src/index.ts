// Colour, radius, shadow and font tokens live in @vvedantb/ui/tokens. Import that
// stylesheet in the app. This package does not ship a second token set.
export { cn } from "./utils/cn";
export { floatingSurfaceClass } from "./ui/_menu-classes";
export * from "./ui/surface-classes";
export * from "./motion/presets";
export * from "./motion/panel-transition";
export { restoreModalScrollLock } from "./ui/overlay-a11y";

export * from "./ui/badge";
export * from "./ui/breadcrumb";
export * from "./ui/button";
export * from "./ui/button-group";
export * from "./ui/card";
export * from "./ui/carousel";
export * from "./ui/checkbox";
export * from "./ui/collapsible";
export * from "./ui/command";
export * from "./ui/context-menu";
export * from "./ui/dialog";
export * from "./ui/alert-dialog";
export * from "./ui/confirm-dialog";
export * from "./ui/dropdown-menu";
export * from "./ui/empty-state";
export * from "./ui/hover-card";
export * from "./ui/input";
export * from "./ui/label";
export * from "./ui/labeled-switch-row";
export * from "./ui/pagination";
export * from "./ui/popover";
export * from "./ui/progress";
export {
  Select as RadixSelect,
  SelectContent as RadixSelectContent,
  SelectGroup as RadixSelectGroup,
  SelectItem as RadixSelectItem,
  SelectLabel as RadixSelectLabel,
  SelectScrollDownButton as RadixSelectScrollDownButton,
  SelectScrollUpButton as RadixSelectScrollUpButton,
  SelectSeparator as RadixSelectSeparator,
  SelectTrigger as RadixSelectTrigger,
  SelectValue as RadixSelectValue,
} from "./ui/radix-select";
export * from "./ui/search-input";
export * from "./ui/select";
export * from "./ui/select-field";
export * from "./ui/separator";
export * from "./ui/skeleton";
export * from "./ui/slide-over-panel";
export * from "./ui/sonner";
export * from "./ui/spinner";
export * from "./ui/switch";
export * from "./ui/table";
export * from "./ui/tabs";
export * from "./ui/textarea";
export * from "./ui/toolbar-search-input";
export * from "./ui/time-picker";
export * from "./ui/tooltip";
export * from "./ui/kbd";
export * from "./ui/sheet";
export * from "./ui/visually-hidden";
export * from "./ui/clearInputDissolve";

// Animated nav icons. Styles: `@vvedantb/ui/tokens/css/nav-icons.css`.
export * from "./icons";

// Dual copies: the richer file uses the plain name; the other keeps an `Alt` suffix.
export * from "./ui/accordion";
export {
  Accordion as AccordionAlt,
  AccordionItem as AccordionItemAlt,
  AccordionTrigger as AccordionTriggerAlt,
  AccordionContent as AccordionContentAlt,
} from "./ui/accordion.alt";
export * from "./ui/clear-input";
export { ClearInput as ClearInputAlt } from "./ui/clear-input.alt";
export * from "./ui/input-group";
export {
  InputGroup as InputGroupAlt,
  InputGroupAddon as InputGroupAddonAlt,
  InputGroupButton as InputGroupButtonAlt,
  InputGroupText as InputGroupTextAlt,
  InputGroupInput as InputGroupInputAlt,
  InputGroupTextarea as InputGroupTextareaAlt,
} from "./ui/input-group.alt";
export * from "./ui/scroll-area";
export {
  ScrollArea as ScrollAreaAlt,
  ScrollBar as ScrollBarAlt,
} from "./ui/scroll-area.alt";

export * from "./ai-elements/artifact";
export * from "./ai-elements/attachments";
export * from "./ai-elements/chain-of-thought";
export * from "./ai-elements/code-block";
export * from "./ai-elements/conversation";
export * from "./ai-elements/image";
export * from "./ai-elements/inline-citation";
export * from "./ai-elements/message";
export * from "./ai-elements/model-selector";
export * from "./ai-elements/prompt-input";
export * from "./ai-elements/queue";
export * from "./ai-elements/reasoning";
export * from "./ai-elements/shimmer";
export * from "./ai-elements/sources";
export * from "./ai-elements/speech-input";
export * from "./ai-elements/suggestion";

export * from "./audio";

export * from "./composer";
export { toast } from "sonner";

// Shell: router-free pieces. Shell's own `cn` and `ClassValue` are not re-exported;
// use the root `cn` (clsx + tailwind-merge).
export { SidebarHeader } from "../shell/src/SidebarHeader";
export type { SidebarHeaderProps } from "../shell/src/SidebarHeader";
export { PillTabs } from "../shell/src/PillTabs";
export type { PillTabItem, PillTabsProps } from "../shell/src/PillTabs";
export { SessionsHoverCard } from "../shell/src/SessionsHoverCard";
export type {
  SessionsHoverCardContext,
  SessionsHoverCardProps,
  SessionsHoverCardSurface,
} from "../shell/src/SessionsHoverCard";

// App shell: sidebar and main page layout. Widths come from the
// `--app-shell-*` CSS variables that `AppShell` sets.
export { AppShell } from "../shell/src/AppShell";
export type {
  AppShellContentProps,
  AppShellMainProps,
  AppShellProps,
  AppShellRootProps,
  AppShellSkipLinkProps,
} from "../shell/src/AppShell";
export { AppSidebar } from "../shell/src/AppSidebar";
export type { AppSidebarProps } from "../shell/src/AppSidebar";
// Composable sidebar parts (`Sidebar.Root`, `Sidebar.Rail`, ...) and their prop types.
export * from "../shell/src/Sidebar";
export { SidebarRail, RailTile, RailDivider, RailCollapseTile } from "../shell/src/SidebarRail";
export type {
  SidebarRailProps,
  RailTileProps,
  RailDividerProps,
  RailCollapseTileProps,
} from "../shell/src/SidebarRail";
export { SidebarResizeHandle, useAppShellResize } from "../shell/src/SidebarResize";
export type {
  AppShellResize,
  SidebarResizeHandleProps,
  SidebarResizeOptions,
} from "../shell/src/SidebarResize";
export { SidebarIconTooltip } from "../shell/src/SidebarIconTooltip";
export type { SidebarIconTooltipProps } from "../shell/src/SidebarIconTooltip";
export { SidebarPanel } from "../shell/src/SidebarPanel";
export type { SidebarPanelProps } from "../shell/src/SidebarPanel";
export { SidebarAccountMenu, SidebarAccountMenuPlaceholder } from "../shell/src/SidebarAccountMenu";
export type {
  SidebarAccountMenuProps,
  SidebarAccountMenuPlaceholderProps,
} from "../shell/src/SidebarAccountMenu";
export { SignOutDialog } from "../shell/src/SignOutDialog";
export type { SignOutDialogProps } from "../shell/src/SignOutDialog";
export {
  railBadgeClass,
  railTileClass,
  railTileStateClass,
  sidebarNavIconClass,
  sidebarNavItemActionsClass,
  sidebarNavItemClass,
  sidebarNavItemIndentStyle,
  sidebarNavItemLabelClass,
  sidebarNavItemLeadingClass,
  sidebarNavItemSubtitleClass,
  sidebarNavItemTrailingClass,
  sidebarNavLinkTextClass,
  sidebarNavRowClass,
  sidebarSectionLabelClass,
} from "../shell/src/app-shell-classes";
export type { SidebarNavItemClassOptions } from "../shell/src/app-shell-classes";

// Marketing: landing kit, site footer and pricing dialog. Router- and Motion-free;
// `createLandingKit` takes the app's `motion`. Styles: `@vvedantb/ui/landing.css`.
export {
  LandingFeatureCard,
  LandingFooter,
  LandingLattice,
  LandingNavMenu,
  LandingPageLayout,
  LandingSection,
  LandingSectionHeading,
  landingItemVariants,
} from "./marketing/landing";
export type {
  LandingFeature,
  LandingFooterProps,
  LandingLatticeProps,
  LandingLink,
  LandingNavMenuProps,
  LandingPageLayoutProps,
  LandingSectionHeadingProps,
  LandingSectionProps,
} from "./marketing/landing";
export { createLandingKit } from "./marketing/createLandingKit";
export type {
  LandingCtaProps,
  LandingHeroProps,
  LandingKit,
  LandingKitOptions,
  LandingMotion,
  LandingNavProps,
  LandingRevealItemProps,
  LandingRevealProps,
} from "./marketing/createLandingKit";
export {
  landingFooterButtonClass,
  landingFooterLinkClass,
  landingPanelClass,
  landingShellClass,
} from "./marketing/marketing-classes";
export type { PricingModalTone, SiteFooterVariant } from "./marketing/marketing-classes";
export { SiteFooter } from "./marketing/SiteFooter";
export type { SiteFooterLink, SiteFooterProps, SiteFooterSocial } from "./marketing/SiteFooter";
export { PricingModal } from "./marketing/PricingModal";
export type { PricingModalProps } from "./marketing/PricingModal";

// App helpers: confirm skip, update watcher, settings chrome, stable auth, Convex provider, VITE env and ensure-user.
export * from "../app/src/index";

// Native tokens (JS values that match tokens.css).
export { tokens } from "../tokens/src/native";
export type { Tokens } from "../tokens/src/native";

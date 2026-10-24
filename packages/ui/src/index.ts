// Colour, radius, shadow and font tokens live in @vvedantb/ui/tokens. Import that
// stylesheet in the app. This package does not ship a second token set.
export { cn } from "./utils/cn";
export { UiConfigProvider, useUiConfig } from "./ui/ui-config";
export type { UiConfig, UiConfigProviderProps } from "./ui/ui-config";
export { floatingSurfaceClass } from "./ui/_menu-classes";
export { fieldFocusClass, fieldFocusWithinClass } from "./ui/_field-classes";
export * from "./ui/surface-classes";
export * from "./motion/presets";
export * from "./motion/panel-transition";
// Gesture physics and animation budget helpers (shared clock, on-screen and
// page-visibility pausing for infinite animations).
export { DRAG_ACTIVATION_DISTANCE_PX, projectVelocity, rubberband } from "./utils/gesture";
export {
  bindRuntimeAnimation,
  ensureRuntimeVisibility,
  observeAnimVisibility,
  useAnimOffscreenRef,
} from "./utils/runtimeVisibility";
export { msUntilNextBoundary, quantizedSnapshot, subscribeQuantized } from "./utils/sharedClock";
export { CAT_SLOT_COUNT, catColorForId, catColorForSlot, catSlotForId } from "./utils/cat-color";
export type { CatColorClasses, CatSlot } from "./utils/cat-color";
export { CONTROL_RADIUS_CLASS, SURFACE_RADIUS_CLASS } from "./utils/surface-radius";
export { restoreModalScrollLock } from "./ui/overlay-a11y";

export * from "./ui/avatar";
export * from "./ui/badge";
export * from "./ui/border-beam";
export * from "./ui/breadcrumb";
export * from "./ui/button";
export * from "./ui/button-group";
export * from "./ui/card";
export * from "./ui/carousel";
export * from "./ui/centered-spinner";
export * from "./ui/checkbox";
export * from "./ui/collapsible";
export * from "./ui/command";
export * from "./ui/context-menu";
export * from "./ui/crossfade-icon";
export * from "./ui/dialog";
export * from "./ui/alert-dialog";
export * from "./ui/confirm-dialog";
export * from "./ui/dropdown-menu";
export * from "./ui/empty-state";
export * from "./ui/hover-card";
export * from "./ui/input";
export * from "./ui/label";
export * from "./ui/labeled-slider-row";
export * from "./ui/labeled-switch-row";
export * from "./ui/list-row";
export * from "./ui/loading-state";
export * from "./ui/pagination";
export * from "./ui/popover";
export * from "./ui/progress";
export * from "./ui/refresh-spin-icon";
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
export * from "./ui/slider";
export * from "./ui/sonner";
export * from "./ui/spinner";
export * from "./ui/status-dot";
export * from "./ui/surface";
export * from "./ui/switch";
export * from "./ui/table";
export * from "./ui/tabs";
export * from "./ui/textarea";
export * from "./ui/toolbar-search-input";
export * from "./ui/time-picker";
export * from "./ui/calendar";
export * from "./ui/date-picker";
export * from "./ui/tooltip";
export * from "./ui/kbd";
export * from "./ui/sheet";
export * from "./ui/visually-hidden";
export * from "./ui/clearInputDissolve";

// Animated nav icons. Styles: `@vvedantb/ui/tokens/css/nav-icons.css`.
export * from "./icons";

// Dual copies: the richer file uses the plain name. The deprecated `Alt` exports
// (accordion, clear input, input group) wrap the main parts with the old markup.
export * from "./ui/accordion";
export {
  AccordionAlt,
  AccordionItemAlt,
  AccordionTriggerAlt,
  AccordionContentAlt,
} from "./ui/accordion.alt";
export * from "./ui/clear-input";
export { ClearInputAlt } from "./ui/clear-input.alt";
export * from "./ui/input-group";
export {
  InputGroupAlt,
  InputGroupAddonAlt,
  InputGroupButtonAlt,
  InputGroupTextAlt,
  InputGroupInputAlt,
  InputGroupTextareaAlt,
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
export * from "./ai-elements/file-chip";
export * from "./ai-elements/image";
export * from "./ai-elements/inline-citation";
export * from "./ai-elements/message";
export * from "./ai-elements/model-selector";
export * from "./ai-elements/prompt-input";
export * from "./ai-elements/prompt-input-settings";
export * from "./ai-elements/prompt-input-speech";
export * from "./ai-elements/prompt-input-traits";
export * from "./ai-elements/queue";
export * from "./ai-elements/reasoning";
export * from "./ai-elements/shimmer";
export * from "./ai-elements/sources";
export * from "./ai-elements/speech-input";
export * from "./ai-elements/suggestion";

// Agent activity and run surfaces (moved from eva): the activity timeline and
// its step model, Trace lines, plan, test results, web preview, context usage
// and the model picker.
export * from "./ai-elements/activity-shared";
export * from "./ai-elements/activity-question";
export * from "./ai-elements/activity-tasks";
export * from "./ai-elements/trace";
export * from "./ai-elements/use-streaming-disclosure";
export * from "./ai-elements/plan";
export * from "./ai-elements/test-results";
export * from "./ai-elements/web-preview";
export * from "./ai-elements/context";
export * from "./ai-elements/model-picker";
export * from "./ai-elements/provider-icon";

// Artifact viewers: frame with the state bridge, card, list, toolbar, viewer.
// The core (schemas, state ops, document wrapper) comes from `@vvedantb/server`.
export * from "./artifacts";

// Kibo UI blocks: gantt, kanban, list, contribution graph, video player,
// cursor, avatar stack, theme switcher. Kanban, list and gantt drag with
// `useDragSensors`, the shared dnd-kit sensor split.
export * from "./kibo";
export { useDragSensors } from "./utils/useDragSensors";

// Markdown renderer (Streamdown + code blocks, callouts, links, KaTeX).
// Styles: `@vvedantb/ui/tokens/css/markdown.css`.
export * from "./markdown";

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

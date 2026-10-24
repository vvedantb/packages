import { expect, test } from "vitest";
import * as root from "./index";

test("root exposes former subpath APIs", () => {
  for (const name of [
    "cn", "toast", "SonnerToaster", "playChime", "useReplyChime", "InputArea",
    "SidebarHeader", "PillTabs", "SessionsHoverCard",
    "requestConfirm", "useRequestConfirm", "startUpdateAvailableWatcher",
    "SettingsPage", "useStableAuth", "tokens",
    "SlideOverPanel", "ToolbarSearchInput", "ConfirmDialog", "SettingsField",
    "CardHeader", "SelectField", "FadePresence", "PanelTransition",
    "restoreModalScrollLock", "springTransition", "springFastTransition", "fadeUpSpring",
    "AppShell", "AppSidebar", "SidebarRail", "RailTile", "RailDivider", "SidebarIconTooltip",
    "SidebarResizeHandle", "useAppShellResize",
    "SidebarPanel", "SidebarAccountMenu", "SidebarAccountMenuPlaceholder", "SignOutDialog",
    "railTileClass", "railTileStateClass", "railBadgeClass",
    "sidebarNavRowClass", "sidebarNavLinkTextClass", "sidebarSectionLabelClass",
    "sidebarNavItemClass", "sidebarNavIconClass", "sidebarNavItemIndentStyle",
    "sidebarNavItemLeadingClass", "sidebarNavItemLabelClass", "sidebarNavItemSubtitleClass",
    "sidebarNavItemTrailingClass", "sidebarNavItemActionsClass",
    "Sidebar", "useConfirmDialog",
    "createThemeProvider", "getSystemTheme", "applyThemeClass", "createPageTitleContext",
    "PageMotionProvider", "useDisablePageMotion", "formatCompactRelativeTime",
    "createLandingKit", "LandingPageLayout", "LandingSection", "LandingSectionHeading", "LandingLattice",
    "LandingFeatureCard", "LandingNavMenu", "LandingFooter", "landingShellClass", "landingPanelClass",
    "landingItemVariants", "landingFooterLinkClass", "landingFooterButtonClass",
    "SiteFooter", "PricingModal", "RailCollapseTile",
    "ConvexClerkProvider", "parseClientEnv", "VITE_ENV_NAMES", "useEnsureUser",
    "Slider", "LabeledSliderRow", "SearchInput", "fieldFocusClass", "fieldFocusWithinClass",
    "ModelPicker", "AgentTrace", "AgentPlan", "TestResult", "TestResultErrorStack", "ContextUsage",
    "ContextUsageCacheRead", "getRandomActivityVerb", "activityStepHasRichDetail",
    "SortableListProvider", "SortableListItem", "LiveCursor", "LiveCursorPointer",
  ]) {
    expect(root, name).toHaveProperty(name);
  }
});

test("root exposes the composable parts as namespace members", () => {
  const parts: [string, object, string[]][] = [
    ["ConfirmDialog", root.ConfirmDialog, [
      "Root", "Content", "Header", "Title", "Description", "Body", "Footer", "Cancel", "Action", "Field",
    ]],
    ["AppShell", root.AppShell, ["Root", "SkipLink", "Main", "Content"]],
    ["Sidebar", root.Sidebar, [
      "Root", "MobileHeader", "MobileMenuButton", "MobileTitle", "MobileActions", "Backdrop", "Aside",
      "Rail", "RailHeader", "RailBody", "RailFooter", "Footer", "RailItem", "RailSeparator", "Tooltip",
      "Panel", "PanelHeader", "PanelTitle", "PanelActions", "PanelClose", "NavItem", "NavItemLeading", "NavItemLabel", "NavItemTrailing", "NavItemActions",
      "ResizeHandle",
      "AccountMenu", "AccountTrigger", "AccountAvatar", "AccountContent", "AccountLabel",
      "AccountSeparator", "AccountBadge",
    ]],
  ];
  for (const [namespace, value, names] of parts) {
    for (const name of names) expect(value, `${namespace}.${name}`).toHaveProperty(name);
  }
  expect(typeof root.ConfirmDialog).toBe("function");
  expect(typeof root.AppShell).toBe("function");
});

test("root cn merges conflicting Tailwind classes", () => {
  expect(root.cn("p-2", "p-4")).toBe("p-4");
});

test("root drops the unprefixed agent activity names", () => {
  for (const name of [
    "ModelSelect", "Trace", "TraceLine", "Plan", "PlanHeader", "Test", "TestName", "TestError",
    "Context", "ContextTrigger", "ContextInputUsage", "getRandomVerb", "useSpinnerVerb",
    "useElapsedSeconds", "formatElapsed", "stepHasRichDetail",
  ]) {
    expect(root, name).not.toHaveProperty(name);
  }
});

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
  ]) {
    expect(root, name).toHaveProperty(name);
  }
});

test("root cn merges conflicting Tailwind classes", () => {
  expect(root.cn("p-2", "p-4")).toBe("p-4");
});

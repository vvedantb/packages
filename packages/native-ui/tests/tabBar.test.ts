import { describe, expect, it, vi } from "vitest";
import { isTabBarRouteVisible } from "../src/tabBarRoutes";
import type { FloatingTabBarProps } from "../src/FloatingTabBar";

// Hidden tabs (Expo Router `href: null`). The component checks call
// `FloatingTabBar` with React Native and the safe-area hook stubbed, and read
// the element tree it returns.

vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default },
  StyleSheet: { create: <T>(styles: T) => styles, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 },
  AccessibilityInfo: {},
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/theme", () => ({ useLargerText: () => false }));

describe("isTabBarRouteVisible", () => {
  it("hides routes with href: null or no descriptor", () => {
    expect(isTabBarRouteVisible(undefined)).toBe(false);
    expect(isTabBarRouteVisible({ href: null })).toBe(false);
    expect(isTabBarRouteVisible({})).toBe(true);
    expect(isTabBarRouteVisible({ href: "/inbox" })).toBe(true);
    expect(isTabBarRouteVisible({ href: undefined, title: "Inbox" })).toBe(true);
  });

  it("hides routes whose tabBarItemStyle resolves to display: none", () => {
    expect(isTabBarRouteVisible({ tabBarItemStyle: { display: "none" } })).toBe(false);
    expect(isTabBarRouteVisible({ tabBarItemStyle: [{ width: 40 }, [{ display: "none" }]] })).toBe(false);
    // The last display wins, as in `StyleSheet.flatten`.
    expect(isTabBarRouteVisible({ tabBarItemStyle: [{ display: "none" }, { display: "flex" }] })).toBe(true);
    expect(isTabBarRouteVisible({ tabBarItemStyle: [{ display: "none" }, null, false] })).toBe(false);
    expect(isTabBarRouteVisible({ tabBarItemStyle: { width: 40 } })).toBe(true);
    expect(isTabBarRouteVisible({ tabBarItemStyle: null })).toBe(true);
  });
});

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}

const routes = [
  { key: "home-1", name: "home" },
  { key: "secret-2", name: "secret" },
  { key: "styled-3", name: "styled" },
  { key: "orphan-4", name: "orphan" },
  { key: "profile-5", name: "profile", params: { id: "me" } },
];
const descriptors: FloatingTabBarProps["descriptors"] = {
  "home-1": { options: { title: "Home" } },
  "secret-2": { options: { title: "Secret", href: null } },
  "styled-3": { options: { title: "Styled", tabBarItemStyle: { display: "none" } } },
  // No descriptor for "orphan-4".
  "profile-5": { options: { title: "Profile", href: "/profile" } },
};

async function bar(index: number, defaultPrevented = false) {
  const { FloatingTabBar } = await import("../src/FloatingTabBar");
  const navigation = {
    emit: vi.fn(() => ({ defaultPrevented })),
    navigate: vi.fn(),
  };
  const tree = FloatingTabBar({ state: { index, routes }, descriptors, navigation });
  const tabs = elements(tree).filter((element) => element.type === "Pressable");
  const press = (label: string) => {
    const tab = tabs.find((element) => element.props.accessibilityLabel === label)!;
    (tab.props.onPress as () => void)();
  };
  return { tabs, navigation, press };
}

const labels = (tabs: Element[]) => tabs.map((tab) => tab.props.accessibilityLabel);
const selected = (tabs: Element[]) =>
  tabs.filter((tab) => (tab.props.accessibilityState as { selected: boolean }).selected).map((tab) => tab.props.accessibilityLabel);

describe("FloatingTabBar with hidden routes", () => {
  it("draws no tab for href: null, display: none or a missing descriptor", async () => {
    const { tabs } = await bar(0);
    expect(labels(tabs)).toEqual(["Home", "Profile"]);
  });

  it("focuses a visible tab by its index among all routes", async () => {
    // `profile` is route 4 of 5, and the second tab drawn.
    const { tabs } = await bar(4);
    expect(selected(tabs)).toEqual(["Profile"]);
    expect(selected((await bar(0)).tabs)).toEqual(["Home"]);
  });

  it("navigates to the pressed route by name, with its params", async () => {
    const { navigation, press } = await bar(0);
    press("Profile");
    expect(navigation.emit).toHaveBeenCalledWith({ type: "tabPress", target: "profile-5", canPreventDefault: true });
    expect(navigation.navigate).toHaveBeenCalledWith("profile", { id: "me" });
    press("Home");
    // Home is focused: the press is emitted but does not navigate.
    expect(navigation.emit).toHaveBeenCalledTimes(2);
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
  });

  it("keeps working while a hidden route is focused", async () => {
    const { tabs, navigation, press } = await bar(1);
    expect(selected(tabs)).toEqual([]);
    press("Home");
    expect(navigation.navigate).toHaveBeenCalledWith("home", undefined);
  });

  it("does not navigate when the press is prevented", async () => {
    const { navigation, press } = await bar(0, true);
    press("Profile");
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

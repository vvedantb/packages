import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tabColors } from "../src/controlStyles";
import { FLOATING_PILL_RADIUS, FLOATING_TAB_BAR_HEIGHT } from "../src/floating";
import { palette } from "../src/palette";
import { isTabBarRouteVisible } from "../src/tabBarRoutes";
import { tokens } from "../src/tokens";
import type { FloatingTabBarProps } from "../src/FloatingTabBar";

// Hidden tabs (Expo Router `href: null`) and the active pill. The component
// checks call `FloatingTabBar` and its pill with React Native, Reanimated, the
// safe-area hook and the React effects stubbed, and read the element tree they
// return. Effects run at once, and `withTiming` returns its target.

const scheme = vi.hoisted(() => ({ colorScheme: "light" as "light" | "dark" }));
const reduceMotion = vi.hoisted(() => ({ value: false }));
const withTiming = vi.hoisted(() => vi.fn((to: number, _config?: unknown) => to));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (effect: () => void) => effect(),
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "Animated.View" },
  Easing: { bezier: (...points: number[]) => `bezier(${points.join(", ")})` },
  useSharedValue: <T>(value: T) => ({ value }),
  useAnimatedStyle: <T>(updater: () => T) => updater(),
  withTiming,
}));
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => reduceMotion.value }));

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
vi.mock("nativewind", () => ({ useColorScheme: () => scheme }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/theme", () => ({ useLargerText: () => false }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webTokens = readFileSync(join(root, "..", "ui", "tokens/src/tokens.css"), "utf8");
const webTabs = readFileSync(join(root, "..", "ui", "tokens/src/css/tabs.css"), "utf8");
const webTabsPills = readFileSync(join(root, "..", "ui", "tokens/src/css/tabs-pills.css"), "utf8");

afterEach(() => {
  scheme.colorScheme = "light";
  reduceMotion.value = false;
  withTiming.mockClear();
});

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

async function bar(index: number, defaultPrevented = false, options = descriptors) {
  const { FloatingTabBar } = await import("../src/FloatingTabBar");
  const navigation = {
    emit: vi.fn(() => ({ defaultPrevented })),
    navigate: vi.fn(),
  };
  const tree = FloatingTabBar({ state: { index, routes }, descriptors: options, navigation });
  const all = elements(tree);
  const tabs = all.filter((element) => element.type === "Pressable");
  const press = (label: string) => {
    const tab = tabs.find((element) => element.props.accessibilityLabel === label)!;
    (tab.props.onPress as () => void)();
  };
  // The pill is a function component: the elements whose type is a function named `ActiveTabPill`.
  const pills = all.filter((element) => typeof element.type === "function" && element.type.name === "ActiveTabPill");
  const tablist = all.find((element) => element.props.accessibilityRole === "tablist")!;
  return { tree: tree as Element, tabs, pills, tablist, navigation, press };
}

/** The pill's outer view and its `Animated.View`, from calling the pill element's component. */
function renderPill(pill: Element) {
  const outer = (pill.type as (props: unknown) => Element)(pill.props);
  return { outer, fill: outer.props.children as Element };
}

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : ((style as Record<string, unknown>) ?? {});

/** The colour the tab labelled `label` gives its label `Text`. */
const labelColor = (tabs: Element[], label: string) => {
  const tab = tabs.find((element) => element.props.accessibilityLabel === label)!;
  const text = elements(tab.props.children).find((element) => element.type === "Text")!;
  return flatten(text.props.style).color;
};

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

describe("FloatingTabBar active pill", () => {
  it("draws one pill behind the focused tab, counting only the tabs drawn", async () => {
    // `profile` is route 4 of 5, and tab 1 of the 2 drawn.
    expect((await bar(4)).pills.map((pill) => pill.props)).toEqual([{ index: 1, count: 2 }]);
    expect((await bar(0)).pills.map((pill) => pill.props)).toEqual([{ index: 0, count: 2 }]);
  });

  it("draws no pill while a hidden route is focused", async () => {
    for (const index of [1, 2, 3]) {
      expect((await bar(index)).pills, `route ${index}`).toEqual([]);
    }
  });

  it("puts the pill in the bar before the tablist, so it is drawn behind the tabs and is not one of them", async () => {
    const { tree, pills, tablist } = await bar(0);
    const surface = elements(tree).find((element) => element.props.radius === FLOATING_PILL_RADIUS)!;
    const children = [surface.props.children].flat() as Element[];
    expect(children).toEqual([pills[0], tablist]);
    expect(elements(tablist.props.children)).not.toContain(pills[0]);
  });

  it("insets the pill 4 on every side, as the tabs are inset from the bar", async () => {
    const { pills, tablist } = await bar(4);
    expect(tablist.props.style).toEqual({ height: FLOATING_TAB_BAR_HEIGHT, paddingHorizontal: 4 });
    const { outer } = renderPill(pills[0]!);
    expect(outer.props.pointerEvents).toBe("none");
    expect(outer.props.style).toEqual({ position: "absolute", top: 4, bottom: 4, left: 4, right: 4 });
    // 64 bar: a 56 pill around the 48 of icon, gap and label.
    expect(FLOATING_TAB_BAR_HEIGHT - 2 * 4).toBe(56);
  });

  it("is one tab wide, fully rounded, at the tab's offset, in the web segmented pill fill and the pills outline", async () => {
    for (const colorScheme of ["light", "dark"] as const) {
      scheme.colorScheme = colorScheme;
      const { fill } = renderPill((await bar(4)).pills[0]!);
      expect(fill.type).toBe("Animated.View");
      expect(flatten(fill.props.style)).toEqual({
        position: "absolute",
        top: 0,
        bottom: 0,
        width: "50%",
        left: "50%",
        borderRadius: FLOATING_PILL_RADIUS,
        backgroundColor: palette.segment[colorScheme],
      });
      // The web `--tabs-pill-bg` (`--segment`), lighter than the `--default` pill.
      expect(webTabs).toMatch(/\.t-tabs-pill \{[^}]*background: var\(--tabs-pill-bg\);/);
      expect(webTabsPills).toMatch(/--tabs-pill-bg: var\(--segment\);/);
      expect(tabColors("segmented", true, colorScheme).backgroundColor).toBe(palette.segment[colorScheme]);
      expect(palette.segment[colorScheme]).toBe({ light: "#ffffff", dark: "#474747" }[colorScheme]);
      // The `TabsTrigger` pills outline.
      expect(fill.props.className).toBe("border border-white/40 dark:border-white/10");
    }
  });

  it("slides over the web --tabs-dur and --tabs-ease", async () => {
    expect(webTokens).toMatch(/--tabs-dur: 200ms;/);
    expect(webTokens).toMatch(/--tabs-ease: cubic-bezier\(0\.22, 1, 0\.36, 1\);/);
    renderPill((await bar(4)).pills[0]!);
    expect(withTiming).toHaveBeenCalledWith(50, { duration: 200, easing: "bezier(0.22, 1, 0.36, 1)" });
  });

  it("moves at once with Reduce Motion", async () => {
    reduceMotion.value = true;
    const { fill } = renderPill((await bar(4)).pills[0]!);
    expect(withTiming).not.toHaveBeenCalled();
    expect(flatten(fill.props.style).left).toBe("50%");
  });
});

describe("FloatingTabBar tab colours", () => {
  const icons: FloatingTabBarProps["descriptors"] = {
    "home-1": { options: { title: "Home", tabBarIcon: (props) => ({ type: "Icon", props }) as never } },
    "profile-5": { options: { title: "Profile", tabBarIcon: (props) => ({ type: "Icon", props }) as never } },
  };
  const iconColor = (tabs: Element[], label: string) => {
    const tab = tabs.find((element) => element.props.accessibilityLabel === label)!;
    return elements(tab.props.children).find((element) => element.type === "Icon")!.props.color;
  };

  it("gives the focused label and icon the foreground, and the others the muted colour, in both schemes", async () => {
    for (const colorScheme of ["light", "dark"] as const) {
      scheme.colorScheme = colorScheme;
      const { tabs } = await bar(0, false, icons);
      expect(labelColor(tabs, "Home"), colorScheme).toBe(palette.segmentForeground[colorScheme]);
      expect(palette.segmentForeground[colorScheme]).toBe(tokens.color.foreground[colorScheme]);
      expect(iconColor(tabs, "Home"), colorScheme).toBe(tokens.color.foreground[colorScheme]);
      expect(labelColor(tabs, "Profile"), colorScheme).toBe(tokens.color.muted[colorScheme]);
      expect(iconColor(tabs, "Profile"), colorScheme).toBe(tokens.color.muted[colorScheme]);
    }
  });

  it("keeps a route's tabBarActiveTintColor and tabBarInactiveTintColor", async () => {
    const tinted: FloatingTabBarProps["descriptors"] = {
      "home-1": { options: { ...icons["home-1"]!.options, tabBarActiveTintColor: "#db2777", tabBarInactiveTintColor: "#999999" } },
      "profile-5": { options: { ...icons["profile-5"]!.options, tabBarActiveTintColor: "#db2777", tabBarInactiveTintColor: "#999999" } },
    };
    const { tabs } = await bar(0, false, tinted);
    expect(labelColor(tabs, "Home")).toBe("#db2777");
    expect(iconColor(tabs, "Home")).toBe("#db2777");
    expect(labelColor(tabs, "Profile")).toBe("#999999");
    expect(iconColor(tabs, "Profile")).toBe("#999999");
  });
});

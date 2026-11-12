// Which routes `FloatingTabBar` draws. No React Native runtime import, so the
// tests can load this file.
import type { ReactNode } from "react";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";

/**
 * The fields `FloatingTabBar` reads from a route's options (React
 * Navigation's `BottomTabNavigationOptions`, and Expo Router's `href`).
 */
export type FloatingTabOptions = {
  title?: string;
  tabBarLabel?: string | ((props: never) => ReactNode);
  tabBarIcon?: (props: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) => ReactNode;
  tabBarActiveTintColor?: ColorValue;
  tabBarInactiveTintColor?: ColorValue;
  tabBarButtonTestID?: string;
  tabBarAccessibilityLabel?: string;
  /** Expo Router's `href`. `null` hides the tab. */
  href?: string | null;
  /** Only `display: "none"` is read: it hides the tab, as in React Navigation's own bar. */
  tabBarItemStyle?: StyleProp<ViewStyle>;
  /**
   * Only `display: "none"` is read: on the focused route it hides the whole
   * bar, as in React Navigation's own bar (for example while a screen is in
   * select mode and shows its `BulkActionBar` in the bar's place). Typed
   * loosely: React Navigation's own type allows animated styles, any of
   * which is an object or a falsy value.
   */
  tabBarStyle?: object | false | "" | null;
};

/** The `display` a style resolves to: in an array the last one set wins, as in `StyleSheet.flatten`. */
function displayOf(style: unknown): unknown {
  if (Array.isArray(style)) {
    let display: unknown;
    for (const item of style) {
      const value = displayOf(item);
      if (value !== undefined) display = value;
    }
    return display;
  }
  return style && typeof style === "object" ? (style as { display?: unknown }).display : undefined;
}

/**
 * Whether `FloatingTabBar` draws a tab for a route with these options. A route
 * without a descriptor has none. Apps hide a tab with Expo Router's
 * `options={{ href: null }}`. Expo Router's `Tabs` can drop `href` and pass
 * `tabBarItemStyle: { display: "none" }` in its place, so both hide the tab.
 * Hiding is display-only: `state.index` still counts every route.
 */
export function isTabBarRouteVisible(
  options: FloatingTabOptions | undefined,
): options is FloatingTabOptions {
  return options !== undefined && options.href !== null && displayOf(options.tabBarItemStyle) !== "none";
}

/**
 * Whether `FloatingTabBar` hides itself: the focused route's `tabBarStyle`
 * resolves to `display: "none"`, the React Navigation way to hide the bar
 * from a screen (`navigation.setOptions`, or Expo Router's `<Tabs.Screen
 * options>` inside the screen).
 */
export function isTabBarHidden(options: FloatingTabOptions | undefined): boolean {
  return displayOf(options?.tabBarStyle) === "none";
}

import { memo, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { floatingTabPillColors, tabColors, typeStyle } from "./controlStyles";
import { selectionHaptic } from "./haptics";
import { FloatingSurface } from "./FloatingSurface";
import { isTabBarHidden, isTabBarRouteVisible, type FloatingTabOptions } from "./tabBarRoutes";
import { useLargerText } from "./theme";
import { useReduceMotion } from "./useReduceMotion";
import { useScheme } from "./useScheme";
import { FLOATING_PILL_RADIUS, tabBarHeight, tabBarSlotStyle } from "./floating";

/**
 * Space between the bar edge and the tabs, on every side of the active pill,
 * in points. The same all round, so the pill follows the bar's curve.
 */
const TAB_BAR_PADDING = 4;

/** The web `--tabs-dur` (200ms) and `--tabs-ease` (`tokens.css`). */
const PILL_SLIDE = { duration: 200, easing: Easing.bezier(0.22, 1, 0.36, 1) };

/**
 * The fields this bar reads from the props Expo Router's `Tabs` passes to
 * `tabBar` (React Navigation's `BottomTabBarProps`, Expo SDK 57). Declared
 * here so the tab bar does not import `expo-router`.
 */
export type FloatingTabBarProps = {
  state: {
    index: number;
    routes: readonly { key: string; name: string; params?: object }[];
  };
  descriptors: Record<string, { options: FloatingTabOptions }>;
  navigation: {
    emit(event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }): { defaultPrevented: boolean };
    navigate(name: string, params?: object): void;
  };
};

/**
 * The floating pill tab bar, for the `tabBar` prop of Expo Router's `Tabs`.
 * The focused tab sits on a pill (`floatingTabPillColors`), with the
 * foreground label; the others are muted. A route's
 * `tabBarActiveTintColor` and `tabBarInactiveTintColor` override the label
 * and icon colours. Hide a tab with `options={{ href: null }}` on its
 * `Tabs.Screen`: the bar draws no tab for it (`isTabBarRouteVisible`), and
 * the other tabs keep their focus and navigation. The focused route hides the
 * whole bar with `tabBarStyle: { display: "none" }` (`isTabBarHidden`).
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const largerText = useLargerText();
  const scheme = useScheme();
  const height = tabBarHeight(largerText);
  const focusedRoute = state.routes[state.index];
  if (focusedRoute && isTabBarHidden(descriptors[focusedRoute.key]?.options)) {
    return null;
  }
  // The pill counts only the tabs drawn. No pill while a hidden route is focused.
  const visible = state.routes.filter((route) =>
    isTabBarRouteVisible(descriptors[route.key]?.options),
  );
  const active = visible.findIndex((route) => route.key === focusedRoute?.key);

  return (
    <View
      pointerEvents="box-none"
      // Inside the home indicator and, in landscape, the notch.
      style={tabBarSlotStyle(insets)}
    >
      <FloatingSurface radius={FLOATING_PILL_RADIUS}>
        {active >= 0 ? (
          <ActiveTabPill index={active} count={visible.length} />
        ) : null}
        <View
          className="flex-row items-center justify-around"
          style={{ height, paddingHorizontal: TAB_BAR_PADDING }}
          accessibilityRole="tablist"
        >
          {state.routes.map((route, index) => {
            const options = descriptors[route.key]?.options;
            if (!isTabBarRouteVisible(options)) {
              return null;
            }
            // `index` counts hidden routes too, as `state.index` does.
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : typeof options.title === "string"
                  ? options.title
                  : route.name;
            const color =
              (focused
                ? options.tabBarActiveTintColor
                : options.tabBarInactiveTintColor) ??
              tabColors("segmented", focused, scheme).color;
            return (
              <TabBarItem
                key={route.key}
                route={route}
                navigation={navigation}
                focused={focused}
                label={label}
                color={color}
                largerText={largerText}
                renderIcon={options.tabBarIcon}
                testID={options.tabBarButtonTestID}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              />
            );
          })}
        </View>
      </FloatingSurface>
    </View>
  );
}

type TabBarItemProps = {
  route: FloatingTabBarProps["state"]["routes"][number];
  navigation: FloatingTabBarProps["navigation"];
  focused: boolean;
  label: string;
  color: string;
  largerText: boolean;
  renderIcon: FloatingTabOptions["tabBarIcon"];
  testID: string | undefined;
  accessibilityLabel: string;
};

/**
 * One tab. Memoised: a switch re-renders the bar, and without it every tab
 * and its SVG icon re-rendered too (the kit is not built with React
 * Compiler). Now only the two tabs whose focus changed render. The props are
 * stable between switches: `route` and `navigation` keep their identity, and
 * `tabBarIcon` is the caller's function.
 */
const TabBarItem = memo(function TabBarItem({
  route,
  navigation,
  focused,
  label,
  color,
  largerText,
  renderIcon,
  testID,
  accessibilityLabel,
}: TabBarItemProps) {
  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      selectionHaptic();
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="min-h-12 min-w-12 flex-1 items-center justify-center gap-1"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {renderIcon ? renderIcon({ focused, color, size: largerText ? 28 : 24 }) : null}
      <Text
        numberOfLines={1}
        // The bar has a fixed height (`tabBarReserve`), so labels
        // scale with Dynamic Type only up to what fits in it.
        maxFontSizeMultiplier={1.5}
        className={`font-instrument-sans-semibold ${largerText ? "text-base" : "text-sm"}`}
        style={[{ color }, typeStyle("semibold")]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

/**
 * The pill behind tab `index` of `count` drawn tabs: one tab wide (they share
 * the row equally), `TAB_BAR_PADDING` inside the bar, in
 * `floatingTabPillColors` (the muted `--default` in light, `--segment` in
 * dark, so it shows on the glass bar) and the `TabsTrigger` pills outline.
 * It slides to a newly focused tab, as the web segmented pill does,
 * and moves at once with Reduce Motion. Behind the tablist, so assistive tech
 * reads only the tabs.
 */
function ActiveTabPill({ index, count }: { index: number; count: number }) {
  const scheme = useScheme();
  const reduceMotion = useReduceMotion();
  const left = (100 * index) / count;
  const offset = useSharedValue(left);

  useEffect(() => {
    offset.set(reduceMotion ? left : withTiming(left, PILL_SLIDE));
  }, [left, reduceMotion, offset]);

  const slide = useAnimatedStyle(() => ({
    left: `${offset.get()}%` as const,
  }));

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: TAB_BAR_PADDING,
        bottom: TAB_BAR_PADDING,
        left: TAB_BAR_PADDING,
        right: TAB_BAR_PADDING,
      }}
    >
      <Animated.View
        className="border border-white/40 dark:border-white/10"
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            width: `${100 / count}%` as const,
            borderRadius: FLOATING_PILL_RADIUS,
            backgroundColor: floatingTabPillColors(scheme).backgroundColor,
          },
          slide,
        ]}
      />
    </View>
  );
}

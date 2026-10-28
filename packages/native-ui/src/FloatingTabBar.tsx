import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tabColors, typeStyle } from "./controlStyles";
import { selectionHaptic } from "./haptics";
import { FloatingSurface } from "./FloatingSurface";
import { isTabBarRouteVisible, type FloatingTabOptions } from "./tabBarRoutes";
import { useLargerText } from "./theme";
import { useReduceMotion } from "./useReduceMotion";
import { useScheme } from "./useScheme";
import {
  FLOATING_INSET,
  FLOATING_PILL_RADIUS,
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_HEIGHT_LARGE,
} from "./floating";

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
 * The focused tab sits on a pill in the web segmented pill fill
 * (`tabColors`), with the foreground label; the others are muted. A route's
 * `tabBarActiveTintColor` and `tabBarInactiveTintColor` override the label
 * and icon colours. Hide a tab with `options={{ href: null }}` on its
 * `Tabs.Screen`: the bar draws no tab for it (`isTabBarRouteVisible`), and
 * the other tabs keep their focus and navigation.
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const largerText = useLargerText();
  const scheme = useScheme();
  const height = largerText
    ? FLOATING_TAB_BAR_HEIGHT_LARGE
    : FLOATING_TAB_BAR_HEIGHT;
  // The pill counts only the tabs drawn. No pill while a hidden route is focused.
  const visible = state.routes.filter((route) =>
    isTabBarRouteVisible(descriptors[route.key]?.options),
  );
  const active = visible.findIndex(
    (route) => route.key === state.routes[state.index]?.key,
  );

  return (
    <View
      pointerEvents="box-none"
      // Inside the home indicator and, in landscape, the notch.
      style={{
        position: "absolute",
        left: insets.left + FLOATING_INSET,
        right: insets.right + FLOATING_INSET,
        bottom: FLOATING_INSET + Math.max(insets.bottom, 8),
      }}
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
                key={route.key}
                testID={options.tabBarButtonTestID}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                onPress={onPress}
                className="min-h-12 min-w-12 flex-1 items-center justify-center gap-1"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                {options.tabBarIcon
                  ? options.tabBarIcon({
                      focused,
                      color,
                      size: largerText ? 28 : 24,
                    })
                  : null}
                <Text
                  numberOfLines={1}
                  // The bar has a fixed height (`tabBarReserve`), so labels
                  // scale with Dynamic Type only up to what fits in it.
                  maxFontSizeMultiplier={1.5}
                  className={`font-instrument-sans-semibold ${
                    largerText ? "text-base" : "text-sm"
                  }`}
                  style={[{ color }, typeStyle("semibold")]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FloatingSurface>
    </View>
  );
}

/**
 * The pill behind tab `index` of `count` drawn tabs: one tab wide (they share
 * the row equally), `TAB_BAR_PADDING` inside the bar, in the web segmented
 * pill fill (`tabColors`, `--tabs-pill-bg`) and the `TabsTrigger` pills
 * outline. It slides to a newly focused tab, as the web segmented pill does,
 * and moves at once with Reduce Motion. Behind the tablist, so assistive tech
 * reads only the tabs.
 */
function ActiveTabPill({ index, count }: { index: number; count: number }) {
  const scheme = useScheme();
  const reduceMotion = useReduceMotion();
  const left = (100 * index) / count;
  const offset = useSharedValue(left);

  useEffect(() => {
    offset.value = reduceMotion ? left : withTiming(left, PILL_SLIDE);
  }, [left, reduceMotion, offset]);

  const slide = useAnimatedStyle(() => ({
    left: `${offset.value}%` as const,
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
            backgroundColor: tabColors("segmented", true, scheme).backgroundColor,
          },
          slide,
        ]}
      />
    </View>
  );
}

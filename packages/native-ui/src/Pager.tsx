import { createContext, useContext, useEffect, type ComponentType, type ReactNode } from "react";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

export type PagerProps = {
  /** The page shown, from 0. A change from outside (a tab press, a link) slides there in 220 ms, through the pages between (at once with Reduce Motion, and without the swipe). */
  index: number;
  count: number;
  /** A swipe settled on another page. Set `index` to it. */
  onIndexChange: (index: number) => void;
  /**
   * Where the pages are, in pages (1.5 is halfway between the second and the
   * third). Create it with `useSharedValue(index)` and pass the same value to
   * `PillTabs` (`progress`), so its indicator moves with the pages.
   */
  progress: SharedValue<number>;
  /** Draws one page. A page is drawn once visited or once a swipe could reach it, and then stays, so it keeps its state. */
  renderPage: (index: number) => ReactNode;
};

/**
 * The Gesture Handler pager, from `@vvedantb/native-ui/gesture-handler`
 * (`GestureHandlerProvider`). A context, so only that entry imports
 * `react-native-gesture-handler`.
 */
export const PagerGestureContext = createContext<ComponentType<PagerProps> | null>(null);

/** Set inside a swiped `Pager`: a `SwipeableRow` there leaves the directions it has no actions for to the pager. */
export const InsidePagerContext = createContext(false);

/**
 * Side-by-side pages a horizontal swipe moves between, such as the sections
 * under a row of `PillTabs`. The pages follow the finger 1:1 and, on release,
 * spring on at the finger's speed to the nearest page (a flick turns one
 * page); past the first and last page they rubber-band. The linked
 * `progress` moves the `PillTabs` indicator with them. Only a clearly
 * sideways drag takes the pages: a vertical drag scrolls the page, and a
 * `SwipeableRow` under the finger takes its own swipe first (it lets a drag
 * toward a side it has no actions for through to the pager). A settled page
 * fires a selection haptic and `onIndexChange`. With Reduce Motion on the
 * pages still follow the finger, and the release settles at once.
 *
 * The swipe needs `GestureHandlerProvider`; without it only the current page
 * is drawn, with no swipe.
 */
export function Pager(props: PagerProps) {
  const GesturePager = useContext(PagerGestureContext);
  if (GesturePager) return <GesturePager {...props} />;
  return <StaticPager {...props} />;
}

function StaticPager({ index, progress, renderPage }: PagerProps) {
  // The linked indicator follows a page set from outside. An effect: a shared value is never written in render.
  useEffect(() => {
    progress.set(index);
  }, [index, progress]);
  return (
    <View key={index} style={{ flex: 1 }}>
      {renderPage(index)}
    </View>
  );
}

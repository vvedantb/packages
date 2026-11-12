import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { selectionHaptic } from "../haptics";
import { InsidePagerContext, type PagerProps } from "../Pager";
import { PAGER_ACTIVE_OFFSET_X, PAGER_FAIL_OFFSET_Y, pagerPosition, pagerSettle, pagesBetween } from "../pagerSwipe";
import { useWebClickGuard } from "./web-click-guard";

// The pager on Gesture Handler: the track phase and the release run as
// worklets on the UI thread, so the pages never lag the finger. The rules are
// plain worklets in `pagerSwipe`.

/** The release: springs on at the finger's speed, no bounce (an overshoot would flash the next page's edge). */
const PAGER_SPRING = { duration: 250, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;

/** A page set from outside (a tab press) slides there; at once with Reduce Motion. */
const PAGER_SLIDE = { duration: 220, reduceMotion: ReduceMotion.System } as const;

export function GesturePager({ index, count, onIndexChange, progress, renderPage }: PagerProps) {
  const width = useSharedValue(0);
  // Where the pages were when the finger caught them, and the finger's travel then.
  const start = useSharedValue(0);
  const startX = useSharedValue(0);
  const [mounted, setMounted] = useState<ReadonlySet<number>>(() => new Set([index]));
  const [shown, setShown] = useState(index);
  // A page reached from outside is drawn from then on, with every page the
  // slide there passes, so it never crosses a blank page.
  if (shown !== index) {
    setShown(index);
    setMounted(new Set([...mounted, ...pagesBetween(shown, index)]));
  }
  // The page a swipe settled on, until the new `index` comes back: that one must not stop the spring.
  const settling = useRef<number | null>(null);
  // A page set from outside slides there. An effect: a shared value is never
  // written in render.
  useEffect(() => {
    const fromSwipe = settling.current === index;
    settling.current = null;
    if (fromSwipe) return;
    progress.set(withTiming(index, PAGER_SLIDE));
  }, [index, progress]);

  const webClicks = useWebClickGuard();
  const dragStarted = () => {
    webClicks.swallowNext();
    // Both neighbours, so the finger finds a page there.
    setMounted((current) => new Set([...current, index - 1, index + 1].filter((page) => page >= 0 && page < count)));
  };
  const settled = (page: number) => {
    settling.current = page;
    selectionHaptic();
    onIndexChange(page);
  };

  // Built on each render (for `index` and `count`): the detector keeps the
  // same handler, and a drag in flight, and only takes the new config.
  const pan = Gesture.Pan()
    .enabled(count > 1)
    // Clearly sideways only: a vertical drag is the page's scroll, and a row swipe starts sooner.
    .activeOffsetX([-PAGER_ACTIVE_OFFSET_X, PAGER_ACTIVE_OFFSET_X])
    .failOffsetY([-PAGER_FAIL_OFFSET_Y, PAGER_FAIL_OFFSET_Y])
    .onStart((event) => {
      cancelAnimation(progress);
      start.set(progress.get());
      // Count from here, so the pages do not jump by the slop the drag needed to start.
      startX.set(event.translationX);
      runOnJS(dragStarted)();
    })
    // Track phase: one shared value write per frame, on the UI thread.
    .onUpdate((event) => {
      progress.set(pagerPosition(start.get(), event.translationX - startX.get(), width.get(), count));
    })
    .onEnd((event) => {
      const pageWidth = width.get();
      const target = pagerSettle(progress.get(), event.velocityX, pageWidth, Math.round(start.get()), count);
      // The finger's speed in pages per second, the unit of `progress`.
      const velocity = pageWidth > 0 ? -event.velocityX / pageWidth : 0;
      progress.set(withSpring(target, { ...PAGER_SPRING, velocity }));
      if (target !== index) runOnJS(settled)(target);
    });

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${(-progress.get() * 100) / count}%` }],
  }));
  return (
    <InsidePagerContext.Provider value>
      <View style={styles.clip} onLayout={(event) => width.set(event.nativeEvent.layout.width)}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.fill, { width: `${count * 100}%` }, trackStyle]}>
            <View ref={webClicks.ref} style={styles.track}>
              {Array.from({ length: count }, (_, page) => (
                <View
                  key={page}
                  // Off-screen pages are hidden from screen readers; the tabs above switch pages for them.
                  accessibilityElementsHidden={page !== index}
                  importantForAccessibility={page === index ? "auto" : "no-hide-descendants"}
                  style={{ width: `${100 / count}%` }}
                >
                  {mounted.has(page) ? renderPage(page) : null}
                </View>
              ))}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </InsidePagerContext.Provider>
  );
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
  },
  track: {
    flex: 1,
    flexDirection: "row",
  },
});

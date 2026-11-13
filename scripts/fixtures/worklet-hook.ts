// Fixture for build-dist.test.mjs: worklets with capture-free arrows inside,
// which React Compiler hoists to module-level `_temp` functions.
import { Gesture } from "react-native-gesture-handler";
import { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";

export function useSlide(progress: SharedValue<number>, boxes: ReadonlyArray<{ x: number; width: number }>) {
  const style = useAnimatedStyle(() => {
    const pages = boxes.map((_, index) => index);
    return { width: interpolate(progress.get(), pages, boxes.map((box) => box.width)) };
  });
  const pan = Gesture.Pan().onUpdate((event) => {
    progress.set([event.translationX].map((x) => x / 100)[0] ?? 0);
  });
  const settle = () => {
    "worklet";
    return boxes.map((box) => box.x);
  };
  return { style, pan, settle };
}

import { useState, type ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { ZoomImageParts, ZoomImageProps } from "./zoomImage";
import { clampPan, doubleTapZoom, isZoomed, settleScale, zoomScale, ZOOM } from "./imageZoom";

// Pinch, pan and double tap for an `ImageViewer` page, on Gesture Handler: the
// track phase runs as worklets on the UI thread, so the image never lags the
// fingers. The rules are plain worklets in `imageZoom`.

/** The settle after a release or a double tap: quick, no bounce past the edges. */
const ZOOM_SPRING = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;

function ZoomImage({ image, width, height, onZoomChange }: ZoomImageProps) {
  const scale = useSharedValue<number>(ZOOM.min);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  // Where the gesture started: the scale and translation, and the pinch's focal point from centre.
  const startScale = useSharedValue<number>(ZOOM.min);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  // Pan only while zoomed: at fitted size a drag turns the page.
  const [zoomed, setZoomed] = useState(false);
  const report = (next: boolean) => {
    setZoomed(next);
    onZoomChange(next);
  };

  const settle = () => {
    "worklet";
    const next = settleScale(scale.get());
    scale.set(withSpring(next, ZOOM_SPRING));
    x.set(withSpring(clampPan(x.get(), next, width), ZOOM_SPRING));
    y.set(withSpring(clampPan(y.get(), next, height), ZOOM_SPRING));
    runOnJS(report)(isZoomed(next));
  };

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      startScale.set(scale.get());
      startX.set(x.get());
      startY.set(y.get());
      focalX.set(event.focalX - width / 2);
      focalY.set(event.focalY - height / 2);
    })
    .onUpdate((event) => {
      const next = zoomScale(startScale.get() * event.scale);
      const ratio = next / startScale.get();
      // The point under the fingers stays under them.
      x.set(focalX.get() - (focalX.get() - startX.get()) * ratio);
      y.set(focalY.get() - (focalY.get() - startY.get()) * ratio);
      scale.set(next);
    })
    .onEnd(() => {
      settle();
    });

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .averageTouches(true)
    .onStart(() => {
      startX.set(x.get());
      startY.set(y.get());
    })
    .onUpdate((event) => {
      x.set(clampPan(startX.get() + event.translationX, scale.get(), width));
      y.set(clampPan(startY.get() + event.translationY, scale.get(), height));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event, success) => {
      if (!success) return;
      const target = doubleTapZoom(scale.get(), { x: event.x, y: event.y }, { width, height });
      scale.set(withSpring(target.scale, ZOOM_SPRING));
      x.set(withSpring(target.x, ZOOM_SPRING));
      y.set(withSpring(target.y, ZOOM_SPRING));
      runOnJS(report)(isZoomed(target.scale));
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <View style={{ width, height }} collapsable={false}>
        <Animated.View style={[styles.fill, style]}>
          <Image source={{ uri: image.url }} resizeMode="contain" style={styles.fill} accessibilityLabel={image.alt ?? "Image"} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/** Gestures inside a `Modal` need a root view of their own. */
function ZoomRoot({ children }: { children: ReactNode }) {
  return <GestureHandlerRootView style={styles.fill}>{children}</GestureHandlerRootView>;
}

export const ZOOM_IMAGE_PARTS: ZoomImageParts = { Root: ZoomRoot, Image: ZoomImage };

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
});

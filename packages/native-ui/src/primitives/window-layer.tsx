import { useId, useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
import { BackHandler, Modal, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { useReduceMotion } from "../useReduceMotion";

// Overlays drawn in the app's own window. A React Native `Modal` is a window
// of its own on Android: it takes the focus as it opens and hands it back as
// it closes, and each time `react-native-keyboard-controller`'s chat list
// scrolls to its newest message. A layer in `WindowLayerHost` is a view over
// the app instead, so the focus never moves. Without a host, `WindowLayer`
// falls back to a `Modal`, so an app that mounts none keeps working.

type Layer = { id: string; node: ReactNode; onRequestClose: () => void };

const EMPTY: readonly Layer[] = [];
let layers: readonly Layer[] = EMPTY;
let hosts = 0;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const upsert = (layer: Layer) => {
  const at = layers.findIndex((item) => item.id === layer.id);
  layers = at === -1 ? [...layers, layer] : layers.map((item, index) => (index === at ? layer : item));
  emit();
};

const remove = (id: string) => {
  if (!layers.some((item) => item.id === id)) return;
  layers = layers.filter((item) => item.id !== id);
  emit();
};

// Android back closes the newest layer, as a Modal's `onRequestClose`.
const onBack = () => {
  const top = layers[layers.length - 1];
  if (!top) return false;
  top.onRequestClose();
  return true;
};

/** Mounted: the host is there, and it answers Android back for its layers. */
const hostRef = (view: View | null) => {
  if (view === null) return undefined;
  hosts += 1;
  const back = BackHandler.addEventListener("hardwareBackPress", onBack);
  emit();
  return () => {
    hosts -= 1;
    back.remove();
    emit();
  };
};

/**
 * Wrap the app once (inside `NativeUiProvider`, around the navigator): the
 * `WindowLayer`s draw over it, in the same window. While a layer shows, the
 * app under it is hidden from TalkBack and VoiceOver, as under a Modal.
 */
export function WindowLayerHost({ children }: { children: ReactNode }) {
  const shown = useSyncExternalStore(subscribe, () => layers, () => EMPTY);
  // The layers fade in and out as a Modal's `fade`; with Reduce Motion they appear at once.
  const enter = FadeIn.duration(200).reduceMotion(ReduceMotion.System);
  const exit = FadeOut.duration(150).reduceMotion(ReduceMotion.System);
  return (
    <View ref={hostRef} style={styles.fill}>
      <View
        style={styles.fill}
        importantForAccessibility={shown.length > 0 ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={shown.length > 0}
      >
        {children}
      </View>
      {shown.map((layer) => (
        <Animated.View key={layer.id} entering={enter} exiting={exit} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {layer.node}
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * An overlay over the whole app, in its own window only when it must be: in
 * `WindowLayerHost` when the app has one, else a transparent `Modal` (with
 * `onDismiss` there). Render it only while the overlay shows. Android back
 * calls `onRequestClose`. Its children keep the providers above the host, not
 * those between the host and this element.
 */
export function WindowLayer({
  onRequestClose,
  onDismiss,
  children,
}: {
  onRequestClose: () => void;
  /** The fallback Modal's dismiss (iOS); a layer is gone as it unmounts. */
  onDismiss?: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const reduceMotion = useReduceMotion();
  const hosted = useSyncExternalStore(subscribe, () => hosts > 0, () => false);
  // A portal has to hand the host its children after each render: an external
  // store fed from an effect, the one sync React offers for it.
  useLayoutEffect(() => {
    if (hosted) upsert({ id, node: children, onRequestClose });
  }, [hosted, id, children, onRequestClose]);
  useLayoutEffect(() => () => remove(id), [id]);
  if (hosted) return null;
  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType={reduceMotion ? "none" : "fade"}
      onRequestClose={onRequestClose}
      onDismiss={onDismiss}
    >
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

import { Fragment, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// On Android an RN `Modal` is a separate root: a Gesture Handler gesture
// inside one does nothing, with no error, unless the `Modal` has its own
// `GestureHandlerRootView`. These checks call `OverlayModal` (the `Modal` of
// every `Dialog`, `AlertDialog` and `Sheet`) and read the element tree it
// returns, with React's hooks and the native peers stubbed.

type Element = ReactElement<{ children?: unknown; style?: unknown }>;

const contexts = vi.hoisted(() => ({ values: new Map<unknown, unknown>() }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const overlay = { open: true, setOpen: () => {} };
  return {
    ...actual,
    // The overlay's open state for any context the test does not set.
    useContext: (context: unknown) => (contexts.values.has(context) ? contexts.values.get(context) : overlay),
    useState: <T>(initial: T) => [initial, () => {}],
  };
});
vi.mock("react-native", () => ({
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Modal: "Modal",
  PanResponder: { create: () => ({ panHandlers: {} }) },
  Platform: { OS: "android" },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { absoluteFill: { position: "absolute" }, create: <T>(styles: T) => styles },
  View: "View",
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "Animated.View", ScrollView: "Animated.ScrollView" },
  Easing: { bezier: () => "ease-out" },
  ReduceMotion: { System: "system" },
  cancelAnimation: () => {},
  interpolate: () => 0,
  runOnJS: () => () => {},
  scrollTo: () => {},
  useAnimatedReaction: () => {},
  useAnimatedRef: () => ({ current: null }),
  useAnimatedStyle: () => ({}),
  useScrollOffset: () => {},
  useSharedValue: <T>(value: T) => ({ get: () => value, set: () => {} }),
  withSpring: () => 0,
}));
vi.mock("react-native-gesture-handler", () => ({
  Gesture: {},
  GestureDetector: "GestureDetector",
  GestureHandlerRootView: "GestureHandlerRootView",
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));
vi.mock("@rn-primitives/slot", () => ({ Pressable: "Slot.Pressable" }));
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => false }));
vi.mock("../src/useScheme", () => ({ useScheme: () => "light" }));

afterEach(() => {
  contexts.values.clear();
});

async function modalContent(): Promise<Element> {
  const { OverlayModal } = await import("../src/primitives/overlay");
  const modal = OverlayModal({ part: "SheetContent", placement: "bottom", dismissible: true, children: "content" });
  expect(modal.type).toBe("Modal");
  return modal.props.children;
}

describe("overlay Modal root view", () => {
  it("puts the Modal content in a Gesture Handler root view under GestureHandlerProvider", async () => {
    const { GestureHandlerProvider } = await import("../src/entries/gesture-handler");
    const { SheetGestureContext } = await import("../src/primitives/sheet-drag");
    const provider: ReactElement<{ value: unknown }> = GestureHandlerProvider({ children: null });
    contexts.values.set(SheetGestureContext, provider.props.value);

    const root = await modalContent();
    expect(typeof root.type).toBe("function");
    if (typeof root.type !== "function") return;
    const rendered: Element = root.type({ children: root.props.children });
    expect(rendered.type).toBe("GestureHandlerRootView");
    expect(rendered.props.style).toEqual({ flex: 1 });
    // The sheet, its backdrop and its drag all sit inside it.
    const body: Element = rendered.props.children as Element;
    expect(body.props.children).toBe("content");
  });

  it("adds no root view without it: the PanResponder sheets need none", async () => {
    const root = await modalContent();
    expect(root.type).toBe(Fragment);
  });
});

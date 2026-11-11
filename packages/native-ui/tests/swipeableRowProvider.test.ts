import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// `SwipeableRow` swipes only under `GestureHandlerProvider` (the Gesture
// Handler peer is optional). These checks call it and the provider, and read
// the element trees they return, with React's context and the native peers
// stubbed.

type Element = ReactElement<{ children?: unknown; value?: unknown; enabled?: boolean }>;

const contexts = vi.hoisted(() => ({ values: new Map<unknown, unknown>() }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useContext: (context: unknown) => (contexts.values.has(context) ? contexts.values.get(context) : null),
  };
});
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  PanResponder: { create: () => ({ panHandlers: {} }) },
  StyleSheet: { absoluteFill: {}, create: <T>(styles: T) => styles },
  View: "View",
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "Animated.View", ScrollView: "Animated.ScrollView" },
  Easing: { bezier: () => "ease-out" },
  ReduceMotion: { System: "system" },
}));
vi.mock("react-native-gesture-handler", () => ({
  Gesture: {},
  GestureDetector: "GestureDetector",
  GestureHandlerRootView: "GestureHandlerRootView",
}));

vi.mock("../src/useScheme", () => ({ useScheme: () => "light" }));

afterEach(() => {
  contexts.values.clear();
});

describe("SwipeableRow", () => {
  it("draws the row as is, with no swipe, without GestureHandlerProvider", async () => {
    const { SwipeableRow } = await import("../src/SwipeableRow");
    const row: Element = SwipeableRow({ trailingActions: [], children: "row" });
    expect(typeof row.type).not.toBe("function");
    expect(row.props.children).toBe("row");
  });

  it("swipes on Gesture Handler under GestureHandlerProvider", async () => {
    const { GestureHandlerProvider } = await import("../src/entries/gesture-handler");
    const { SwipeableRow, SwipeRowGestureContext } = await import("../src/SwipeableRow");
    const { GestureSwipeableRow } = await import("../src/primitives/swipe-row-gesture");
    // The provider wraps the sheet parts' provider around the swipe row's.
    const provider: Element = GestureHandlerProvider({ children: null });
    const inner = provider.props.children as Element;
    expect(inner.props.value).toBe(GestureSwipeableRow);
    contexts.values.set(SwipeRowGestureContext, inner.props.value);

    const row: Element = SwipeableRow({ enabled: false, children: "row" });
    expect(row.type).toBe(GestureSwipeableRow);
    expect(row.props.enabled).toBe(false);
    expect(row.props.children).toBe("row");
  });
});

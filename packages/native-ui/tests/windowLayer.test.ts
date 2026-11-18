import { afterEach, describe, expect, it, vi } from "vitest";

// `WindowLayer` and `WindowLayerHost` outside a renderer: hooks stubbed (an
// effect runs at once and its cleanup is kept), Android back captured, the
// module re-imported fresh for each test.

type Element = { type: unknown; props: Record<string, unknown> };

const env = vi.hoisted(() => ({
  back: null as null | (() => boolean),
  cleanups: [] as Array<() => void>,
  ids: 0,
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useId: () => `layer-${++env.ids}`,
  useSyncExternalStore: <T>(_subscribe: unknown, snapshot: () => T) => snapshot(),
  useLayoutEffect: (effect: () => void | (() => void)) => {
    const cleanup = effect();
    if (typeof cleanup === "function") env.cleanups.push(cleanup);
  },
}));
vi.mock("react-native", () => ({
  BackHandler: {
    addEventListener: (_event: string, listener: () => boolean) => {
      env.back = listener;
      return { remove: () => void (env.back = null) };
    },
  },
  Modal: "Modal",
  StyleSheet: { create: <T>(styles: T) => styles, absoluteFill: {} },
  View: "View",
}));
vi.mock("react-native-reanimated", () => {
  const builder = { duration: () => builder, reduceMotion: () => builder };
  return { default: { View: "Animated.View" }, FadeIn: builder, FadeOut: builder, ReduceMotion: { System: "system" } };
});
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => false }));

afterEach(() => {
  env.cleanups = [];
  env.back = null;
  vi.resetModules();
});

describe("WindowLayer", () => {
  it("falls back to a transparent Modal without a host", async () => {
    const { WindowLayer } = await import("../src/primitives/window-layer");
    const onRequestClose = vi.fn();
    const modal = WindowLayer({ onRequestClose, children: "MENU" }) as unknown as Element;
    expect(modal.type).toBe("Modal");
    expect(modal.props).toMatchObject({ visible: true, transparent: true, animationType: "fade", onRequestClose, children: "MENU" });
  });

  it("draws in the host instead, in the app's window, and closes the newest layer on Android back", async () => {
    const { WindowLayer, WindowLayerHost } = await import("../src/primitives/window-layer");
    const host = WindowLayerHost({ children: "APP" }) as unknown as Element;
    // The host mounts: its ref says so and takes Android back.
    const unmountHost = (host.props.ref as (view: object | null) => (() => void) | undefined)({});
    const first = vi.fn();
    const second = vi.fn();
    expect(WindowLayer({ onRequestClose: first, children: "MENU" })).toBeNull();
    expect(WindowLayer({ onRequestClose: second, children: "IMAGE" })).toBeNull();
    const drawn = WindowLayerHost({ children: "APP" }) as unknown as Element;
    const [app, ...layers] = drawn.props.children as [Element, Element[]];
    // The app under the layers is hidden from screen readers, as under a Modal.
    expect(app.props).toMatchObject({ importantForAccessibility: "no-hide-descendants", accessibilityElementsHidden: true, children: "APP" });
    expect((layers.flat() as Element[]).map((layer) => layer.props.children)).toEqual(["MENU", "IMAGE"]);
    expect(env.back?.()).toBe(true);
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
    // Unmounted layers leave the host; back then falls through to the app.
    for (const cleanup of env.cleanups) cleanup();
    const empty = WindowLayerHost({ children: "APP" }) as unknown as Element;
    const [plain, ...none] = empty.props.children as [Element, Element[]];
    expect(plain.props.importantForAccessibility).toBe("auto");
    expect(none.flat()).toEqual([]);
    expect(env.back?.()).toBe(false);
    unmountHost?.();
    expect(env.back).toBeNull();
  });

  it("calls onShow once the layer is laid out, once per opening, and leaves the fade to an overlay that moves itself", async () => {
    const { WindowLayer, WindowLayerHost } = await import("../src/primitives/window-layer");
    const host = WindowLayerHost({ children: "APP" }) as unknown as Element;
    (host.props.ref as (view: object | null) => (() => void) | undefined)({});
    const onShow = vi.fn();
    WindowLayer({ onRequestClose: () => {}, onShow, fade: false, children: "SHEET" });
    const drawn = WindowLayerHost({ children: "APP" }) as unknown as Element;
    const [, layers] = drawn.props.children as [Element, Element[]];
    const [layer] = layers;
    expect(layer.props).toMatchObject({ entering: undefined, exiting: undefined });
    (layer.props.onLayout as () => void)();
    (layer.props.onLayout as () => void)();
    expect(onShow).toHaveBeenCalledOnce();
  });

  it("passes onShow to the fallback Modal, with no fade for an overlay that moves itself", async () => {
    const { WindowLayer } = await import("../src/primitives/window-layer");
    const onShow = vi.fn();
    const modal = WindowLayer({ onRequestClose: () => {}, onShow, fade: false, children: "SHEET" }) as unknown as Element;
    expect(modal.props).toMatchObject({ animationType: "none", onShow });
  });
});

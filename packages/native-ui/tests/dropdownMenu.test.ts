import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

// `DropdownMenu` (`/primitives` and root): the native counterpart of the web
// `DropdownMenu`. React Native and the hooks are stubbed; the checks call the
// parts with a stub menu context and read the element trees they return. The
// sizes are checked against the web `_menu-classes.ts`.

const menu = vi.hoisted(() => ({
  value: null as null | { open: boolean; setOpen: (open: boolean) => void; trigger: unknown; setTrigger: (rect: unknown) => void },
  ref: { current: null as unknown },
  larger: false,
}));

vi.mock("../src/primitives/window-layer", () => ({ WindowLayer: "WindowLayer" }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useContext: () => menu.value,
  useState: <T>(initial: T) => [initial, vi.fn()],
  // The view ref starts `null`; the trigger's size and box refs start `undefined` and belong to each render.
  useRef: <T>(initial: T) => (initial === null ? menu.ref : { current: initial }),
  useEffect: () => {},
}));
vi.mock("react-native", () => ({
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  StyleSheet: { absoluteFill: { position: "absolute" } },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "Animated.View" },
  Easing: { bezier: () => "ease-out" },
  ReduceMotion: { System: "system" },
  runOnJS: () => () => {},
  useAnimatedStyle: () => ({}),
  useSharedValue: <T>(value: T) => ({ get: () => value, set: () => {} }),
  withTiming: () => 0,
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("@rn-primitives/slot", () => ({ Pressable: "SlotPressable" }));
vi.mock("@tabler/icons-react-native", () => ({ IconCheck: "IconCheck" }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/FloatingSurface", () => ({ FloatingSurface: "FloatingSurface" }));
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => false }));
const haptics = vi.hoisted(() => ({ selectionHaptic: vi.fn() }));
vi.mock("../src/haptics", () => haptics);
vi.mock("../src/theme", () => ({ useLargerText: () => menu.larger }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

const elements = (node: unknown): Element[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  const children = element.props.children;
  return [element, ...elements(typeof children === "function" ? children({ pressed: false }) : children)];
};

/** A menu row's press highlight: the background layer its `pressed` render state draws. */
const pressLayer = (row: Element, pressed: boolean) =>
  elements((row.props.children as (state: { pressed: boolean }) => unknown)({ pressed })).find(
    (element) => element.props.pointerEvents === "none",
  );

/** Calls function components down the tree, as a renderer would, so host elements show. */
const render = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(render);
  if (!node || typeof node !== "object" || !("props" in node)) return node;
  const element = node as Element;
  if (typeof element.type === "function") return render((element.type as (props: unknown) => unknown)(element.props));
  return { ...element, props: { ...element.props, children: render(element.props.children) } };
};

function context(open: boolean, trigger: unknown = { x: 300, y: 100, width: 40, height: 40 }) {
  const value = { open, setOpen: vi.fn(), trigger, setTrigger: vi.fn() };
  menu.value = value;
  return value;
}

function layout(wrapper: Element, width: number, height: number) {
  (wrapper.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

beforeEach(() => {
  // Frames run at once, unless a test queues them itself.
  vi.stubGlobal("requestAnimationFrame", (run: () => void) => {
    run();
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  menu.value = null;
  menu.ref = { current: null };
  menu.larger = false;
});

describe("dropdownMenuPosition", () => {
  const window = { width: 390, height: 844 };
  const insets = { top: 47, bottom: 34, left: 0, right: 0 };

  it("sits 4 under the trigger, on its start or end edge", async () => {
    const { dropdownMenuPosition } = await import("../src/DropdownMenu");
    const trigger = { x: 300, y: 100, width: 40, height: 40 };
    expect(dropdownMenuPosition({ trigger, window, insets, align: "start", contentHeight: 120 })).toEqual({
      left: 300,
      top: 144,
      maxHeight: 844 - 34 - 8 - 144,
    });
    expect(dropdownMenuPosition({ trigger, window, insets, align: "end", contentHeight: 120 })).toMatchObject({ right: 50, top: 144 });
  });

  it("keeps 8 inside the screen edges", async () => {
    const { dropdownMenuPosition } = await import("../src/DropdownMenu");
    expect(dropdownMenuPosition({ trigger: { x: 2, y: 100, width: 40, height: 40 }, window, insets, align: "start", contentHeight: 0 }).left).toBe(8);
    expect(dropdownMenuPosition({ trigger: { x: 360, y: 100, width: 40, height: 40 }, window, insets, align: "end", contentHeight: 0 }).right).toBe(8);
  });

  it("flips above the trigger when the content does not fit below and there is more room above", async () => {
    const { dropdownMenuPosition } = await import("../src/DropdownMenu");
    const trigger = { x: 20, y: 700, width: 100, height: 40 };
    expect(dropdownMenuPosition({ trigger, window, insets, align: "start", contentHeight: 300 })).toEqual({
      left: 20,
      top: 696 - 300,
      maxHeight: 696 - 55,
    });
    expect(dropdownMenuPosition({ trigger, window, insets, align: "start", contentHeight: 40 }).top).toBe(744);
  });

  it("flips above before the content is measured when almost no room is below", async () => {
    const { dropdownMenuPosition } = await import("../src/DropdownMenu");
    const trigger = { x: 20, y: 820, width: 100, height: 40 };
    const position = dropdownMenuPosition({ trigger, window, insets, align: "start", contentHeight: 0 });
    // Provisional height: two item rows plus padding.
    expect(position.top).toBe(816 - (48 * 2 + 6 * 2));
    expect(position.bottom).toBeUndefined();
  });

  it("stays below a mid-screen trigger before the content is measured", async () => {
    const { dropdownMenuPosition } = await import("../src/DropdownMenu");
    const trigger = { x: 20, y: 300, width: 100, height: 40 };
    const position = dropdownMenuPosition({ trigger, window, insets, align: "start", contentHeight: 0 });
    expect(position.top).toBe(344);
    expect(position.bottom).toBeUndefined();
  });

  it("sits at the top of the safe area without a trigger box", async () => {
    const { dropdownMenuPosition } = await import("../src/DropdownMenu");
    expect(dropdownMenuPosition({ trigger: null, window, insets, align: "end", contentHeight: 0 })).toEqual({
      top: 55,
      left: 8,
      maxHeight: 844 - 34 - 8 - 55,
    });
  });
});

describe("DropdownMenu parts", () => {
  it("throws outside a DropdownMenu", async () => {
    const { DropdownMenuItem } = await import("../src/DropdownMenu");
    expect(() => render(DropdownMenuItem({ children: "Edit" }))).toThrow("DropdownMenuItem must be inside a DropdownMenu.");
  });

  it("the trigger measures itself, then opens; pressed again it closes; it reports expanded", async () => {
    const { DropdownMenuTrigger } = await import("../src/DropdownMenu");
    const closed = context(false);
    menu.ref = { current: { measureInWindow: (callback: (...box: number[]) => void) => callback(10, 20, 30, 40) } };
    const onPress = vi.fn();
    const wrapper = DropdownMenuTrigger({ onPress, accessibilityLabel: "More" }) as unknown as Element;
    // A native view that Android cannot flatten away, so it can be measured.
    expect(wrapper.type).toBe("View");
    expect(wrapper.props).toMatchObject({ collapsable: false, accessible: false, style: { alignSelf: "flex-start" } });
    const trigger = wrapper.props.children as Element;
    expect(trigger.type).toBe("Pressable");
    expect(trigger.props).toMatchObject({ accessibilityRole: "button", accessibilityLabel: "More", accessibilityState: { expanded: false } });
    (trigger.props.onPress as (event: unknown) => void)({});
    expect(onPress).toHaveBeenCalledOnce();
    expect(closed.setTrigger).toHaveBeenCalledWith({ x: 10, y: 20, width: 30, height: 40 });
    expect(closed.setOpen).toHaveBeenCalledWith(true);

    const open = context(true);
    const again = (DropdownMenuTrigger({ asChild: true }) as unknown as Element).props.children as Element;
    expect(again.type).toBe("SlotPressable");
    expect(again.props.accessibilityState).toEqual({ expanded: true });
    (again.props.onPress as (event: unknown) => void)({});
    expect(open.setOpen).toHaveBeenCalledWith(false);
    expect(open.setTrigger).not.toHaveBeenCalled();
  });

  it("an empty measureInWindow box (Android, not laid out) falls back to measure; with both empty it opens without an anchor", async () => {
    const { DropdownMenuTrigger, measureAnchor, isMeasuredRect } = await import("../src/DropdownMenu");
    expect(isMeasuredRect({ x: 0, y: 0, width: 0, height: 0 })).toBe(false);
    expect(isMeasuredRect({ x: 0, y: 0, width: 32, height: 32 })).toBe(true);

    const done = vi.fn();
    measureAnchor(
      {
        measureInWindow: (callback) => callback(0, 0, 0, 0),
        measure: (callback) => callback(0, 0, 32, 32, 300, 700),
      },
      done,
    );
    expect(done).toHaveBeenCalledWith({ x: 300, y: 700, width: 32, height: 32 });

    const empty = vi.fn();
    measureAnchor({ measureInWindow: (callback) => callback(0, 0, 0, 0), measure: (callback) => callback(0, 0, 0, 0, 0, 0) }, empty);
    expect(empty).toHaveBeenCalledWith(null);

    // Through the trigger: a zero box is never stored as the anchor (it would place the menu top left).
    const closed = context(false);
    menu.ref = {
      current: {
        measureInWindow: (callback: (...box: number[]) => void) => callback(0, 0, 0, 0),
        measure: (callback: (...box: number[]) => void) => callback(0, 0, 0, 0, 0, 0),
      },
    };
    const trigger = (DropdownMenuTrigger({}) as unknown as Element).props.children as Element;
    (trigger.props.onPress as (event: unknown) => void)({});
    expect(closed.setTrigger).not.toHaveBeenCalled();
    expect(closed.setOpen).toHaveBeenCalledWith(true);
  });

  it("retries on the next frames when both readings are empty, and uses the first good one", async () => {
    const { measureAnchor } = await import("../src/DropdownMenu");
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (run: () => void) => frames.push(run));
    let reads = 0;
    const view = {
      measureInWindow: (callback: (...box: number[]) => void) => callback(...(++reads < 3 ? [0, 0, 0, 0] : [12, 700, 40, 40])),
      measure: (callback: (...box: number[]) => void) => callback(0, 0, 0, 0, 0, 0),
    };
    const done = vi.fn();
    measureAnchor(view, done);
    expect(done).not.toHaveBeenCalled();
    frames.shift()!();
    expect(done).not.toHaveBeenCalled();
    frames.shift()!();
    expect(done).toHaveBeenCalledOnce();
    expect(done).toHaveBeenCalledWith({ x: 12, y: 700, width: 40, height: 40 });

    // Out of retries: null, and no further frame.
    const never = vi.fn();
    measureAnchor({ measureInWindow: (callback) => callback(0, 0, 0, 0), measure: (callback) => callback(0, 0, 0, 0, 0, 0) }, never, 0);
    expect(never).toHaveBeenCalledWith(null);
    expect(frames).toHaveLength(0);
  });

  it("the wrapper's layout box is kept, and used when the live reading stays empty; an empty box is never stored", async () => {
    const { DropdownMenuTrigger } = await import("../src/DropdownMenu");
    const closed = context(false);
    let box = [30, 640, 44, 44];
    const view = {
      measureInWindow: (callback: (...box: number[]) => void) => callback(...box),
      measure: (callback: (...box: number[]) => void) => callback(0, 0, 0, 0, 0, 0),
    };
    menu.ref = { current: view };
    const wrapper = DropdownMenuTrigger({}) as unknown as Element;
    layout(wrapper, 44, 44);
    expect(closed.setTrigger).not.toHaveBeenCalled();
    const press = () => ((wrapper.props.children as Element).props.onPress as (event: unknown) => void)({});

    box = [0, 0, 0, 0];
    press();
    expect(closed.setTrigger).toHaveBeenCalledOnce();
    expect(closed.setTrigger).toHaveBeenCalledWith({ x: 30, y: 640, width: 44, height: 44 });
    expect(closed.setOpen).toHaveBeenCalledWith(true);

    // A layout that reads empty does not replace the good box, and no empty box reaches `setTrigger`.
    layout(wrapper, 0, 0);
    press();
    expect(closed.setTrigger).toHaveBeenLastCalledWith({ x: 30, y: 640, width: 44, height: 44 });
    for (const [rect] of closed.setTrigger.mock.calls) expect(rect).not.toMatchObject({ width: 0 });
  });

  it("builds the box from the press point and the layout size when every measure is empty", async () => {
    const { DropdownMenuTrigger, triggerRectFromPress, sizeFromStyle } = await import("../src/DropdownMenu");
    vi.stubGlobal("console", { ...console, log: vi.fn() });
    const empty = {
      measureInWindow: (callback: (...box: number[]) => void) => callback(0, 0, 0, 0),
      measure: (callback: (...box: number[]) => void) => callback(0, 0, 0, 0, 0, 0),
    };
    const touch = { nativeEvent: { pageX: 50, pageY: 2210, locationX: 20, locationY: 10 } };

    const closed = context(false);
    menu.ref = { current: empty };
    const wrapper = DropdownMenuTrigger({}) as unknown as Element;
    const press = () => ((wrapper.props.children as Element).props.onPress as (event: unknown) => void)(touch);
    // No layout size and no style size yet: the press anchors with the 44 point fallback.
    press();
    expect(closed.setTrigger).toHaveBeenLastCalledWith({ x: 30, y: 2200, width: 44, height: 44 });
    expect(closed.setOpen).toHaveBeenCalledWith(true);
    // An empty layout is not kept: still the fallback.
    layout(wrapper, 0, 0);
    press();
    expect(closed.setTrigger).toHaveBeenLastCalledWith({ x: 30, y: 2200, width: 44, height: 44 });
    layout(wrapper, 40, 46);
    press();
    expect(closed.setTrigger).toHaveBeenLastCalledWith({ x: 30, y: 2200, width: 40, height: 46 });

    // A numeric style size is used before the fallback, and sizes the host.
    const styled = context(false);
    const sized = DropdownMenuTrigger({ style: { width: 32, height: 36 } }) as unknown as Element;
    expect(sized.props.style).toEqual({ alignSelf: "flex-start", width: 32, height: 36 });
    expect((sized.props.children as Element).props.style).toEqual({ width: 32, height: 36 });
    ((sized.props.children as Element).props.onPress as (event: unknown) => void)(touch);
    expect(styled.setTrigger).toHaveBeenLastCalledWith({ x: 30, y: 2200, width: 32, height: 36 });
    expect(sizeFromStyle([{ width: 1, height: 1 }])).toBeUndefined();
    expect(sizeFromStyle(() => ({ width: 1, height: 1 }))).toBeUndefined();

    // The anchor is set before the measure completes; the live box then refines it.
    const order = context(false);
    let finish: (...box: number[]) => void = () => {};
    menu.ref = { current: { ...empty, measureInWindow: (callback: (...box: number[]) => void) => (finish = callback) } };
    const pending = DropdownMenuTrigger({}) as unknown as Element;
    ((pending.props.children as Element).props.onPress as (event: unknown) => void)(touch);
    expect(order.setTrigger).toHaveBeenCalledOnce();
    expect(order.setTrigger).toHaveBeenLastCalledWith({ x: 30, y: 2200, width: 44, height: 44 });
    expect(order.setOpen).toHaveBeenCalledWith(true);
    finish(31, 2201, 42, 43);
    expect(order.setTrigger).toHaveBeenLastCalledWith({ x: 31, y: 2201, width: 42, height: 43 });

    // A live measure is preferred over the press.
    const live = context(false);
    menu.ref = {
      current: { ...empty, measureInWindow: (callback: (...box: number[]) => void) => callback(5, 6, 7, 8) },
    };
    const again = DropdownMenuTrigger({}) as unknown as Element;
    layout(again, 40, 44);
    ((again.props.children as Element).props.onPress as (event: unknown) => void)(touch);
    expect(live.setTrigger).toHaveBeenCalledWith({ x: 5, y: 6, width: 7, height: 8 });

    expect(triggerRectFromPress(touch, undefined)).toBeNull();
    expect(triggerRectFromPress(touch, { width: 0, height: 44 })).toBeNull();
  });

  it("the trigger keeps a caller ref and fills its own handle from the same view", async () => {
    const { DropdownMenuTrigger } = await import("../src/DropdownMenu");
    context(false);
    const view = { measureInWindow: vi.fn() };
    const own = { current: null as unknown };
    menu.ref = own;
    const object = { current: null as unknown };
    const element = DropdownMenuTrigger({ ref: object as never }) as unknown as Element;
    (element.props.ref as (view: unknown) => void)(view);
    expect(own.current).toBe(view);
    expect(object.current).toBe(view);
    const calls: unknown[] = [];
    const withCallback = DropdownMenuTrigger({ ref: ((node: unknown) => calls.push(node)) as never }) as unknown as Element;
    (withCallback.props.ref as (view: unknown) => void)(view);
    expect(calls).toEqual([view]);
  });

  it("the content is a window layer with the overlay surface at radius 16, closed by an outside tap or Android back", async () => {
    const { DropdownMenuContent } = await import("../src/DropdownMenu");
    const value = context(true);
    const modal = DropdownMenuContent({ align: "end", children: "items" }) as unknown as Element;
    // In the app's window (a chat under it keeps its place), with no fade of its own: the panel moves.
    expect(modal.type).toBe("WindowLayer");
    expect(modal.props.fade).toBe(false);
    (modal.props.onRequestClose as () => void)();
    // The items' menu context, given again inside the layer, which loses it.
    const provider = modal.props.children as Element;
    expect(provider.props).toMatchObject({ value });
    // A full-size host in the layer (as `OverlayModal` has), holding the backdrop and the menu.
    const host = provider.props.children as Element;
    expect(host.type).toBe("View");
    expect(host.props.style).toEqual({ flex: 1 });
    expect(host.props.pointerEvents).toBe("box-none");
    const hosted = (host.props.children as Element[]).map((child) => child.props.testID ?? child.props.accessibilityRole);
    expect(hosted).toEqual(["DropdownMenu-backdrop", "menu"]);
    const backdrop = elements(modal).find((element) => element.props.testID === "DropdownMenu-backdrop")!;
    expect(backdrop.props).toMatchObject({ accessibilityRole: "button", accessibilityLabel: "Close menu" });
    (backdrop.props.onPress as () => void)();
    expect(value.setOpen).toHaveBeenCalledTimes(2);
    expect(value.setOpen).toHaveBeenCalledWith(false);
    const panel = elements(modal).find((element) => element.props.accessibilityRole === "menu")!;
    expect(panel.props.accessibilityViewIsModal).toBe(true);
    // Hidden until the content is measured, so it never shows below and then flips above.
    expect(panel.props.style).toMatchObject({ position: "absolute", right: 50, top: 144, minWidth: 192, maxWidth: 374, opacity: 0 });
    // Unused edges are `null`, so React Native clears an edge a flip leaves behind.
    expect(panel.props.style).toMatchObject({ bottom: null, left: null });
    const surface = elements(modal).find((element) => element.type === "FloatingSurface")!;
    expect(surface.props).toMatchObject({ blur: false, radius: tokens.radius.lg });
    expect(elements(modal).find((element) => element.type === "ScrollView")!.props.contentContainerStyle).toEqual({ padding: 6 });
    expect(DropdownMenuContent({ children: null })).not.toBeNull();
    context(false);
    expect(DropdownMenuContent({ children: null })).toBeNull();
  });

  it("an item is a 48-high menuitem with a 16 icon that selects, then closes, with no haptic", async () => {
    const { DropdownMenuItem } = await import("../src/DropdownMenu");
    const value = context(true);
    const onSelect = vi.fn();
    const tree = render(DropdownMenuItem({ children: "Rename", onSelect, icon: "IconPencil" as never })) as Element;
    expect(tree.type).toBe("Pressable");
    expect(tree.props.accessibilityRole).toBe("menuitem");
    // A plain object, not a function: NativeWind drops a function `style` on a
    // native Pressable, and the row then stacked the icon above the label.
    expect(typeof tree.props.style).toBe("object");
    expect(tree.props.style).toMatchObject({ flexDirection: "row", minHeight: 48, paddingLeft: 10, paddingRight: 10, paddingVertical: 12, borderRadius: 8, gap: 8 });
    expect(pressLayer(tree, false)).toBeUndefined();
    expect((pressLayer(tree, true)!.props.style as unknown[])[1]).toEqual({ borderRadius: 8, backgroundColor: palette.default.light });
    const icon = elements(tree).find((element) => element.type === "IconPencil")!;
    expect(icon.props).toEqual({ size: 16, color: palette.overlayForeground.light });
    const label = elements(tree).find((element) => element.type === "Text")!;
    expect(label.props.children).toBe("Rename");
    expect(label.props.style).toEqual([{ fontSize: 14, lineHeight: 20 }, { color: palette.overlayForeground.light }]);
    (tree.props.onPress as () => void)();
    expect(onSelect).toHaveBeenCalledOnce();
    expect(value.setOpen).toHaveBeenCalledWith(false);
    expect(haptics.selectionHaptic).not.toHaveBeenCalled();
  });

  it("a destructive item is in the danger colour; closeOnSelect false keeps the menu; disabled fades", async () => {
    const { DropdownMenuItem } = await import("../src/DropdownMenu");
    const value = context(true);
    const tree = render(DropdownMenuItem({ children: "Delete", destructive: true, closeOnSelect: false, disabled: true })) as Element;
    const label = elements(tree).find((element) => element.type === "Text")!;
    expect(label.props.style).toEqual([{ fontSize: 14, lineHeight: 20 }, { color: palette.danger.light }]);
    expect(tree.props.disabled).toBe(true);
    expect(tree.props.accessibilityState).toEqual({ disabled: true });
    expect(tree.props.style).toMatchObject({ opacity: 0.5 });
    expect(pressLayer(tree, true)).toBeUndefined();
    (tree.props.onPress as () => void)();
    expect(value.setOpen).not.toHaveBeenCalled();
  });

  it("a warning item (the web Archive) is in the warning colour, label and icon", async () => {
    const { DropdownMenuItem } = await import("../src/DropdownMenu");
    context(true);
    const tree = render(DropdownMenuItem({ children: "Archive", warning: true, icon: "IconArchive" as never })) as Element;
    const label = elements(tree).find((element) => element.type === "Text")!;
    expect(label.props.style).toEqual([{ fontSize: 14, lineHeight: 20 }, { color: palette.warning.light }]);
    expect(elements(tree).find((element) => element.type === "IconArchive")?.props.color).toBe(palette.warning.light);
  });

  it("a radio item reports checked and shows the check at left 10, the label inset 32", async () => {
    const { DropdownMenuRadioItem } = await import("../src/DropdownMenu");
    context(true);
    const on = render(DropdownMenuRadioItem({ children: "Newest", checked: true })) as Element;
    expect(on.props).toMatchObject({ accessibilityRole: "radio", accessibilityState: { disabled: false, checked: true } });
    expect((on.props.style as Record<string, number>).paddingLeft).toBe(32);
    const check = elements(on).find((element) => element.type === "IconCheck")!;
    expect(check.props).toEqual({ size: 16, color: palette.overlayForeground.light });
    const off = render(DropdownMenuRadioItem({ children: "Oldest", checked: false })) as Element;
    expect(off.props.accessibilityState).toEqual({ disabled: false, checked: false });
    expect(elements(off).some((element) => element.type === "IconCheck")).toBe(false);
    haptics.selectionHaptic.mockClear();
    (on.props.onPress as () => void)();
    expect(haptics.selectionHaptic).not.toHaveBeenCalled();
    (off.props.onPress as () => void)();
    expect(haptics.selectionHaptic).toHaveBeenCalledOnce();
  });

  it("keeps room above and below the label, and a 48 point row (56 with larger text)", async () => {
    const { DROPDOWN_MENU, DropdownMenuItem, DropdownMenuRadioItem } = await import("../src/DropdownMenu");
    // 12 each side: a 20 high `text-sm` line plus 24 is 44, under the 48 `minHeight` of a phone menu row.
    expect(DROPDOWN_MENU.itemPaddingY).toBeGreaterThanOrEqual(12);
    for (const larger of [false, true]) {
      menu.larger = larger;
      context(true);
      for (const row of [
        render(DropdownMenuItem({ children: "Rename" })) as Element,
        render(DropdownMenuRadioItem({ children: "Newest", checked: false })) as Element,
      ]) {
        const style = (row.props.style as Record<string, number>);
        expect(style.minHeight).toBe(larger ? 56 : 48);
        expect(style.paddingVertical).toBe(DROPDOWN_MENU.itemPaddingY);
        // The row height is the larger of `minHeight` and padding plus one line.
        expect(Math.max(style.minHeight!, style.paddingVertical! * 2 + (larger ? 28 : 20))).toBeGreaterThanOrEqual(44);
      }
    }
    menu.larger = false;
  });

  it("steps up with larger text", async () => {
    const { DropdownMenuItem, DropdownMenuLabel } = await import("../src/DropdownMenu");
    context(true);
    menu.larger = true;
    const tree = render(DropdownMenuItem({ children: "Rename", icon: "IconPencil" as never })) as Element;
    expect((tree.props.style as Record<string, number>).minHeight).toBe(56);
    expect(elements(tree).find((element) => element.type === "IconPencil")!.props.size).toBe(22);
    expect((elements(tree).find((element) => element.type === "Text")!.props.style as unknown[])[0]).toEqual({ fontSize: 18, lineHeight: 28 });
    const label = DropdownMenuLabel({ children: "Sort" }) as unknown as Element;
    expect((label.props.style as unknown[])[0]).toEqual({ fontSize: 16, lineHeight: 24 });
  });

  it("the label and separator follow the web classes", async () => {
    const { DropdownMenuLabel, DropdownMenuSeparator } = await import("../src/DropdownMenu");
    context(true);
    const label = DropdownMenuLabel({ children: "Sort" }) as unknown as Element;
    expect(label.props.accessibilityRole).toBe("header");
    expect(label.props.className).toBe("font-instrument-sans-semibold uppercase");
    expect(label.props.style).toEqual([
      { fontSize: 12, lineHeight: 16 },
      { fontWeight: "600" },
      { letterSpacing: 1.2, color: tokens.color.muted.light, paddingHorizontal: 10, paddingVertical: 6 },
    ]);
    const separator = DropdownMenuSeparator() as unknown as Element;
    expect(separator.props.style).toEqual({
      height: 1,
      marginHorizontal: -6,
      marginVertical: 4,
      backgroundColor: tokens.color.separator.light,
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { palette } from "../src/palette";
import { TOAST_ICONS, toastIconColor, type ToastIconVariant } from "../src/toastChrome";
import {
  DEFAULT_TOAST_DURATION,
  MAX_TOASTS,
  getToasts,
  subscribeToasts,
  toast,
} from "../src/toastStore";
import { tokens } from "../src/tokens";

// The store, then `Toaster` against the web `SonnerToaster` (`sonner.tsx`,
// default density, `toastIcons="filled24"` from `sonner-icons.tsx`). The
// component checks call `Toaster` with React Native, the SVG and animation
// peers and the React effects stubbed, and read the element tree it returns.

const scheme = vi.hoisted(() => ({ colorScheme: "light" as "light" | "dark" }));
const larger = vi.hoisted(() => ({ value: false }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: () => {},
  // No `GestureHandlerProvider`: the toast is drawn with no drag.
  useContext: () => null,
  useRef: <T>(current: T) => ({ current }),
  useState: <T>(initial: T) => [initial, () => {}],
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}));
vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default },
  AccessibilityInfo: { announceForAccessibility: () => {} },
  ActivityIndicator: "ActivityIndicator",
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "Animated.View" },
  FadeInUp: { duration: () => ({ easing: () => "enter" }) },
  FadeOutUp: { duration: () => ({ easing: () => "exit" }) },
  Easing: { bezier: () => "ease-out" },
  ReduceMotion: { System: "system" },
  cubicBezier: () => "cubic-bezier",
  LinearTransition: "layout",
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("react-native-screens", () => ({ FullWindowOverlay: "FullWindowOverlay" }));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path" }));
vi.mock("nativewind", () => ({ useColorScheme: () => scheme }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value }));

afterEach(() => {
  toast.dismiss();
  scheme.colorScheme = "light";
  larger.value = false;
});

describe("toast store", () => {
  it("queues toasts with variants and returns their ids", () => {
    const first = toast("Saved");
    const second = toast.error("Failed", { description: "Try again." });
    expect(getToasts().map((item) => [item.id, item.variant, item.title])).toEqual([
      [first, "default", "Saved"],
      [second, "error", "Failed"],
    ]);
    expect(getToasts()[1]!.description).toBe("Try again.");
    expect(getToasts()[0]!.duration).toBe(DEFAULT_TOAST_DURATION);
  });

  it("keeps loading toasts open and replaces a toast by id", () => {
    const id = toast.loading("Syncing");
    expect(getToasts()[0]!.duration).toBe(Infinity);
    toast.success("Synced", { id });
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({ id, variant: "success", title: "Synced" });
  });

  it(`shows at most ${MAX_TOASTS}, dropping the oldest`, () => {
    for (let i = 0; i < MAX_TOASTS + 2; i++) toast(`Toast ${i}`);
    expect(getToasts().map((item) => item.title)).toEqual(
      Array.from({ length: MAX_TOASTS }, (_, i) => `Toast ${i + 2}`),
    );
  });

  it("dismisses one toast or all, and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    const keep = toast.info("Keep");
    const drop = toast.warning("Drop");
    toast.dismiss(drop);
    expect(getToasts().map((item) => item.id)).toEqual([keep]);
    toast.dismiss();
    expect(getToasts()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
    toast("Unheard");
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("returns a new array on change, for useSyncExternalStore", () => {
    const before = getToasts();
    toast("Changed");
    expect(getToasts()).not.toBe(before);
    expect(getToasts()).toBe(getToasts());
  });
});

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

/** Every element in a tree, calling the function components `Toast.tsx` declares (`ToastCard`, `ToastIcon`). */
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  if (typeof element.type === "function" && /^Toast(?:Card|Icon)$/.test(element.type.name)) {
    return [element, ...elements((element.type as (props: unknown) => unknown)(element.props))];
  }
  return [element, ...elements(element.props.children)];
}

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : ((style as Record<string, unknown>) ?? {});

/** The tree of the one toast on screen. */
async function renderToast() {
  const { Toaster } = await import("../src/Toast");
  const all = elements(Toaster({}));
  const pressable = all.find((element) => String(element.props.testID).startsWith("toast-"))!;
  const surface = all.find((element) => [element.props.children].flat().includes(pressable))!;
  const title = all.find((element) => element.type === "Text" && element.props.children === getToasts()[0]!.title)!;
  const svg = all.find((element) => element.type === "Svg");
  const path = all.find((element) => element.type === "Path");
  const spinner = all.find((element) => element.type === "ActivityIndicator");
  return { all, pressable, surface, title, svg, path, spinner };
}

const VARIANTS: [ToastIconVariant, string, string][] = [
  ["success", "SuccessIcon", "text-success"],
  ["info", "InfoIcon", "text-primary"],
  ["warning", "WarningIcon", "text-warning"],
  ["error", "ErrorIcon", "text-destructive"],
];

describe("Toaster icons (web filled24 contract)", () => {
  it.each(VARIANTS)("draws %s as the filled path at 24, tinted, with no stroke", async (variant) => {
    toast[variant]("Done");
    const { svg, path, spinner } = await renderToast();
    expect(spinner).toBeUndefined();
    expect(svg!.props).toMatchObject({ width: 24, height: 24, viewBox: TOAST_ICONS[variant].viewBox });
    expect(path!.props).toMatchObject({ d: TOAST_ICONS[variant].d, fill: toastIconColor(variant, "light") });
    expect(path!.props.fillRule).toBe(variant === "warning" ? "evenodd" : undefined);
    expect(path!.props.clipRule).toBe(variant === "warning" ? "evenodd" : undefined);
    for (const props of [svg!.props, path!.props]) {
      expect(Object.keys(props).filter((key) => /^stroke/.test(key))).toEqual([]);
    }
  });

  it("tints in the dark scheme too", async () => {
    scheme.colorScheme = "dark";
    toast.info("Restored");
    expect((await renderToast()).path!.props.fill).toBe(palette.primary.dark);
  });

  it("keeps a spinner for loading and no icon for a plain toast", async () => {
    const id = toast.loading("Syncing");
    const loading = await renderToast();
    expect(loading.svg).toBeUndefined();
    expect(loading.spinner!.props).toMatchObject({ size: "small", color: tokens.color.muted.light });
    toast.dismiss(id);
    toast("Archived");
    const plain = await renderToast();
    expect(plain.svg).toBeUndefined();
    expect(plain.spinner).toBeUndefined();
  });
});

describe("Toaster type and chrome (web contract)", () => {
  it("steps the title up to text-lg with larger text, still at 500", async () => {
    larger.value = true;
    toast.success("Saved");
    const { title } = await renderToast();
    expect(flatten(title.props.style)).toMatchObject({ fontWeight: "500", fontSize: 18, lineHeight: 28 });
  });
});

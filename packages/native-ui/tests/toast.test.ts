import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { palette, withAlpha } from "../src/palette";
import {
  TOAST_ICON_SIZE,
  TOAST_ICONS,
  TOAST_RADIUS,
  TOAST_RING,
  TOAST_SHADOW,
  toastIconColor,
  toastShadowStyle,
  type ToastIconVariant,
} from "../src/toastChrome";
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
  FadeInUp: { duration: () => "enter" },
  FadeOutUp: { duration: () => "exit" },
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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webUi = (file: string) => readFileSync(join(root, "..", "ui", file), "utf8");
const source = readFileSync(join(root, "src/Toast.tsx"), "utf8");

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
  const web = webUi("src/ui/sonner-icons.tsx");
  /** The JSX of one web icon component. */
  const webIcon = (name: string) => web.slice(web.indexOf(`function ${name}()`), web.indexOf("\n}\n", web.indexOf(`function ${name}()`)));

  it("copies each web path, viewBox and fill rule", () => {
    for (const [variant, name] of VARIANTS) {
      const svg = webIcon(name);
      const evenOdd = /fillRule="evenodd"/.test(svg);
      expect(svg.match(/<path/g), name).toHaveLength(1);
      expect(TOAST_ICONS[variant], name).toEqual({
        viewBox: svg.match(/viewBox="([^"]+)"/)![1],
        d: svg.match(/\bd="([^"]+)"/)![1],
        ...(evenOdd ? { evenOdd: true } : {}),
      });
      if (evenOdd) expect(svg).toMatch(/clipRule="evenodd"/);
    }
    expect(TOAST_ICONS.error.viewBox).toBe("0 0 20 20");
    expect(TOAST_ICONS.warning.evenOdd).toBe(true);
  });

  it("are filled 24 shapes in the web colours, not stroked outlines", () => {
    for (const [variant, name, tone] of VARIANTS) {
      const svg = webIcon(name);
      expect(svg, name).toMatch(new RegExp(`className="h-6 w-6 fill-current ${tone}"`));
      expect(svg, name).not.toMatch(/stroke/);
      // `text-destructive` is `--danger` (tokens.css), so error is `palette.danger`.
      const expected = { success: palette.success, info: palette.primary, warning: palette.warning, error: palette.danger }[variant];
      for (const mode of ["light", "dark"] as const) {
        expect(toastIconColor(variant, mode), `${variant} ${mode}`).toBe(expected[mode]);
      }
    }
    expect(webUi("tokens/src/tokens.css")).toMatch(/--color-destructive: var\(--danger\);/);
    expect(TOAST_ICON_SIZE).toBe(24);
    expect(webUi("src/ui/sonner.tsx")).toMatch(/toastIcons === "filled24"\s+\? \{ \.\.\.filledToastIcons/);
  });

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

  it("no longer uses the Tabler outline icons", () => {
    expect(source).not.toMatch(/@tabler\/icons-react-native/);
    expect(source).not.toMatch(/IconCircleCheck|IconCircleX|IconAlertTriangle|IconInfoCircle/);
    expect(source).toMatch(/from "react-native-svg"/);
  });
});

describe("Toaster type and chrome (web contract)", () => {
  const sonner = webUi("src/ui/sonner.tsx");

  it("sets the title as the web: text-sm font-medium leading-snug, 14 / 19.25 at 500", async () => {
    expect(sonner).toMatch(/title: titleLeading === "5" \? "font-medium leading-5" : "font-medium leading-snug"/);
    expect(sonner).toMatch(/compact \? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"/);
    toast.success("Saved");
    const { title } = await renderToast();
    expect(title.props.className).toBe("font-instrument-sans-medium text-sm");
    expect(flatten(title.props.style)).toEqual({
      color: tokens.color.foreground.light,
      fontWeight: "500",
      fontSize: 14,
      lineHeight: 19.25,
    });
  });

  it("steps the title up to text-lg with larger text, still at 500", async () => {
    larger.value = true;
    toast.success("Saved");
    const { title } = await renderToast();
    expect(flatten(title.props.style)).toMatchObject({ fontWeight: "500", fontSize: 18, lineHeight: 28 });
  });

  it("lays the row out as the web: gap-3 px-4 py-3", async () => {
    expect(sonner).toMatch(/\$\{compact \? "gap-2" : "gap-3"\}/);
    toast.success("Saved");
    const { pressable } = await renderToast();
    expect(pressable.props.className).toBe("flex-row items-center gap-3 px-4 py-3");
  });

  it("has radius 16, the flat overlay fill and the web ring, in both schemes", async () => {
    expect(sonner).toMatch(/toastRadius = "lg"/);
    expect(sonner).toMatch(/lg: "rounded-lg"/);
    expect(TOAST_RADIUS).toBe(16);
    expect(TOAST_RADIUS).toBe(tokens.radius.lg);
    // `glass-panel-strong` is the flat `--overlay` (tokens.css).
    expect(sonner).toMatch(/toast: `group toast glass-panel-strong /);
    expect(webUi("tokens/src/tokens.css")).toMatch(/\.glass-panel-strong \{\s+background-color: var\(--overlay\);/);
    for (const mode of ["light", "dark"] as const) {
      scheme.colorScheme = mode;
      toast.success("Saved");
      const { surface } = await renderToast();
      expect(surface.type, mode).toBe("View");
      expect(flatten(surface.props.style), mode).toMatchObject({
        backgroundColor: palette.overlay[mode],
        borderColor: withAlpha(tokens.color.border[mode], 0.6),
        borderWidth: 1,
        borderRadius: 16,
      });
      toast.dismiss();
    }
  });

  it("has the web smooth-shadow-ring-md: a 1 ring at 60% border and 0 4px 12px at 0.08", async () => {
    const ring = webUi("tokens/examples/toaster/styles-tokens.css").match(
      /@utility smooth-shadow-ring-md \{\s+box-shadow:\s+0 0 0 (\d+)px color-mix\(in srgb, var\(--color-border\) (\d+)%, transparent\),\s+0 (\d+)px (\d+)px rgb\(0 0 0 \/ ([\d.]+)\);/,
    )!;
    expect(sonner).toMatch(/text-foreground smooth-shadow-ring-md/);
    expect(TOAST_RING).toEqual({ width: Number(ring[1]), alpha: Number(ring[2]) / 100 });
    expect(TOAST_SHADOW).toEqual({ offsetY: Number(ring[3]), blur: Number(ring[4]), opacity: Number(ring[5]) });
    expect(toastShadowStyle("android")).toEqual({ boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)" });
    expect(toastShadowStyle("web")).toEqual(toastShadowStyle("android"));
    expect(toastShadowStyle("ios")).toEqual({
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    });
    toast.success("Saved");
    const style = flatten((await renderToast()).surface.props.style);
    expect(style).toMatchObject(toastShadowStyle("ios"));
    // Not the floating row chrome it had to 0.3.11: radius 20, 0 8 20 at 0.12.
    expect(style.borderRadius).not.toBe(20);
    expect(style.shadowOpacity).not.toBe(0.12);
    expect(style.shadowRadius).not.toBe(20);
    expect(style.shadowOffset).not.toEqual({ width: 0, height: 8 });
  });
});

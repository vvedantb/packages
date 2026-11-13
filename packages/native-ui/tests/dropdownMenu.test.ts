import { afterEach, describe, expect, it, vi } from "vitest";
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

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useContext: () => menu.value,
  useState: <T>(initial: T) => [initial, vi.fn()],
  useRef: () => menu.ref,
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
  return [element, ...elements(element.props.children)];
};

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

afterEach(() => {
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
      bottom: 844 - 696,
      maxHeight: 696 - 55,
    });
    expect(dropdownMenuPosition({ trigger, window, insets, align: "start", contentHeight: 40 }).top).toBe(744);
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
    const trigger = DropdownMenuTrigger({ onPress, accessibilityLabel: "More" }) as unknown as Element;
    expect(trigger.type).toBe("Pressable");
    expect(trigger.props).toMatchObject({ accessibilityRole: "button", accessibilityLabel: "More", accessibilityState: { expanded: false } });
    (trigger.props.onPress as (event: unknown) => void)({});
    expect(onPress).toHaveBeenCalledOnce();
    expect(closed.setTrigger).toHaveBeenCalledWith({ x: 10, y: 20, width: 30, height: 40 });
    expect(closed.setOpen).toHaveBeenCalledWith(true);

    const open = context(true);
    const again = DropdownMenuTrigger({ asChild: true }) as unknown as Element;
    expect(again.type).toBe("SlotPressable");
    expect(again.props.accessibilityState).toEqual({ expanded: true });
    (again.props.onPress as (event: unknown) => void)({});
    expect(open.setOpen).toHaveBeenCalledWith(false);
    expect(open.setTrigger).not.toHaveBeenCalled();
  });

  it("the content is a transparent modal with the overlay surface at radius 16, closed by an outside tap or Android back", async () => {
    const { DropdownMenuContent } = await import("../src/DropdownMenu");
    const value = context(true);
    const modal = DropdownMenuContent({ align: "end", children: "items" }) as unknown as Element;
    expect(modal.type).toBe("Modal");
    expect(modal.props).toMatchObject({ visible: true, transparent: true, animationType: "fade", statusBarTranslucent: true });
    (modal.props.onRequestClose as () => void)();
    // A full-size host under the Modal (as `OverlayModal` has), holding the backdrop and the menu.
    const host = modal.props.children as Element;
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
    const surface = elements(modal).find((element) => element.type === "FloatingSurface")!;
    expect(surface.props).toMatchObject({ blur: false, radius: tokens.radius.lg });
    expect(elements(modal).find((element) => element.type === "ScrollView")!.props.contentContainerStyle).toEqual({ padding: 6 });
    expect(DropdownMenuContent({ children: null }).props.visible).toBe(true);
    context(false);
    expect((DropdownMenuContent({ children: null }) as unknown as Element).props.visible).toBe(false);
  });

  it("an item is a 48-high menuitem with a 16 icon that selects, then closes, with no haptic", async () => {
    const { DropdownMenuItem } = await import("../src/DropdownMenu");
    const value = context(true);
    const onSelect = vi.fn();
    const tree = render(DropdownMenuItem({ children: "Rename", onSelect, icon: "IconPencil" as never })) as Element;
    expect(tree.type).toBe("Pressable");
    expect(tree.props.accessibilityRole).toBe("menuitem");
    const style = (tree.props.style as (state: { pressed: boolean }) => Record<string, unknown>)({ pressed: false });
    expect(style).toMatchObject({ minHeight: 48, paddingLeft: 10, paddingRight: 10, paddingVertical: 12, borderRadius: 8, gap: 8, backgroundColor: "transparent" });
    const pressed = (tree.props.style as (state: { pressed: boolean }) => Record<string, unknown>)({ pressed: true });
    expect(pressed.backgroundColor).toBe(palette.default.light);
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
    expect((tree.props.style as (state: { pressed: boolean }) => Record<string, unknown>)({ pressed: true })).toMatchObject({
      opacity: 0.5,
      backgroundColor: "transparent",
    });
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
    expect((on.props.style as (state: { pressed: boolean }) => Record<string, unknown>)({ pressed: false }).paddingLeft).toBe(32);
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
        const style = (row.props.style as (state: { pressed: boolean }) => Record<string, number>)({ pressed: false });
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
    expect((tree.props.style as (state: { pressed: boolean }) => Record<string, unknown>)({ pressed: false }).minHeight).toBe(56);
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

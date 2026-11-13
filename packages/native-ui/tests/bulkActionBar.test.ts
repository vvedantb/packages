import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { palette, withAlpha } from "../src/palette";
import { tokens } from "../src/tokens";

// `BulkActionBar` (`/primitives` and root): the web floating selection bar.
// React Native and the menu are stubbed; the checks call the bar, render its
// function parts and read the element tree, against the web
// `bulk-action-bar.tsx`.

const env = vi.hoisted(() => ({ width: 390, larger: false }));
vi.mock("react-native", () => ({
  Platform: { OS: "android", select: (specifics: Record<string, unknown>) => specifics.android ?? specifics.default },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  useWindowDimensions: () => ({ width: env.width, height: 844, scale: 3, fontScale: 1 }),
}));
vi.mock("react-native-reanimated", () => ({
  FadeInDown: { duration: (ms: number) => ({ easing: () => `FadeInDown(${ms})` }) },
  FadeOutDown: { duration: (ms: number) => ({ easing: () => `FadeOutDown(${ms})` }) },
  Easing: { bezier: () => "ease-out" },
  ReduceMotion: { System: "system" },
  cubicBezier: () => "cubic-bezier",
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("@tabler/icons-react-native", () => ({ IconDots: "IconDots", IconX: "IconX" }));
// Parts run as plain functions here, outside a renderer: `useScheme` reads the
// theme version context (`ThemeVersionContext`), so `useContext` gives its default, 0.
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), useContext: () => 0 }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/FloatingSurface", () => ({ FloatingSurface: "FloatingSurface" }));
vi.mock("../src/DropdownMenu", () => ({
  DropdownMenu: "DropdownMenu",
  DropdownMenuContent: "DropdownMenuContent",
  DropdownMenuItem: "DropdownMenuItem",
  DropdownMenuTrigger: "DropdownMenuTrigger",
}));
vi.mock("../src/primitives/native-only-animated-view", () => ({ NativeOnlyAnimatedView: "AnimatedView" }));
vi.mock("../src/theme", () => ({ useLargerText: () => env.larger }));

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };
type Style = Record<string, unknown>;

const elements = (node: unknown): Element[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
};

const render = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(render);
  if (!node || typeof node !== "object" || !("props" in node)) return node;
  const element = node as Element;
  if (typeof element.type === "function") return render((element.type as (props: unknown) => unknown)(element.props));
  return { ...element, props: { ...element.props, children: render(element.props.children) } };
};

const text = (tree: unknown) =>
  elements(tree)
    .filter((element) => element.type === "Text")
    .map((element) => element.props.children);
const button = (tree: unknown, label: string) =>
  elements(tree).find((element) => element.type === "Pressable" && element.props.accessibilityLabel === label)!;
const pressStyle = (element: Element, pressed = false) => (element.props.style as (state: { pressed: boolean }) => Style)({ pressed });

const archive = { key: "archive", label: "Archive tasks", shortLabel: "Archive", icon: "IconArchive" as never, onClick: vi.fn() };
const remove = { key: "delete", label: "Delete tasks", shortLabel: "Delete", icon: "IconTrash" as never, destructive: true, onClick: vi.fn() };
const move = { key: "move", label: "Move to project", icon: "IconFolder" as never, onClick: vi.fn() };

async function bar(props: Partial<import("../src/BulkActionBar").BulkActionBarProps> = {}) {
  const { BulkActionBar } = await import("../src/BulkActionBar");
  const handlers = { onExitSelect: vi.fn(), onSelectAll: vi.fn(), onClearSelection: vi.fn() };
  const tree = render(
    BulkActionBar({
      isSelecting: true,
      selectedCount: 2,
      totalCount: 5,
      primaryActions: [archive],
      ...handlers,
      ...props,
    }),
  ) as Element;
  return { tree, ...handlers };
}

afterEach(() => {
  env.width = 390;
  env.larger = false;
  vi.clearAllMocks();
});

describe("BulkActionBar", () => {
  it("renders nothing while not selecting", async () => {
    const { BulkActionBar } = await import("../src/BulkActionBar");
    expect(
      BulkActionBar({ isSelecting: false, selectedCount: 0, totalCount: 0, primaryActions: [], onExitSelect() {}, onSelectAll() {}, onClearSelection() {} }),
    ).toBeNull();
  });

  it("floats 12 above the safe area, or above bottomOffset, centred on the glass surface at radius 16", async () => {
    const { tree } = await bar({ barKey: "tasks-bulk-bar" });
    expect(tree.type).toBe("AnimatedView");
    expect(tree.props).toMatchObject({ testID: "tasks-bulk-bar", entering: "FadeInDown(150)", exiting: "FadeOutDown(120)", pointerEvents: "box-none" });
    expect(tree.props.style).toEqual({ position: "absolute", left: 0, right: 0, bottom: 46, alignItems: "center", paddingHorizontal: 16 });
    const surface = elements(tree).find((element) => element.type === "FloatingSurface")!;
    expect(surface.props).toEqual(expect.objectContaining({ radius: 16, style: { maxWidth: 358 } }));
    expect(elements(tree).find((element) => element.type === "ScrollView")!.props).toMatchObject({
      horizontal: true,
      contentContainerStyle: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 10, paddingRight: 10, paddingVertical: 8 },
    });
    expect(((await bar({ bottomOffset: 130 })).tree.props.style as Style).bottom).toBe(142);
  });

  it("shows the count chip, Select all (n) and icon-only actions on a phone", async () => {
    const { tree, onSelectAll, onExitSelect } = await bar({ destructiveAction: remove });
    expect(text(tree)).toEqual([2, "Select all (5)"]);
    const chip = elements(tree).find((element) => element.props.accessibilityLabel === "2 selected")!;
    const chipBox = elements(chip).find((element) => element.type === "View" && (element.props.style as Style).borderRadius)!;
    expect(chipBox.props.style).toEqual({ borderRadius: tokens.radius.md, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: tokens.color.surfaceSecondary.light });
    const count = elements(chip).find((element) => element.type === "Text")!;
    expect(count.props.style).toEqual([
      { fontSize: 12, lineHeight: 16 },
      { fontWeight: "600" },
      { fontVariant: ["tabular-nums"], color: tokens.color.foreground.light },
    ]);
    const selectAll = elements(tree).find((element) => element.type === "Pressable" && text(element)[0] === "Select all (5)")!;
    (selectAll.props.onPress as () => void)();
    expect(onSelectAll).toHaveBeenCalledOnce();
    const action = button(tree, "Archive tasks");
    expect(action.props).toMatchObject({ accessibilityRole: "button", accessibilityState: { disabled: false }, hitSlop: { top: 4, bottom: 4, left: 0, right: 0 } });
    expect(elements(action).find((element) => element.type === "IconArchive")!.props).toEqual({ size: 17, color: tokens.color.muted.light });
    (action.props.onPress as () => void)();
    expect(archive.onClick).toHaveBeenCalledOnce();
    const del = button(tree, "Delete tasks");
    expect(elements(del).find((element) => element.type === "IconTrash")!.props.color).toBe(palette.danger.light);
    expect(pressStyle(del, true).backgroundColor).toBe(withAlpha(palette.danger.light, 0.1));
    const exit = button(tree, "Cancel selection");
    expect(elements(exit).some((element) => element.type === "IconX")).toBe(true);
    (exit.props.onPress as () => void)();
    expect(onExitSelect).toHaveBeenCalledOnce();
    // Dividers: after Select all, before the destructive action, before Cancel.
    expect(elements(tree).filter((element) => (element.props.style as Style | undefined)?.width === 1)).toHaveLength(3);
  });

  it("scrolls Cancel with the actions by default, and pins it outside the scroll with pinCancel", async () => {
    const scrolled = (tree: Element) => elements(tree).find((element) => element.type === "ScrollView")!;
    const { tree } = await bar({ destructiveAction: remove });
    expect(button(scrolled(tree), "Cancel selection")).toBeDefined();
    const pinned = await bar({ destructiveAction: remove, pinCancel: true });
    const scroll = scrolled(pinned.tree);
    expect(scroll.props.style).toEqual({ flexShrink: 1 });
    expect((scroll.props.contentContainerStyle as Style).paddingRight).toBe(0);
    expect(button(scroll, "Cancel selection")).toBeUndefined();
    const exit = button(pinned.tree, "Cancel selection");
    (exit.props.onPress as () => void)();
    expect(pinned.onExitSelect).toHaveBeenCalledOnce();
    // Still three dividers: the one before Cancel moves out with it.
    expect(elements(scroll).filter((element) => (element.props.style as Style | undefined)?.width === 1)).toHaveLength(2);
    expect(elements(pinned.tree).filter((element) => (element.props.style as Style | undefined)?.width === 1)).toHaveLength(3);
  });

  it("button boxes are the web h-9 rounded-lg, at least 44 wide, surface-secondary when pressed", async () => {
    const { tree } = await bar();
    const action = button(tree, "Archive tasks");
    expect(pressStyle(action)).toMatchObject({ height: 36, minWidth: 44, paddingHorizontal: 10, gap: 6, borderRadius: 16, backgroundColor: "transparent", opacity: 1 });
    expect(pressStyle(action, true).backgroundColor).toBe(tokens.color.surfaceSecondary.light);
  });

  it("shows labels and 'selected' from 640 wide, and Clear when all are selected", async () => {
    env.width = 820;
    const { tree, onClearSelection } = await bar({ selectedCount: 5 });
    expect(text(tree)).toEqual([5, "selected", "Clear", "Archive"]);
    const clear = elements(tree).find((element) => element.type === "Pressable" && text(element)[0] === "Clear")!;
    (clear.props.onPress as () => void)();
    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it("turns the actions off with no selection, and per action", async () => {
    const { tree } = await bar({ selectedCount: 0, primaryActions: [archive, { ...move, disabled: true }] });
    for (const label of ["Archive tasks", "Move to project"]) {
      expect(button(tree, label).props.disabled, label).toBe(true);
      expect(pressStyle(button(tree, label), true)).toMatchObject({ opacity: 0.3, backgroundColor: "transparent" });
    }
    expect(button(tree, "Cancel selection").props.disabled).toBe(false);
    const on = await bar({ primaryActions: [{ ...move, disabled: true }] });
    expect(button(on.tree, "Move to project").props.disabled).toBe(true);
  });

  it("puts moreActions behind a More actions DropdownMenu", async () => {
    const { tree } = await bar({ moreActions: [move, remove] });
    const trigger = elements(tree).find((element) => element.type === "DropdownMenuTrigger")!;
    expect(trigger.props).toMatchObject({ accessibilityLabel: "More actions", disabled: false });
    expect(elements(trigger).find((element) => element.type === "IconDots")!.props.size).toBe(17);
    expect(elements(tree).find((element) => element.type === "DropdownMenuContent")!.props).toMatchObject({ align: "end", sideOffset: 8 });
    const items = elements(tree).filter((element) => element.type === "DropdownMenuItem");
    expect(items.map((item) => item.props.children)).toEqual(["Move to project", "Delete tasks"]);
    expect(items[1]!.props).toMatchObject({ destructive: true, onSelect: remove.onClick, icon: "IconTrash", disabled: false });
    expect(elements((await bar({ moreActions: [] })).tree).some((element) => element.type === "DropdownMenu")).toBe(false);
  });

  it("steps up with larger text", async () => {
    env.larger = true;
    const { tree } = await bar();
    const action = button(tree, "Archive tasks");
    expect(pressStyle(action).height).toBe(48);
    expect(elements(action).find((element) => element.type === "IconArchive")!.props.size).toBe(22);
    const selectAll = elements(tree).find((element) => element.type === "Text" && element.props.children === "Select all (5)")!;
    expect((selectAll.props.style as Style[])[0]).toEqual({ fontSize: 18, lineHeight: 28 });
  });

  describe('placement="tabBar"', () => {
    // The archive icon stub, under another name.
    const read = { ...archive, key: "read", label: "Mark read", shortLabel: "Read", onClick: vi.fn() };
    const find = (tree: unknown, match: (element: Element) => boolean) => {
      const found = elements(tree).find(match);
      if (!found) throw new Error("no such element");
      return found;
    };
    const docked = (props: Partial<import("../src/BulkActionBar").BulkActionBarProps> = {}) =>
      bar({ placement: "tabBar", primaryActions: [read, archive], bottomOffset: 130, ...props });

    it("sits in the tab bar's slot, as high as the tab bar, a pill, and swaps in with no motion", async () => {
      const { tree } = await docked({ barKey: "inbox-bulk-bar" });
      expect(tree.props).toMatchObject({ testID: "inbox-bulk-bar", entering: undefined, exiting: undefined });
      // `tabBarSlotStyle` with the 34 bottom inset: bottomOffset is not used.
      expect(tree.props.style).toEqual({ position: "absolute", left: 16, right: 16, bottom: 50 });
      const surface = find(tree, (element) => element.type === "FloatingSurface");
      expect(surface.props).toMatchObject({ radius: 999, style: undefined });
      const row = surface.props.children as Element;
      expect(row.props.style).toMatchObject({ height: 64 });
    });

    it("shows each action's short label under its icon, 48 high and growing, with no count chip", async () => {
      const { tree } = await docked();
      expect(text(tree)).toEqual(["Select all (5)", "Read", "Archive"]);
      expect(elements(tree).some((element) => element.props.accessibilityLabel === "2 selected")).toBe(false);
      const action = button(tree, "Mark read");
      expect(pressStyle(action)).toMatchObject({ height: 48, minWidth: 48, flexGrow: 1, borderRadius: 999 });
      expect(find(action, (element) => element.type === "IconArchive").props.size).toBe(20);
      const label = find(action, (element) => element.type === "Text");
      expect(label.props).toMatchObject({ numberOfLines: 1, children: "Read" });
      expect((label.props.style as Style[])[0]).toEqual({ fontSize: 12, lineHeight: 16 });
      (action.props.onPress as () => void)();
      expect(read.onClick).toHaveBeenCalledOnce();
      // Select all keeps its own width; the header, not the bar, holds the X.
      const selectAll = find(tree, (element) => element.type === "Pressable" && text(element)[0] === "Select all (5)");
      expect(pressStyle(selectAll).flexGrow).toBeUndefined();
      expect(button(tree, "Cancel selection")).toBeUndefined();
    });

    it("has no Cancel (the header's X exits), and its scroll grows to fill the bar, with no dividers", async () => {
      const { tree, onExitSelect } = await docked();
      const scroll = find(tree, (element) => element.type === "ScrollView");
      expect(scroll.props.style).toEqual({ flexShrink: 1 });
      expect(scroll.props.contentContainerStyle).toMatchObject({ flexGrow: 1, gap: 0, paddingLeft: 8, paddingRight: 8, paddingVertical: 0 });
      // No dividers, as the tab bar, even with a destructive action.
      const withDelete = await docked({ destructiveAction: remove });
      expect(elements(withDelete.tree).filter((element) => (element.props.style as Style | undefined)?.width === 1)).toHaveLength(0);
      expect(button(tree, "Cancel selection")).toBeUndefined();
    });

    it("steps up to 56 high, a 24 icon and a 14 label with larger text, in the 72 bar", async () => {
      env.larger = true;
      const { tree } = await docked();
      const surface = find(tree, (element) => element.type === "FloatingSurface");
      expect((surface.props.children as Element).props.style).toMatchObject({ height: 72 });
      const action = button(tree, "Mark read");
      expect(pressStyle(action).height).toBe(56);
      expect(find(action, (element) => element.type === "IconArchive").props.size).toBe(24);
      expect((find(action, (element) => element.type === "Text").props.style as Style[])[0]).toEqual({ fontSize: 14, lineHeight: 20 });
    });

    it("turns the actions off with no selection", async () => {
      const { tree } = await docked({ selectedCount: 0 });
      expect(button(tree, "Mark read").props.disabled).toBe(true);
      expect(pressStyle(button(tree, "Mark read"))).toMatchObject({ opacity: 0.3 });
    });
  });
});

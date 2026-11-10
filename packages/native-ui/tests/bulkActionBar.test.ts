import { afterEach, describe, expect, it, vi } from "vitest";
import { palette, withAlpha } from "../src/palette";
import { tokens } from "../src/tokens";

// `BulkActionBar` (`/primitives` and root): the web floating selection bar.
// React Native and the menu are stubbed; the checks call the bar, render its
// function parts and read the element tree, against the web
// `bulk-action-bar.tsx`.

const env = vi.hoisted(() => ({ width: 390, larger: false }));
vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  useWindowDimensions: () => ({ width: env.width, height: 844, scale: 3, fontScale: 1 }),
}));
vi.mock("react-native-reanimated", () => ({
  FadeInUp: { duration: (ms: number) => `FadeInUp(${ms})` },
  FadeOutDown: { duration: (ms: number) => `FadeOutDown(${ms})` },
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("@tabler/icons-react-native", () => ({ IconDots: "IconDots", IconX: "IconX" }));
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
    expect(tree.props).toMatchObject({ testID: "tasks-bulk-bar", entering: "FadeInUp(150)", exiting: "FadeOutDown(150)", pointerEvents: "box-none" });
    expect(tree.props.style).toEqual({ position: "absolute", left: 0, right: 0, bottom: 46, alignItems: "center", paddingHorizontal: 16 });
    const surface = elements(tree).find((element) => element.type === "FloatingSurface")!;
    expect(surface.props).toEqual(expect.objectContaining({ radius: 16, style: { maxWidth: 358 } }));
    expect(elements(tree).find((element) => element.type === "ScrollView")!.props).toMatchObject({
      horizontal: true,
      contentContainerStyle: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8 },
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
});

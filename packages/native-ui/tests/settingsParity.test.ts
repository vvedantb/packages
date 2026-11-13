import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MIN_TOUCH_TARGET } from "../src/controlStyles";
import { tokens } from "../src/tokens";

// The settings parts against the web `SettingsSection`, `SettingsToggleRow`,
// `SettingsField` and `SettingsEmptyState`. The web values are written here
// as points (Tailwind `text-sm` 14 / 20, `text-xs` 12 / 16, `leading-relaxed`
// 1.625, weights 500 and 600). The parts are called with React Native,
// NativeWind and the larger-text setting stubbed, and the element trees they
// return are read. No source file is read.

const larger = vi.hoisted(() => ({ value: false }));
vi.mock("react-native", () => ({ View: "View", Text: "Text", Pressable: "Pressable" }));
// Parts run as plain functions here, outside a renderer: `useScheme` reads the
// theme version context (`ThemeVersionContext`), so `useContext` gives its default, 0.
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), useContext: () => 0 }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value }));
vi.mock("../src/cn", () => ({ cn: (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ") }));

type Style = { [key: string]: string | number | undefined } | Style[] | null | undefined | false;
type Props = { className?: string; style?: Style; children?: ReactNode; accessibilityRole?: string };

function elements(node: ReactNode): ReactElement<Props>[] {
  const found: ReactElement<Props>[] = [];
  Children.forEach(node, (child) => {
    if (!isValidElement<Props>(child)) return;
    found.push(child, ...elements(child.props.children));
  });
  return found;
}

function flatten(style: Style): { [key: string]: string | number | undefined } {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return style ? { ...style } : {};
}

function textOf(tree: ReactNode, text: string): ReactElement<Props> {
  const found = elements(tree).find((e) => e.type === "Text" && e.props.children === text);
  if (!found) throw new Error(`no Text draws "${text}"`);
  return found;
}

/** The points a native `Text` draws. */
function type(element: ReactElement<Props>) {
  const { fontSize, lineHeight, fontWeight, color } = flatten(element.props.style);
  return { fontSize, lineHeight, fontWeight, color };
}

const classes = (element?: ReactElement<Props>) => (element?.props.className ?? "").split(/\s+/).filter(Boolean);
const FG = tokens.color.foreground.light;
const MUTED = tokens.color.muted.light;

afterEach(() => {
  larger.value = false;
});

describe("SettingsSection", () => {
  const body = createElement("Body");
  const footer = createElement("Footer");

  async function render(bodyVariant?: "form" | "list" | "compact") {
    const { SettingsSection } = await import("../src/settings/SettingsSection");
    return SettingsSection({ title: "General", description: "How the app looks", footer, children: body, bodyVariant });
  }

  it("draws the title 14 / 20 / 600 in the foreground, as a header", async () => {
    const title = textOf(await render(), "General");
    expect(title.props.accessibilityRole).toBe("header");
    expect(type(title)).toEqual({ fontSize: 14, lineHeight: 20, fontWeight: "600", color: FG });
    expect(classes(title)).toEqual(expect.arrayContaining(["text-sm", "font-instrument-sans-semibold"]));
  });

  it("draws the description 14 / 22.75 muted with a 2 point top margin", async () => {
    const description = textOf(await render(), "How the app looks");
    expect(type(description)).toEqual({ fontSize: 14, lineHeight: 22.75, fontWeight: undefined, color: MUTED });
    expect(classes(description)).toEqual(expect.arrayContaining(["text-sm", "leading-relaxed", "mt-0.5", "font-instrument-sans"]));
  });

  it("uses the web section gap and header padding and gap", async () => {
    const [section, header] = elements(await render());
    expect(classes(section)).toEqual(expect.arrayContaining(["flex-col", "gap-2"]));
    expect(classes(header)).toEqual(expect.arrayContaining(["flex-row", "items-start", "justify-between", "gap-4", "px-4"]));
  });

  it.each([
    ["form", ["px-4", "py-5"]],
    ["list", ["flex-col"]],
    ["compact", ["px-4", "py-3"]],
  ] as const)("pads the %s body as the web BODY_VARIANT_CLASS", async (variant, expected) => {
    const view = elements(await render(variant)).find((e) => e.props.children === body);
    expect(classes(view).sort()).toEqual([...expected].sort());
  });

  it("draws the footer with padding, gap, end alignment and the secondary surface", async () => {
    const view = elements(await render()).find((e) => e.props.children === footer);
    expect(classes(view)).toEqual(expect.arrayContaining(["flex-row", "items-center", "justify-end", "gap-2", "px-4", "py-3"]));
    expect(flatten(view?.props.style).backgroundColor).toBe(tokens.color.surfaceSecondary.light);
  });
});

describe("SettingsToggleRow", () => {
  const action = createElement("Switch");

  async function render() {
    const { SettingsToggleRow } = await import("../src/settings/SettingsToggleRow");
    return SettingsToggleRow({ title: "Sounds", description: "Play a sound on reply", action });
  }

  it("draws the title 14 / 20 / 500 and the description 12 / 19.5, muted", async () => {
    const tree = await render();
    expect(type(textOf(tree, "Sounds"))).toEqual({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: FG });
    const description = textOf(tree, "Play a sound on reply");
    expect(type(description)).toEqual({ fontSize: 12, lineHeight: 19.5, fontWeight: undefined, color: MUTED });
    expect(classes(description)).toEqual(expect.arrayContaining(["text-xs", "leading-relaxed", "mt-1"]));
  });

  it("goes one text step up with larger text, with the same weight and leading", async () => {
    larger.value = true;
    const tree = await render();
    const title = textOf(tree, "Sounds");
    const description = textOf(tree, "Play a sound on reply");
    expect(type(title)).toMatchObject({ fontSize: 16, fontWeight: "500" });
    expect(classes(title)).toContain("text-base");
    expect(type(description)).toMatchObject({ fontSize: 14, lineHeight: 22.75 });
    expect(classes(description)).toContain("text-sm");
  });

  it("uses the web row padding and gap", async () => {
    const [row] = elements(await render());
    expect(classes(row)).toEqual(expect.arrayContaining(["flex-row", "items-center", "justify-between", "gap-4", "px-4", "py-3"]));
  });

  it("with onCheckedChange, the whole row is one 56-high switch named by the title, the inner switch hidden", async () => {
    const { SettingsToggleRow } = await import("../src/settings/SettingsToggleRow");
    const onCheckedChange = vi.fn();
    const row = SettingsToggleRow({ title: "Sounds", description: "Play a sound on reply", action, checked: true, onCheckedChange });
    expect(row.type).toBe("Pressable");
    expect(row.props).toMatchObject({
      accessibilityRole: "switch",
      accessibilityLabel: "Sounds",
      accessibilityHint: "Play a sound on reply",
      accessibilityState: { checked: true, disabled: false },
    });
    expect(row.props.className).toMatch(/(?:^|\s)min-h-14(?:\s|$)/);
    row.props.onPress();
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    const column = elements(row).find((element) => element.props.children === action);
    expect(column?.props).toMatchObject({ accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" });
    const plain = await render();
    expect(plain.type).toBe("View");
  });

  it("keeps a 44 touch target on the action column, above the web min-h-10", async () => {
    const column = elements(await render()).find((e) => e.props.children === action);
    expect(flatten(column?.props.style).minHeight).toBe(MIN_TOUCH_TARGET);
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(44);
  });
});

describe("SettingsField", () => {
  it("draws the label 14 / 20 / 500 and the help text 12 / 19.5 muted", async () => {
    const { SettingsField } = await import("../src/settings/SettingsField");
    const tree = SettingsField({ label: "Name", description: "Shown to others", children: createElement("Input") });
    const label = textOf(tree, "Name");
    const description = textOf(tree, "Shown to others");
    expect(type(label)).toEqual({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: FG });
    expect(classes(label)).toContain("mb-2");
    expect(type(description)).toEqual({ fontSize: 12, lineHeight: 19.5, fontWeight: undefined, color: MUTED });
    expect(classes(description)).toEqual(expect.arrayContaining(["mt-1.5", "leading-relaxed"]));
  });
});

describe("SettingsEmptyState", () => {
  const action = createElement("Button");
  const Icon = (_props: { size?: number; color?: string }) => null;

  async function render() {
    const { SettingsEmptyState } = await import("../src/settings/SettingsEmptyState");
    return SettingsEmptyState({ title: "No keys", description: "Add one", icon: Icon, action });
  }

  it("draws the title 14 / 20 / 500 and the description 12 / 19.5 muted", async () => {
    const tree = await render();
    expect(type(textOf(tree, "No keys"))).toEqual({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: FG });
    const description = textOf(tree, "Add one");
    expect(type(description)).toEqual({ fontSize: 12, lineHeight: 19.5, fontWeight: undefined, color: MUTED });
    expect(classes(description)).toEqual(expect.arrayContaining(["mt-2", "text-center", "leading-relaxed"]));
  });

  it("uses the web padding, a 28 half-opacity muted icon, and the action margin", async () => {
    const all = elements(await render());
    expect(classes(all[0])).toEqual(expect.arrayContaining(["items-center", "justify-center", "px-4", "py-16"]));
    const icon = all.find((e) => e.type === Icon);
    expect(icon?.props).toMatchObject({ size: 28, color: MUTED });
    const wrap = all.find((e) => e.props.children === icon);
    expect(classes(wrap)).toEqual(expect.arrayContaining(["mb-5", "opacity-50"]));
    expect(classes(all.find((e) => e.props.children === action))).toContain("mt-6");
  });

  it("draws a 32 icon with larger text", async () => {
    larger.value = true;
    const icon = elements(await render()).find((e) => e.type === Icon);
    expect(icon?.props).toMatchObject({ size: 32 });
  });
});

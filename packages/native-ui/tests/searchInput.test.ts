import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scaledFieldHeight, searchInputSize, touchSlop } from "../src/controlStyles";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

// `SearchInput` against the web `search-input.tsx` and `clear-input.tsx`. The
// behaviour checks call the component's render function with React Native,
// NativeWind and the Tabler icons stubbed, and read the element tree it
// returns.

const larger = vi.hoisted(() => ({ value: false }));
const fontScale = vi.hoisted(() => ({ value: 1 }));
vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default },
  View: "View",
  Pressable: "Pressable",
  TextInput: "TextInput",
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: fontScale.value }),
}));
// Parts run as plain functions here, outside a renderer: `useScheme` reads the
// theme version context (`ThemeVersionContext`), so `useContext` gives its default, 0.
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), useContext: () => 0 }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("@tabler/icons-react-native", () => ({ IconSearch: "IconSearch", IconX: "IconX" }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value }));

/** Points for a Tailwind spacing class such as `h-8`, `pl-9`, `px-3.5` or `right-2`. */
const points = (value: string) => Number(value) * 4;

afterEach(() => {
  larger.value = false;
  fontScale.value = 1;
});

describe("searchInputSize (web contract)", () => {

  it("is the web sm: h-8 pl-8, with the web responsive text class; native keeps text-sm", () => {
    const sm = searchInputSize("sm", false);
    expect(sm.text).toBe("text-sm");
  });

  it("is the web md: h-10 pl-9 and the phone text-base of the field, icon at left-3", () => {
    const md = searchInputSize("md", false);
    expect(md.text).toBe("text-base");
  });

  it("has the web icon, field end and clear button at both sizes", () => {
    for (const size of ["sm", "md"] as const) {
      expect(searchInputSize(size, false), size).toMatchObject({
        icon: 16,
        paddingRight: points("3.5"),
        filledPaddingRight: points("9"),
        clear: points("6"),
        clearIcon: 14,
        clearRight: points("2"),
      });
    }
  });

  it("keeps sm at 32 and md at 40: padding, border and line fit the lock, where the web py-2 would not", () => {
    // A 1 border above and below, and the `text-sm` 20 or `text-base` 24 line.
    const height = (paddingY: number, line: number) => 2 * paddingY + 2 + line;
    const sm = searchInputSize("sm", false);
    expect(height(sm.paddingY, 20)).toBeLessThanOrEqual(sm.height);
    expect(height(points("2"), 20)).toBeGreaterThan(sm.height);
    const md = searchInputSize("md", false);
    expect(height(md.paddingY, 24)).toBe(md.height);
    // The web py-2 drew md 42 high on Expo web at 0.3.11, before the lock.
    expect(height(points("2"), 24)).toBe(42);
  });

  it("locks the height without larger text and scales the lock with the font size", () => {
    expect(scaledFieldHeight(32, 1)).toBe(32);
    expect(scaledFieldHeight(32, 0.82)).toBe(32);
    expect(scaledFieldHeight(32, 1.5)).toBe(48);
    expect(scaledFieldHeight(undefined, 2)).toBeUndefined();
    // The line scales with the font and the padding does not, so it still fits.
    const sm = searchInputSize("sm", false);
    const md = searchInputSize("md", false);
    for (const scale of [1, 1.35, 2, 3.1]) {
      expect(2 * sm.paddingY + 2 + 20 * scale, `sm ${scale}`).toBeLessThanOrEqual(scaledFieldHeight(sm.height, scale)!);
      expect(2 * md.paddingY + 2 + 24 * scale, `md ${scale}`).toBeLessThanOrEqual(scaledFieldHeight(md.height, scale)!);
    }
    expect(searchInputSize("sm", true).height).toBeUndefined();
  });

  it("is the larger Input with larger text, at both sizes", () => {
    expect(searchInputSize("sm", true)).toEqual(searchInputSize("md", true));
    expect(searchInputSize("sm", true)).toMatchObject({ minHeight: 64, paddingY: 16, paddingRight: 16, text: "text-xl" });
  });
});

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

/** Every element in a tree that a render function returned (not rendered further). */
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : ((style as Record<string, unknown>) ?? {});

type Props = Record<string, unknown> & { value: string; onChange: (value: string) => void };

async function render(props: Props, ref: unknown = null) {
  const { SearchInput } = await import("../src/SearchInput");
  const { Input } = await import("../src/primitives/input");
  const tree = (SearchInput as unknown as { render(props: Props, ref: unknown): unknown }).render(props, ref);
  const all = elements(tree);
  const input = all.find((element) => element.type === Input)!;
  const icon = all.find((element) => element.type === "IconSearch")!;
  const iconBox = all.find((element) => [element.props.children].flat().includes(icon))!;
  const clear = all.find((element) => element.type === "Pressable");
  return { input, icon, iconBox, clear, style: flatten(input.props.style) };
}

describe("SearchInput (behaviour)", () => {
  it("draws the search icon and no clear button while empty", async () => {
    const { input, icon, iconBox, clear, style } = await render({ value: "", onChange: () => {} });
    expect(clear).toBeUndefined();
    expect(icon.props).toMatchObject({ size: 16, color: tokens.color.muted.light });
    expect(iconBox.props.pointerEvents).toBe("none");
    expect(flatten(iconBox.props.style).left).toBe(8);
    expect(input.props).toMatchObject({
      accessibilityLabel: "Search",
      placeholder: "Search",
      placeholderTextColor: palette.fieldPlaceholder.light,
      returnKeyType: "search",
    });
    expect(style).toMatchObject({ minHeight: 32, height: 32, paddingTop: 4, paddingBottom: 4, paddingLeft: 32, paddingRight: 14, fontSize: 14 });
    expect(style).not.toHaveProperty("lineHeight");
    expect(style.borderRadius).toBe(tokens.radius.field);
  });

  it("shows a labelled clear button with text, and reserves room for it", async () => {
    const { clear, style } = await render({ value: "pink", onChange: () => {} });
    expect(clear!.props).toMatchObject({
      accessibilityRole: "button",
      accessibilityLabel: "Clear search",
      hitSlop: touchSlop(24),
    });
    expect(flatten(clear!.props.style)).toMatchObject({ width: 24, height: 24 });
    expect(style.paddingRight).toBe(36);
    const cross = elements(clear).find((element) => element.type === "IconX")!;
    expect(cross.props).toEqual({ size: 14, color: tokens.color.muted.light, strokeWidth: 1.75 });
  });

  it("clears with onChange(\"\") and then onClear", async () => {
    const calls: string[] = [];
    const { clear } = await render({
      value: "pink",
      onChange: (value) => calls.push(`change:${value}`),
      onClear: () => calls.push("clear"),
    });
    (clear!.props.onPress as () => void)();
    expect(calls).toEqual(["change:", "clear"]);
  });

  it("calls onClear only when typing leaves the field empty", async () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    const { input } = await render({ value: "p", onChange, onClear });
    const type = input.props.onChangeText as (text: string) => void;
    type("pi");
    expect(onChange).toHaveBeenLastCalledWith("pi");
    expect(onClear).not.toHaveBeenCalled();
    type("");
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("clears without onClear", async () => {
    const onChange = vi.fn();
    const { clear } = await render({ value: "pink", onChange });
    (clear!.props.onPress as () => void)();
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("takes label, placeholder and clearLabel, and forwards the ref and other props", async () => {
    const ref = { current: null };
    const { input, clear } = await render(
      { value: "a", onChange: () => {}, label: "Find files", clearLabel: "Clear files", autoCorrect: false },
      ref,
    );
    expect(input.props).toMatchObject({ accessibilityLabel: "Find files", placeholder: "Find files", autoCorrect: false });
    expect(input.props.ref).toBe(ref);
    expect(clear!.props.accessibilityLabel).toBe("Clear files");
    const named = await render({ value: "", onChange: () => {}, label: "Find files", placeholder: "Name…" });
    expect(named.input.props).toMatchObject({ accessibilityLabel: "Find files", placeholder: "Name…" });
  });

  it("is 40 high with the icon at 12 at size md", async () => {
    const { iconBox, style } = await render({ value: "", onChange: () => {}, size: "md" });
    expect(style).toMatchObject({ minHeight: 40, height: 40, paddingTop: 7, paddingBottom: 7, paddingLeft: 36, fontSize: 16 });
    expect(flatten(iconBox.props.style).left).toBe(12);
  });

  it("grows the locked field with the system font size", async () => {
    fontScale.value = 1.5;
    expect((await render({ value: "", onChange: () => {} })).style.height).toBe(48);
    expect((await render({ value: "", onChange: () => {}, size: "md" })).style.height).toBe(60);
    fontScale.value = 0.82;
    expect((await render({ value: "", onChange: () => {} })).style.height).toBe(32);
  });

  it("hides the clear button on a field that is not editable", async () => {
    const { clear } = await render({ value: "pink", onChange: () => {}, editable: false });
    expect(clear).toBeUndefined();
  });

  it("steps up with larger text", async () => {
    larger.value = true;
    const { icon, clear, style } = await render({ value: "pink", onChange: () => {} });
    expect(style).toMatchObject({ minHeight: 64, fontSize: 20, fontWeight: "500", paddingRight: 48 });
    // No lock: the minimum height grows the larger field.
    expect(style.height).toBeUndefined();
    expect(icon.props.size).toBe(24);
    expect(clear!.props.hitSlop).toEqual(touchSlop(32));
  });
});

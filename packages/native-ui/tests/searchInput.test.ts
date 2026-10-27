import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchInputSize, touchSlop } from "../src/controlStyles";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

// `SearchInput` against the web `search-input.tsx` and `clear-input.tsx`. The
// behaviour checks call the component's render function with React Native,
// NativeWind and the Tabler icons stubbed, and read the element tree it
// returns.

const larger = vi.hoisted(() => ({ value: false }));
vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default },
  View: "View",
  Pressable: "Pressable",
  TextInput: "TextInput",
}));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("@tabler/icons-react-native", () => ({ IconSearch: "IconSearch", IconX: "IconX" }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webUi = (file: string) => readFileSync(join(root, "..", "ui", "src/ui", file), "utf8");
const source = readFileSync(join(root, "src/SearchInput.tsx"), "utf8");

/** Points for a Tailwind spacing class such as `h-8`, `pl-9`, `px-3.5` or `right-2`. */
const points = (value: string) => Number(value) * 4;

afterEach(() => {
  larger.value = false;
});

describe("searchInputSize (web contract)", () => {
  const web = webUi("search-input.tsx");
  const clear = webUi("clear-input.tsx");
  const webSize = (size: string) =>
    web.match(new RegExp(`${size}: \\{ input: "h-(\\d+) pl-(\\d+)([^"]*)", icon: "left-(\\d+)" \\}`));

  it("is the web sm: h-8 pl-8 text-sm, icon at left-2", () => {
    const [, h, pl, rest, left] = webSize("sm")!;
    const sm = searchInputSize("sm", false);
    expect(sm.minHeight).toBe(points(h!));
    expect(sm.paddingLeft).toBe(points(pl!));
    expect(rest!.trim()).toBe("text-sm");
    expect(sm.text).toBe("text-sm");
    expect(sm.iconLeft).toBe(points(left!));
  });

  it("is the web md: h-10 pl-9 and the phone text-base of the field, icon at left-3", () => {
    const [, h, pl, rest, left] = webSize("md")!;
    const md = searchInputSize("md", false);
    expect(md.minHeight).toBe(points(h!));
    expect(md.paddingLeft).toBe(points(pl!));
    expect(rest).toBe("");
    expect(clear).toMatch(/const inputClasses =\s+"flex h-10 w-full [^"]*px-3\.5 py-2 text-base sm:text-sm/);
    expect(md.text).toBe("text-base");
    expect(md.paddingY).toBe(points("2"));
    expect(md.iconLeft).toBe(points(left!));
  });

  it("has the web icon, field end and clear button at both sizes", () => {
    expect(web).toMatch(/size=\{config\?\.iconSize \?\? 16\}/);
    expect(clear).toMatch(/"absolute right-2 top-1\/2 z-4 inline-flex h-6 w-6 [^"]*rounded-md/);
    expect(clear).toMatch(/<IconX size=\{14\} stroke=\{1\.75\} \/>/);
    expect(clear).toMatch(/\(always \|\| filled\) && "pr-9"/);
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
    expect(source).toMatch(/<IconX size=\{metrics\.clearIcon\} color=\{muted\} stroke=\{1\.75\} \/>/);
  });

  it("keeps sm at 32: its padding, border and line fit, where the web py-2 would not", () => {
    const sm = searchInputSize("sm", false);
    // Taking the line as the `text-sm` 20, and a 1 border above and below.
    const height = (paddingY: number) => 2 * paddingY + 2 + 20;
    expect(height(sm.paddingY)).toBeLessThanOrEqual(sm.minHeight);
    expect(height(points("2"))).toBeGreaterThan(sm.minHeight);
  });

  it("is the larger Input with larger text, at both sizes", () => {
    const input = readFileSync(join(root, "src/Input.tsx"), "utf8");
    expect(input).toMatch(/largerText && "min-h-16 px-4 py-4 text-xl font-instrument-sans-medium"/);
    expect(searchInputSize("sm", true)).toEqual(searchInputSize("md", true));
    expect(searchInputSize("sm", true)).toMatchObject({ minHeight: 64, paddingY: 16, paddingRight: 16, text: "text-xl" });
  });

  it("uses the web defaults: sm, the Search label and the Clear search label", () => {
    expect(web).toMatch(/size = "sm"/);
    expect(web).toMatch(/const name = label \?\? config\?\.label \?\? "Search";/);
    expect(web).toMatch(/clearLabel=\{clearLabel \?\? config\?\.clearLabel \?\? "Clear search"\}/);
    expect(web).toMatch(/const hint = config\?\.enterKeyHint \?\? "search";/);
    expect(source).toMatch(/size = "sm",/);
    expect(source).toMatch(/label = "Search",/);
    expect(source).toMatch(/clearLabel = "Clear search",/);
    expect(source).toMatch(/returnKeyType="search"/);
  });

  it("has the Input field look and placeholder colour", () => {
    expect(source).toMatch(/fieldStyle\(scheme\),\s+fieldTextStyle\(scheme\),/);
    expect(source).toMatch(/placeholderTextColor \?\? palette\.fieldPlaceholder\[scheme\]/);
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
    expect(style).toMatchObject({ minHeight: 32, paddingLeft: 32, paddingRight: 14, fontSize: 14 });
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
    expect(style).toMatchObject({ minHeight: 40, paddingLeft: 36, fontSize: 16 });
    expect(flatten(iconBox.props.style).left).toBe(12);
  });

  it("hides the clear button on a field that is not editable", async () => {
    const { clear } = await render({ value: "pink", onChange: () => {}, editable: false });
    expect(clear).toBeUndefined();
  });

  it("steps up with larger text", async () => {
    larger.value = true;
    const { icon, clear, style } = await render({ value: "pink", onChange: () => {} });
    expect(style).toMatchObject({ minHeight: 64, fontSize: 20, fontWeight: "500", paddingRight: 48 });
    expect(icon.props.size).toBe(24);
    expect(clear!.props.hitSlop).toEqual(touchSlop(32));
  });
});

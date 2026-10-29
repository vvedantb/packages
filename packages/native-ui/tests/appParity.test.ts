import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MIN_TOUCH_TARGET, PAGE_HEADER_HEIGHT, cardStyle, touchSlop } from "../src/controlStyles";
import { palette, withAlpha } from "../src/palette";
import { tokens } from "../src/tokens";

// The 0.5.0 pieces for Verve, vibot and Velth: `ColorSwatches`, the
// `DateTimeField` date mode, null value and clear button, the `ListRow`
// slots, `StatGrid`, `SectionLabel`, `Card onPress`, `SheetRow`,
// `PageIndicator`, the `StatusDot` info tone, `StackPageHeader`,
// `IconButton` and `CaptureButton`. The checks call the components with React
// Native, NativeWind, the safe-area insets, the icons, the date picker and
// `dayjs` stubbed, and read the element trees they return. `useState` keeps
// its slots between calls, so a press followed by a second call reads the new
// state.

const scheme = vi.hoisted(() => ({ colorScheme: "light" as "light" | "dark" }));
const larger = vi.hoisted(() => ({ value: false }));
const haptic = vi.hoisted(() => vi.fn());
const hooks = vi.hoisted(() => {
  const state = { slots: [] as unknown[], cursor: 0 };
  function useState<T>(initial: T | (() => T)) {
    const i = state.cursor++;
    if (!(i in state.slots)) state.slots[i] = typeof initial === "function" ? (initial as () => T)() : initial;
    const set = (next: T | ((prev: T) => T)) => {
      state.slots[i] = typeof next === "function" ? (next as (prev: T) => T)(state.slots[i] as T) : next;
    };
    return [state.slots[i] as T, set] as const;
  }
  /** Calls `component` as a render, keeping the state of earlier calls since the last `reset`. */
  function render<T>(component: () => T): T {
    state.cursor = 0;
    return component();
  }
  function reset() {
    state.slots = [];
    state.cursor = 0;
  }
  return { useState, render, reset };
});

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: hooks.useState,
}));
vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default },
  StyleSheet: { create: <T>(styles: T) => styles, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  TouchableOpacity: "TouchableOpacity",
}));
vi.mock("nativewind", () => ({ useColorScheme: () => scheme }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("@tabler/icons-react-native", () => ({
  IconCheck: "IconCheck",
  IconChevronLeft: "IconChevronLeft",
  IconX: "IconX",
}));
vi.mock("@react-native-community/datetimepicker", () => ({ default: "DateTimePicker" }));
vi.mock("dayjs", () => {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    default: (date: Date) => ({
      format: (template: string) =>
        template === "HH:mm"
          ? `${pad(date.getHours())}:${pad(date.getMinutes())}`
          : `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
    }),
  };
});
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value, useAccentColor: () => "#db2777" }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/haptics", () => ({ selectionHaptic: haptic }));
vi.mock("../src/primitives/card", () => ({
  Card: "PrimitiveCard",
  CardHeader: "PrimitiveCardHeader",
  CardTitle: "PrimitiveCardTitle",
  CardContent: "PrimitiveCardContent",
}));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, "src", file), "utf8");

type Element = { type: unknown; key?: string | null; props: Record<string, unknown> & { children?: unknown } };

const isElement = (node: unknown): node is Element =>
  node != null && typeof node === "object" && "type" in node && "props" in node;

/** Direct element children, through arrays (not through fragments). */
const children = (element: Element): Element[] => [element.props.children].flat(Infinity).filter(isElement);

/** Every element in the tree, depth first. Component elements are not called. */
function all(element: unknown): Element[] {
  if (Array.isArray(element)) return element.flatMap(all);
  if (!isElement(element)) return [];
  return [element, ...all(element.props.children)];
}

const ofType = (tree: unknown, type: unknown) => all(tree).filter((element) => element.type === type);

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : ((style as Record<string, unknown>) ?? {});

afterEach(() => {
  scheme.colorScheme = "light";
  larger.value = false;
  haptic.mockClear();
  hooks.reset();
  vi.useRealTimers();
});

describe("StatusDot info tone", () => {
  it("is blue-500 in light and the lighter blue-400 in dark", async () => {
    const { StatusDot } = await import("../src/StatusDot");
    const dot = () => flatten((StatusDot({ tone: "info" }) as unknown as Element).props.style);
    expect(dot().backgroundColor).toBe("#3b82f6");
    scheme.colorScheme = "dark";
    expect(dot().backgroundColor).toBe("#60a5fa");
  });

  it("keeps the colour local: palette has no info key, and the other tones are unchanged", async () => {
    const { StatusDot } = await import("../src/StatusDot");
    expect(Object.keys(palette)).not.toContain("info");
    const colour = (tone: "critical" | "done") =>
      flatten((StatusDot({ tone }) as unknown as Element).props.style).backgroundColor;
    expect(colour("critical")).toBe(palette.danger.light);
    expect(colour("done")).toBe(palette.success.light);
    expect(read("StatusDot.tsx")).toMatch(/\| "info"\n/);
  });
});

describe("ColorSwatches", () => {
  const colors = ["#db2777", "#ffffff", "#000", "pink"];

  async function render(props: Record<string, unknown> = {}) {
    const { ColorSwatches } = await import("../src/ColorSwatches");
    const onChange = vi.fn();
    const group = ColorSwatches({
      value: "#DB2777",
      onChange,
      colors,
      labels: ["Pink"],
      accessibilityLabel: "Accent colour",
      testID: "accent",
      ...props,
    } as Parameters<typeof ColorSwatches>[0]) as unknown as Element;
    return { group, swatches: children(group), onChange };
  }

  it("is a labelled radio group of swatches, named by labels or their colour", async () => {
    const { group, swatches } = await render();
    expect(group.type).toBe("View");
    expect(group.props.accessibilityRole).toBe("radiogroup");
    expect(group.props.accessibilityLabel).toBe("Accent colour");
    expect(group.props.className).toMatch(/flex-row flex-wrap gap-3/);
    expect(swatches.map((swatch) => swatch.props.accessibilityRole)).toEqual(["radio", "radio", "radio", "radio"]);
    expect(swatches.map((swatch) => swatch.props.accessibilityLabel)).toEqual(["Pink", "#ffffff", "#000", "pink"]);
    expect(swatches.map((swatch) => swatch.props.testID)).toEqual(["accent-0", "accent-1", "accent-2", "accent-3"]);
  });

  it("checks the value without case, with a foreground ring and a readable check", async () => {
    const { swatches } = await render();
    expect(swatches.map((swatch) => (swatch.props.accessibilityState as { checked: boolean }).checked)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(flatten(swatches[0]!.props.style).borderColor).toBe(tokens.color.foreground.light);
    expect(flatten(swatches[1]!.props.style).borderColor).toBe("transparent");
    const [check] = ofType(swatches[0], "IconCheck");
    expect(check!.props).toMatchObject({ color: tokens.color.white, strokeWidth: 2 });
    expect(ofType(swatches[1], "IconCheck")).toHaveLength(0);
    // A white swatch takes a black check; a colour that is not hex has the ring only.
    expect(ofType((await render({ value: "#FFFFFF" })).swatches[1], "IconCheck")[0]!.props.color).toBe(tokens.color.black);
    const named = (await render({ value: "pink" })).swatches[3]!;
    expect(ofType(named, "IconCheck")).toHaveLength(0);
    expect(flatten(named.props.style).borderColor).toBe(tokens.color.foreground.light);
    // The ring follows the scheme.
    scheme.colorScheme = "dark";
    expect(flatten((await render()).swatches[0]!.props.style).borderColor).toBe(tokens.color.foreground.dark);
  });

  it("picks black or white by WCAG contrast", async () => {
    const { swatchCheckColor } = await import("../src/ColorSwatches");
    expect(swatchCheckColor("#ffffff")).toBe(tokens.color.black);
    expect(swatchCheckColor("#f59e0b")).toBe(tokens.color.black);
    expect(swatchCheckColor("#FFF")).toBe(tokens.color.black);
    expect(swatchCheckColor("#000")).toBe(tokens.color.white);
    expect(swatchCheckColor("#2563eb")).toBe(tokens.color.white);
    expect(swatchCheckColor("#181818")).toBe(tokens.color.white);
    expect(swatchCheckColor("pink")).toBeNull();
    expect(swatchCheckColor("#12345")).toBeNull();
  });

  it("calls onChange with the swatch colour and a selection haptic", async () => {
    const { swatches, onChange } = await render();
    (swatches[1]!.props.onPress as () => void)();
    expect(onChange).toHaveBeenCalledExactlyOnceWith("#ffffff");
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it("gives every size a 44 target with its hit slop, painted at 24 / 32 / 40", async () => {
    for (const largerText of [false, true]) {
      larger.value = largerText;
      for (const size of ["sm", "md", "lg"] as const) {
        const { swatches } = await render({ size });
        const outer = flatten(swatches[0]!.props.style).width as number;
        const slop = swatches[0]!.props.hitSlop as ReturnType<typeof touchSlop>;
        expect(slop).toEqual(touchSlop(outer));
        expect(outer + slop.left + slop.right, `${size} ${largerText}`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        // The 12 gap keeps neighbouring slops from overlapping.
        expect(slop.right + slop.left, `${size} ${largerText}`).toBeLessThanOrEqual(12);
        const disc = flatten(children(swatches[0]!)[0]!.props.style).width;
        if (!largerText) expect(disc).toBe({ sm: 24, md: 32, lg: 40 }[size]);
      }
    }
  });

  it("dims and disables every swatch when disabled", async () => {
    const { group, swatches } = await render({ disabled: true });
    expect(group.props.className).toMatch(/opacity-50/);
    for (const swatch of swatches) {
      expect(swatch.props.disabled).toBe(true);
      expect(swatch.props.accessibilityState).toMatchObject({ disabled: true });
    }
  });
});

describe("DateTimeField", () => {
  async function field(props: Record<string, unknown>) {
    const { DateTimeField } = await import("../src/DateTimeField");
    const draw = () =>
      hooks.render(() => DateTimeField({ onChange: () => {}, testID: "due", ...props } as Parameters<typeof DateTimeField>[0]) as unknown as Element);
    return draw;
  }
  const buttons = (tree: Element) =>
    ofType(tree, "Pressable").filter((element) => !String(element.props.testID).endsWith("-clear"));
  const label = (button: Element) => ofType(button, "Text")[0]!.props.children;
  const value = new Date(2026, 9, 29, 9, 41);

  it("keeps the date and time buttons for datetime and the time button for time", async () => {
    const tree = (await field({ value }))();
    expect(buttons(tree).map((button) => button.props.testID)).toEqual(["due-date", "due-time"]);
    expect(buttons(tree).map(label)).toEqual(["29 Oct 2026", "09:41"]);
    expect(flatten(ofType(buttons(tree)[0], "Text")[0]!.props.style).color).toBe(tokens.color.foreground.light);
    const time = (await field({ value, mode: "time" }))();
    expect(buttons(time).map((button) => button.props.testID)).toEqual(["due-time"]);
  });

  it("shows only the date button in date mode", async () => {
    const tree = (await field({ value, mode: "date" }))();
    expect(buttons(tree).map((button) => button.props.testID)).toEqual(["due-date"]);
    expect(buttons(tree).map(label)).toEqual(["29 Oct 2026"]);
  });

  it("shows the placeholder, in the field placeholder colour, while the value is null", async () => {
    const tree = (await field({ value: null, mode: "date", placeholder: "No due date" }))();
    const [button] = buttons(tree);
    expect(label(button!)).toBe("No due date");
    expect(button!.props.accessibilityLabel).toBe("No due date");
    expect(flatten(ofType(button, "Text")[0]!.props.style).color).toBe(palette.fieldPlaceholder.light);
    scheme.colorScheme = "dark";
    const dark = (await field({ value: null, mode: "date", placeholder: "No due date" }))();
    expect(flatten(ofType(buttons(dark)[0], "Text")[0]!.props.style).color).toBe(palette.fieldPlaceholder.dark);
    // Without a placeholder each button names what it picks.
    const both = (await field({ value: null }))();
    expect(buttons(both).map(label)).toEqual(["Select date", "Select time"]);
  });

  it("shows a 44 clear button only with onClear and a value; it calls onClear, not onChange", async () => {
    const onClear = vi.fn();
    const onChange = vi.fn();
    const empty = (await field({ value: null, mode: "date", onClear }))();
    expect(ofType(empty, "Pressable").filter((element) => element.props.testID === "due-clear")).toHaveLength(0);
    const noHandler = (await field({ value, mode: "date" }))();
    expect(ofType(noHandler, "IconX")).toHaveLength(0);
    const tree = (await field({ value, mode: "date", onClear, onChange }))();
    const [clear] = ofType(tree, "Pressable").filter((element) => element.props.testID === "due-clear");
    expect(clear!.props.accessibilityRole).toBe("button");
    expect(clear!.props.accessibilityLabel).toBe("Clear date");
    expect(flatten(clear!.props.style)).toMatchObject({ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET });
    (clear!.props.onPress as () => void)();
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    const time = (await field({ value, mode: "time", onClear }))();
    expect(ofType(time, "Pressable").find((element) => element.props.testID === "due-clear")!.props.accessibilityLabel).toBe(
      "Clear time",
    );
    const named = (await field({ value, onClear, clearLabel: "Remove reminder" }))();
    expect(ofType(named, "Pressable").find((element) => element.props.testID === "due-clear")!.props.accessibilityLabel).toBe(
      "Remove reminder",
    );
  });

  it("opens the picker on now for a null value, held back to maximumDate, and sets the value on set only", async () => {
    vi.useFakeTimers();
    const now = new Date(2026, 9, 29, 12, 0);
    vi.setSystemTime(now);
    const onChange = vi.fn();
    const draw = await field({ value: null, mode: "date", onChange });
    expect(ofType(draw(), "DateTimePicker")).toHaveLength(0);
    (buttons(draw())[0]!.props.onPress as () => void)();
    const [picker] = ofType(draw(), "DateTimePicker");
    expect(picker!.props.mode).toBe("date");
    expect((picker!.props.value as Date).getTime()).toBe(now.getTime());
    const handle = picker!.props.onChange as (event: { type: string }, next?: Date) => void;
    handle({ type: "dismissed" });
    expect(onChange).not.toHaveBeenCalled();
    const picked = new Date(2026, 10, 3);
    handle({ type: "set" }, picked);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(picked);

    hooks.reset();
    const maximumDate = new Date(2026, 0, 1);
    const capped = await field({ value: null, mode: "date", maximumDate });
    (buttons(capped())[0]!.props.onPress as () => void)();
    const [cappedPicker] = ofType(capped(), "DateTimePicker");
    expect((cappedPicker!.props.value as Date).getTime()).toBe(maximumDate.getTime());
    expect(cappedPicker!.props.maximumDate).toBe(maximumDate);
  });

  it("pickerSeed is the value, else now, else maximumDate when that is earlier", async () => {
    const { pickerSeed } = await import("../src/DateTimeField");
    const now = new Date(2026, 9, 29);
    expect(pickerSeed(value, undefined, now)).toBe(value);
    expect(pickerSeed(null, undefined, now)).toBe(now);
    expect(pickerSeed(null, new Date(2027, 0, 1), now)).toBe(now);
    const past = new Date(2026, 0, 1);
    expect(pickerSeed(null, past, now)).toBe(past);
  });
});

describe("ListRow", () => {
  function TestIcon() {
    return null;
  }

  async function row(props: Record<string, unknown>) {
    const { ListRow } = await import("../src/ListRow");
    return ListRow({ title: "Ada", ...props } as Parameters<typeof ListRow>[0]) as unknown as Element;
  }

  it("is one Pressable with the title as its name without a control, as before", async () => {
    const onPress = vi.fn();
    const tree = await row({ onPress, testID: "row", meta: "Hi" });
    expect(tree.type).toBe("Pressable");
    expect(tree.props).toMatchObject({ testID: "row", accessibilityRole: "button", accessibilityLabel: "Ada", onPress });
    expect(tree.props.className).toMatch(/active:opacity-70/);
    expect((await row({})).type).toBe("View");
  });

  it("puts the control beside the pressable area, not in it", async () => {
    const onPress = vi.fn();
    const control = { type: "Switch", props: { checked: true } };
    const tree = await row({ onPress, control, testID: "row", right: "chevron" });
    expect(tree.type).toBe("View");
    const [body, slot] = children(tree);
    expect(body!.type).toBe("Pressable");
    expect(body!.props).toMatchObject({ testID: "row", accessibilityRole: "button", accessibilityLabel: "Ada", onPress });
    expect(body!.props.className).toMatch(/flex-1/);
    expect(all(body).some((element) => element.type === "Switch")).toBe(false);
    expect(slot!.type).toBe("View");
    expect(children(slot!)).toEqual([control]);
    // `right` stays in the pressable area.
    expect([body!.props.children].flat(Infinity)).not.toContain(control);
    expect(JSON.stringify(body!.props.children)).toContain("chevron");
    // Without onPress the body is a view; nothing is pressable.
    const still = await row({ control });
    expect(ofType(still, "Pressable")).toHaveLength(0);
    expect(children(still)[1]!.props.children).toBe(control);
  });

  it("is pressable with only onLongPress, and passes both handlers", async () => {
    const onLongPress = vi.fn();
    const tree = await row({ onLongPress });
    expect(tree.type).toBe("Pressable");
    expect(tree.props.onLongPress).toBe(onLongPress);
    expect(tree.props.onPress).toBeUndefined();
    const withControl = await row({ onLongPress, control: "x" });
    expect(children(withControl)[0]!.props.onLongPress).toBe(onLongPress);
  });

  it("shows leading in place of the icon, and the icon without it", async () => {
    const leading = { type: "Avatar", props: {} };
    const withLeading = await row({ icon: TestIcon, leading });
    expect(ofType(withLeading, TestIcon)).toHaveLength(0);
    expect(ofType(withLeading, "Avatar")).toHaveLength(1);
    const withIcon = await row({ icon: TestIcon });
    expect(ofType(withIcon, TestIcon)).toHaveLength(1);
  });

  it("puts titleEnd at the end of the title line, and the title gives way first", async () => {
    const badge = { type: "Badge", props: { children: "2" } };
    const tree = await row({ titleEnd: badge });
    const title = ofType(tree, "Text").find((text) => text.props.children === "Ada")!;
    expect(title.props.className).toMatch(/min-w-0 flex-1/);
    const line = all(tree).find((element) => children(element).includes(title))!;
    expect(line.props.className).toMatch(/flex-row items-center/);
    const end = children(line)[1]!;
    expect(end.props.className).toBe("shrink-0");
    expect(end.props.children).toBe(badge);
    expect((await row({})).props.children).toBeDefined();
    const plain = ofType(await row({}), "Text").find((text) => text.props.children === "Ada")!;
    expect(plain.props.className).not.toMatch(/flex-1/);
  });

  it("takes an accessibilityLabel in place of the title", async () => {
    expect((await row({ onPress: () => {}, accessibilityLabel: "Ada, unread" })).props.accessibilityLabel).toBe("Ada, unread");
  });
});

describe("Card onPress", () => {
  async function card(props: Record<string, unknown>) {
    const { Card } = await import("../src/Card");
    return Card({ children: "Body", ...props } as Parameters<typeof Card>[0]) as unknown as Element;
  }

  it("stays the flat card surface without onPress", async () => {
    const tree = await card({ title: "Today", testID: "card" });
    expect(tree.type).toBe("PrimitiveCard");
    expect(tree.props.testID).toBe("card");
    expect(tree.props.style).toEqual(cardStyle("light"));
  });

  it("becomes a Pressable button named by the title, fading while pressed", async () => {
    const onPress = vi.fn();
    const tree = await card({ title: "Today", testID: "card", onPress });
    expect(tree.type).toBe("Pressable");
    expect(tree.props).toMatchObject({ testID: "card", accessibilityRole: "button", accessibilityLabel: "Today", onPress });
    expect(tree.props.className).toBe("active:opacity-70");
    const [surface] = children(tree);
    expect(surface!.type).toBe("PrimitiveCard");
    expect(surface!.props.testID).toBeUndefined();
    const named = await card({ onPress, accessibilityLabel: "Open today" });
    expect(named.props.accessibilityLabel).toBe("Open today");
  });
});

describe("StatGrid", () => {
  it("statGridRows fills rows and pads the last", async () => {
    const { statGridRows } = await import("../src/StatGrid");
    expect(statGridRows([1, 2, 3], 2)).toEqual([[1, 2], [3, null]]);
    expect(statGridRows([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
    expect(statGridRows([1, 2, 3, 4], 3)).toEqual([[1, 2, 3], [4, null, null]]);
    expect(statGridRows([], 2)).toEqual([]);
  });

  it("draws label and value tiles on the flat card, read as one element", async () => {
    const { StatGrid } = await import("../src/StatGrid");
    const items = [
      { label: "Done", value: "6", testID: "done" },
      { label: "This week", value: "31" },
      { label: "Streak", value: "12 days" },
    ];
    const grid = StatGrid({ items, testID: "stats" }) as unknown as Element;
    expect(grid.props.testID).toBe("stats");
    const rows = children(grid);
    expect(rows).toHaveLength(2);
    expect(children(rows[1]!)).toHaveLength(2);
    expect(children(rows[1]!)[1]!.props.className).toBe("flex-1");
    const tile = children(rows[0]!)[0]!;
    expect(tile.props).toMatchObject({ testID: "done", accessible: true, accessibilityLabel: "Done, 6" });
    expect(tile.props.style).toEqual(cardStyle("light"));
    expect(tile.props.className).toMatch(/flex-1/);
    const [label, value] = children(tile);
    expect(flatten(label!.props.style)).toMatchObject({ color: tokens.color.muted.light, fontSize: 14 });
    expect(flatten(value!.props.style)).toMatchObject({
      color: tokens.color.foreground.light,
      fontWeight: "600",
      fontSize: 20,
    });
    expect(value!.props.className).toMatch(/font-instrument-sans-semibold/);
    expect(children(StatGrid({ items, columns: 3 }) as unknown as Element)).toHaveLength(1);
    expect(StatGrid({ items: [] })).toBeNull();
  });
});

describe("SectionLabel", () => {
  async function label(props: Record<string, unknown> = {}) {
    const { SectionLabel } = await import("../src/SectionLabel");
    return SectionLabel({ children: "Today", ...props } as Parameters<typeof SectionLabel>[0]) as unknown as Element;
  }

  it("is a muted text-xs medium header with slightly open spacing", async () => {
    const tree = await label({ numberOfLines: 1 });
    expect(tree.type).toBe("Text");
    expect(tree.props.accessibilityRole).toBe("header");
    expect(tree.props.numberOfLines).toBe(1);
    expect(tree.props.className).toBe("font-instrument-sans-medium text-xs");
    const style = flatten(tree.props.style);
    expect(style).toMatchObject({ color: tokens.color.muted.light, fontSize: 12, fontWeight: "500", textTransform: "none" });
    expect(style.letterSpacing as number).toBeCloseTo(0.24);
  });

  it("can be capitals with the web tracking-widest, takes className and style, and steps up with larger text", async () => {
    const caps = flatten((await label({ uppercase: true })).props.style);
    expect(caps.textTransform).toBe("uppercase");
    expect(caps.letterSpacing as number).toBeCloseTo(1.2);
    const custom = await label({ className: "px-4", style: { color: "red" } });
    expect(custom.props.className).toMatch(/px-4$/);
    expect(flatten(custom.props.style).color).toBe("red");
    larger.value = true;
    expect(flatten((await label()).props.style).fontSize).toBe(16);
  });
});

describe("SheetRow", () => {
  async function sheetRow(props: Record<string, unknown> = {}) {
    const { SheetRow } = await import("../src/SheetRow");
    return SheetRow({ title: "Delete", ...props } as Parameters<typeof SheetRow>[0]) as unknown as Element;
  }
  function TestIcon() {
    return null;
  }
  const pressedFill = (tree: Element, pressed: boolean) =>
    (tree.props.style as (state: { pressed: boolean }) => Record<string, unknown>)({ pressed }).backgroundColor;

  it("is a labelled button at least 56 high, with the web menu highlight while pressed", async () => {
    const onPress = vi.fn();
    const tree = await sheetRow({ detail: "From all devices", onPress, testID: "delete" });
    expect(tree.type).toBe("Pressable");
    expect(tree.props).toMatchObject({
      testID: "delete",
      accessibilityRole: "button",
      accessibilityLabel: "Delete",
      accessibilityHint: "From all devices",
      accessibilityState: { disabled: false, selected: false },
      onPress,
    });
    expect(tree.props.className).toMatch(/min-h-14/);
    expect(pressedFill(tree, true)).toBe(palette.default.light);
    expect(pressedFill(tree, false)).toBe("transparent");
  });

  it("draws danger rows in the danger colour, title and icon", async () => {
    const tree = await sheetRow({ danger: true, icon: TestIcon });
    expect(ofType(tree, TestIcon)[0]!.props.color).toBe(palette.danger.light);
    const title = ofType(tree, "Text").find((text) => text.props.children === "Delete")!;
    expect(flatten(title.props.style).color).toBe(palette.danger.light);
    const plain = await sheetRow({ icon: TestIcon });
    expect(ofType(plain, TestIcon)[0]!.props.color).toBe(tokens.color.foreground.light);
  });

  it("checks the active row and dims a disabled one", async () => {
    const active = await sheetRow({ active: true });
    expect(ofType(active, "IconCheck")).toHaveLength(1);
    expect(active.props.accessibilityState).toMatchObject({ selected: true });
    expect(ofType(await sheetRow(), "IconCheck")).toHaveLength(0);
    const disabled = await sheetRow({ disabled: true, onPress: () => {} });
    expect(disabled.props.disabled).toBe(true);
    expect(disabled.props.accessibilityState).toMatchObject({ disabled: true });
    expect(disabled.props.className).toMatch(/opacity-50/);
    expect(pressedFill(disabled, true)).toBe("transparent");
  });
});

describe("PageIndicator", () => {
  async function indicator(props: Record<string, unknown>) {
    const { PageIndicator } = await import("../src/PageIndicator");
    return PageIndicator({ count: 5, index: 1, ...props } as Parameters<typeof PageIndicator>[0]) as unknown as Element | null;
  }

  it("draws nothing for one page, as the web CarouselDots", async () => {
    expect(await indicator({ count: 1, index: 0 })).toBeNull();
    expect(await indicator({ count: 0, index: 0 })).toBeNull();
  });

  it("is one element reading the page without onChange, with the web dot sizes and colours", async () => {
    const tree = (await indicator({ testID: "pages" }))!;
    expect(tree.props).toMatchObject({ testID: "pages", accessible: true, accessibilityLabel: "Page 2 of 5" });
    expect(flatten(tree.props.style).gap).toBe(6);
    const dots = children(tree).map((dot) => flatten(dot.props.style));
    expect(dots).toHaveLength(5);
    expect(dots[1]).toMatchObject({ width: 16, height: 6, backgroundColor: palette.primary.light });
    expect(dots[0]).toMatchObject({ width: 6, height: 6, backgroundColor: withAlpha(tokens.color.muted.light, 0.3) });
    expect(ofType(tree, "Pressable")).toHaveLength(0);
    expect((await indicator({ count: 3, index: 9 }))!.props.accessibilityLabel).toBe("Page 3 of 3");
  });

  it("makes each dot a 44 button named 'Page N of M' with onChange", async () => {
    const onChange = vi.fn();
    const tree = (await indicator({ onChange, testID: "pages" }))!;
    const dots = ofType(tree, "Pressable");
    expect(dots.map((dot) => dot.props.accessibilityLabel)).toEqual([
      "Page 1 of 5",
      "Page 2 of 5",
      "Page 3 of 5",
      "Page 4 of 5",
      "Page 5 of 5",
    ]);
    expect(dots.map((dot) => (dot.props.accessibilityState as { selected: boolean }).selected)).toEqual([
      false,
      true,
      false,
      false,
      false,
    ]);
    for (const dot of dots) {
      expect(dot.props.accessibilityRole).toBe("button");
      expect(flatten(dot.props.style)).toMatchObject({ minWidth: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET });
    }
    (dots[3]!.props.onPress as () => void)();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(3);
  });
});

describe("IconButton", () => {
  function TestIcon() {
    return null;
  }
  async function button(props: Record<string, unknown> = {}) {
    const { IconButton } = await import("../src/IconButton");
    return IconButton({ icon: TestIcon, label: "Close camera", ...props } as Parameters<typeof IconButton>[0]) as unknown as Element;
  }

  it("is a labelled button that reaches 44 at every size", async () => {
    for (const largerText of [false, true]) {
      larger.value = largerText;
      for (const size of ["sm", "md", "lg"] as const) {
        const tree = await button({ size });
        const { width } = flatten(tree.props.style) as { width: number };
        const slop = tree.props.hitSlop as ReturnType<typeof touchSlop>;
        expect(width + slop.left + slop.right, `${size} ${largerText}`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        if (!largerText) expect(width).toBe({ sm: 32, md: 40, lg: 48 }[size]);
      }
    }
    const tree = await button({ testID: "close" });
    expect(tree.props).toMatchObject({
      testID: "close",
      accessibilityRole: "button",
      accessibilityLabel: "Close camera",
      accessibilityState: { disabled: false },
    });
  });

  it("overlay is a translucent black circle with a white icon in both schemes", async () => {
    for (const mode of ["light", "dark"] as const) {
      scheme.colorScheme = mode;
      const tree = await button({ variant: "overlay" });
      expect(flatten(tree.props.style)).toMatchObject({ backgroundColor: "rgba(0, 0, 0, 0.35)", borderRadius: 20 });
      expect(ofType(tree, TestIcon)[0]!.props.color).toBe(tokens.color.white);
    }
  });

  it("default is the bordered surface in the scheme's colours; iconColor and disabled apply", async () => {
    const tree = await button();
    expect(flatten(tree.props.style)).toMatchObject({
      backgroundColor: tokens.color.surface.light,
      borderColor: tokens.color.border.light,
    });
    expect(ofType(tree, TestIcon)[0]!.props.color).toBe(tokens.color.foreground.light);
    expect(ofType(await button({ iconColor: "#ff0000" }), TestIcon)[0]!.props.color).toBe("#ff0000");
    const disabled = await button({ disabled: true });
    expect(disabled.props.disabled).toBe(true);
    expect(disabled.props.className).toMatch(/opacity-50/);
  });

  it("is its own component: it does not import the AI chat button, which keeps its name", () => {
    expect(read("IconButton.tsx")).not.toMatch(/from "\.\/ai/);
    expect(read("IconButton.tsx")).toMatch(/export function IconButton\(/);
    expect(read("ai/icon-button.tsx")).toMatch(/export function ChatIconButton\(/);
    expect(read("ai/icon-button.tsx")).not.toMatch(/export function IconButton\b/);
  });
});

describe("CaptureButton", () => {
  async function shutter(props: Record<string, unknown> = {}) {
    const { CaptureButton } = await import("../src/CaptureButton");
    return CaptureButton(props as Parameters<typeof CaptureButton>[0]) as unknown as Element;
  }
  const disc = (tree: Element, pressed: boolean) =>
    flatten(((tree.props.children as (state: { pressed: boolean }) => Element)({ pressed })).props.style);

  it("is a 76 white ring and disc named 'Take photo' by default", async () => {
    const tree = await shutter({ testID: "shutter" });
    expect(tree.props).toMatchObject({
      testID: "shutter",
      accessibilityRole: "button",
      accessibilityLabel: "Take photo",
      accessibilityState: { disabled: false },
    });
    const ring = flatten(tree.props.style);
    expect(ring).toMatchObject({ width: 76, height: 76, borderColor: tokens.color.white });
    expect(ring.width as number).toBeGreaterThanOrEqual(72);
    expect(tree.props.hitSlop).toBeUndefined();
    expect(disc(tree, false)).toMatchObject({ width: 60, backgroundColor: tokens.color.white, transform: [{ scale: 1 }] });
    expect((await shutter({ accessibilityLabel: "Record" })).props.accessibilityLabel).toBe("Record");
  });

  it("shrinks the disc while pressed, and not when disabled", async () => {
    expect(disc(await shutter(), true).transform).toEqual([{ scale: 0.9 }]);
    const disabled = await shutter({ disabled: true });
    expect(disabled.props.disabled).toBe(true);
    expect(disabled.props.className).toMatch(/opacity-50/);
    expect(disc(disabled, true).transform).toEqual([{ scale: 1 }]);
  });
});

describe("StackPageHeader", () => {
  async function header(props: Record<string, unknown> = {}) {
    const { StackPageHeader } = await import("../src/StackPageHeader");
    const draw = () =>
      hooks.render(() => StackPageHeader({ title: "Details", ...props } as Parameters<typeof StackPageHeader>[0]) as unknown as Element);
    return draw;
  }

  it("centres a PageTitle between a back HeaderIconButton and headerRight", async () => {
    const { PageTitle } = await import("../src/PageTitle");
    const { HeaderIconButton } = await import("../src/HeaderIconButton");
    const onBack = vi.fn();
    const right = { type: "ThemeToggle", props: {} };
    const tree = (await header({ onBack, backTestID: "back", headerRight: right, description: "Edited today", testID: "hdr" }))();
    expect(tree.props.testID).toBe("hdr");
    const [start, centre, end] = children(tree);
    const [back] = ofType(start, HeaderIconButton);
    expect(back!.props).toMatchObject({ label: "Back", testID: "back", onPress: onBack });
    expect(ofType(back, "IconChevronLeft")[0]!.props.color).toBe(tokens.color.foreground.light);
    const [title] = ofType(centre, PageTitle);
    expect(title!.props).toMatchObject({ children: "Details", className: "text-center" });
    const description = ofType(centre, "Text")[0]!;
    expect(description.props.children).toBe("Edited today");
    expect(flatten(description.props.style).color).toBe(tokens.color.muted.light);
    expect(all(end).some((element) => element === right)).toBe(true);
    // The sides grow equally, so the title stays centred.
    expect(start!.props.className).toMatch(/^flex-1 /);
    expect(end!.props.className).toMatch(/^flex-1 /);
    expect(centre!.props.className).toMatch(/shrink/);
  });

  it("has no back button without onBack, and names it with backLabel", async () => {
    const { HeaderIconButton } = await import("../src/HeaderIconButton");
    expect(ofType((await header())(), HeaderIconButton)).toHaveLength(0);
    const named = (await header({ onBack: () => {}, backLabel: "Close" }))();
    expect(ofType(named, HeaderIconButton)[0]!.props.label).toBe("Close");
  });

  it("pads the top safe-area inset by default, with a 56 row below it", async () => {
    expect(flatten((await header())().props.style)).toEqual({ paddingTop: 47, minHeight: 47 + PAGE_HEADER_HEIGHT });
    expect(flatten((await header({ safeTop: false }))().props.style)).toEqual({ paddingTop: 0, minHeight: PAGE_HEADER_HEIGHT });
    expect((await header())().props.style).not.toHaveProperty("backgroundColor");
  });

  it("gives both sides the width of the wider one", async () => {
    const draw = await header({ onBack: () => {}, headerRight: "actions" });
    const sides = (tree: Element) => [children(tree)[0]!, children(tree)[2]!].map((side) => flatten(side.props.style).minWidth);
    expect(sides(draw())).toEqual([48, 48]);
    const measured = children(children(draw())[2]!)[0]!;
    (measured.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { x: 0, y: 0, width: 104, height: 48 } } });
    expect(sides(draw())).toEqual([104, 104]);
    hooks.reset();
    larger.value = true;
    expect(sides((await header({ onBack: () => {} }))())).toEqual([56, 56]);
  });

  it("uses the safe-area hook, PageTitle, HeaderIconButton and the Tabler chevron (source contract)", () => {
    const source = read("StackPageHeader.tsx");
    expect(source).toMatch(/import \{ useSafeAreaInsets \} from "react-native-safe-area-context";/);
    expect(source).toMatch(/import \{ PageTitle \} from "\.\/PageTitle";/);
    expect(source).toMatch(/import \{ HeaderIconButton \} from "\.\/HeaderIconButton";/);
    expect(source).toMatch(/import \{ IconChevronLeft \} from "@tabler\/icons-react-native";/);
    expect(source).toMatch(/const insets = useSafeAreaInsets\(\);/);
  });
});

describe("0.5.0 package and gallery (source contract)", () => {
  it("leaves the lockfile entry for this package to its four dev dependencies", () => {
    const lock = readFileSync(join(root, "..", "..", "pnpm-lock.yaml"), "utf8");
    const block = lock.slice(lock.indexOf("\n  packages/native-ui:\n"), lock.indexOf("\n  packages/server:\n"));
    expect(block).toMatch(/^\n {2}packages\/native-ui:\n {4}devDependencies:\n/);
    expect(block).not.toMatch(/\n {4}(?:dependencies|peerDependencies|optionalDependencies):/);
    expect([...block.matchAll(/^ {6}('?[@\w/.-]+'?):$/gm)].map(([, name]) => name)).toEqual([
      "'@types/react'",
      "react",
      "typescript",
      "vitest",
    ]);
  });

  it("uses no NativeWind text colour class in the new components", () => {
    for (const file of [
      "ColorSwatches.tsx",
      "StatGrid.tsx",
      "SectionLabel.tsx",
      "SheetRow.tsx",
      "PageIndicator.tsx",
      "IconButton.tsx",
      "CaptureButton.tsx",
      "StackPageHeader.tsx",
    ]) {
      expect(read(file), file).not.toMatch(/["'\s]text-(?:muted-)?foreground(?=["'\s])|dark:/);
    }
  });

  it("shows each new piece in ParityGallery", () => {
    const gallery = read("examples/ParityGallery.tsx");
    for (const section of [
      "ColorSwatches",
      "DateTimeField",
      "ListRow",
      "SectionLabel and StatGrid",
      "SheetRow",
      "PageIndicator",
      "StackPageHeader",
      "Camera chrome",
    ]) {
      expect(gallery, section).toContain(`<Section title="${section}">`);
    }
    expect(gallery).toMatch(/mode="date"\s+value=\{due\}\s+onChange=\{setDue\}\s+placeholder="No due date"\s+onClear=\{\(\) => setDue\(null\)\}/);
    expect(gallery).toMatch(/control=\{<Switch /);
    expect(gallery).toMatch(/onLongPress=\{/);
    expect(gallery).toMatch(/titleEnd=\{/);
    expect(gallery).toMatch(/<Card title="Pressable"[^>]*onPress=\{/);
    expect(gallery).toMatch(/<AmbientBackground[^>]*>\s+<StackPageHeader/);
    expect(gallery).toMatch(/<IconButton variant="overlay"/);
    expect(gallery).toMatch(/<CaptureButton /);
    const tones = gallery.slice(gallery.indexOf("const STATUS_TONES"), gallery.indexOf("];", gallery.indexOf("const STATUS_TONES")));
    expect(tones).toContain('"info"');
  });
});

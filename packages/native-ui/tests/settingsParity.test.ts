import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MIN_TOUCH_TARGET, sizeStyle, type TextSize } from "../src/controlStyles";
import { tokens } from "../src/tokens";

// The settings parts against the web twins in `ui/app/src/settings/`. The web
// classes are read from the web source, turned into points (Tailwind `text-*`
// sizes and line heights, `leading-relaxed`, `font-medium` and
// `font-semibold`, the text tone), and compared with the styles the native
// parts draw. The native parts are called with React Native, NativeWind and
// the larger-text setting stubbed, and the element trees they return are read.

const larger = vi.hoisted(() => ({ value: false }));
vi.mock("react-native", () => ({ View: "View", Text: "Text" }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value }));
vi.mock("../src/cn", () => ({
  cn: (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" "),
}));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = (file: string) => readFileSync(join(root, "..", "ui", "app/src/settings", file), "utf8");

/** First capture group of `pattern` in `source`; fails the test when the web source no longer matches. */
function capture(source: string, pattern: RegExp): string {
  const found = source.match(pattern)?.[1];
  if (found === undefined) throw new Error(`web source no longer matches ${pattern}`);
  return found;
}

type Style = { [key: string]: string | number | undefined } | Style[] | null | undefined | false;
type Props = { className?: string; style?: Style; children?: ReactNode; accessibilityRole?: string };
type Type = { fontSize?: string | number; lineHeight?: string | number; fontWeight?: string | number; color?: string | number };

/** Every element in a tree, parents first. */
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

/** The `Text` element that draws `text`. */
function textOf(tree: ReactNode, text: string): ReactElement<Props> {
  const found = elements(tree).find((element) => element.type === "Text" && element.props.children === text);
  if (!found) throw new Error(`no Text draws "${text}"`);
  return found;
}

/** Size, line height, weight and colour a native `Text` draws. */
function nativeType(element: ReactElement<Props>): Type {
  const { fontSize, lineHeight, fontWeight, color } = flatten(element.props.style);
  return { fontSize, lineHeight, fontWeight, color };
}

const SIZES: TextSize[] = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl"];
const tokensOf = (classes: string) => classes.split(/\s+/).filter(Boolean);
const sizeOf = (classes: string) => SIZES.find((size) => tokensOf(classes).includes(size));

/** Tailwind `leading-relaxed`. */
const RELAXED = 1.625;
const WEIGHT: Record<string, string> = { "font-medium": "500", "font-semibold": "600" };
const TONE: Record<string, string> = {
  "text-foreground": tokens.color.foreground.light,
  "text-muted-foreground": tokens.color.muted.light,
};

/** The points a web class list draws: `text-*` size and line height, `leading-relaxed`, weight and tone. */
function webType(classes: string): Type {
  const size = sizeOf(classes);
  if (!size) throw new Error(`no text size in "${classes}"`);
  const list = tokensOf(classes);
  const { fontSize, lineHeight } = sizeStyle(size);
  return {
    fontSize,
    lineHeight: list.includes("leading-relaxed") ? fontSize * RELAXED : lineHeight,
    fontWeight: list.map((token) => WEIGHT[token]).find(Boolean),
    color: list.map((token) => TONE[token]).find(Boolean),
  };
}

/** The Instrument Sans face class for a web weight class list. */
function faceOf(classes: string) {
  const list = tokensOf(classes);
  if (list.includes("font-semibold")) return "font-instrument-sans-semibold";
  if (list.includes("font-medium")) return "font-instrument-sans-medium";
  return "font-instrument-sans";
}

/** Checks one native `Text` against one web class list: points, size class, face class and `leading-relaxed`. */
function expectParity(element: ReactElement<Props>, webClasses: string) {
  expect(nativeType(element)).toEqual(webType(webClasses));
  const native = tokensOf(element.props.className ?? "");
  expect(sizeOf(element.props.className ?? "")).toBe(sizeOf(webClasses));
  expect(native).toContain(faceOf(webClasses));
  expect(native.includes("leading-relaxed")).toBe(tokensOf(webClasses).includes("leading-relaxed"));
}

/** Padding, gap, margin and min-height classes; `p-0` is no padding. */
const spacing = (classes: string) =>
  tokensOf(classes)
    .filter((token) => /^(?:p[xytrbl]?|m[xytrbl]?|gap|min-h)-/.test(token) && token !== "p-0")
    .sort();

/** One Tailwind `text-*` step up. */
const stepUp = (size: TextSize | undefined) => (size ? SIZES[SIZES.indexOf(size) + 1] : undefined);

afterEach(() => {
  larger.value = false;
});

describe("SettingsSection (web SettingsSection.tsx)", () => {
  const source = web("SettingsSection.tsx");
  const webTitle = capture(source, /<h3 className="([^"]+)"/);
  const webDescription = capture(source, /<p className="([^"]+)"/);
  const body = createElement("Body");
  const footer = createElement("Footer");

  async function render(bodyVariant?: "form" | "list" | "compact") {
    const { SettingsSection } = await import("../src/settings/SettingsSection");
    return SettingsSection({ title: "General", description: "How the app looks", footer, children: body, bodyVariant });
  }

  it("the web title and description are the measured 14 / 20 / 600 and 14 / 22.75 / 400, muted", () => {
    expect(webType(webTitle)).toEqual({ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.color.foreground.light });
    expect(webType(webDescription)).toEqual({
      fontSize: 14,
      lineHeight: 22.75,
      fontWeight: undefined,
      color: tokens.color.muted.light,
    });
  });

  it("draws the title as the web h3: size, line height, weight, tone and face", async () => {
    const title = textOf(await render(), "General");
    expect(title.props.accessibilityRole).toBe("header");
    expectParity(title, webTitle);
  });

  it("draws the description as the web p, with its top margin", async () => {
    const description = textOf(await render(), "How the app looks");
    expectParity(description, webDescription);
    expect(spacing(description.props.className ?? "")).toEqual(spacing(webDescription));
  });

  it("uses the web section gap and header padding and gap", async () => {
    const tree = await render();
    const [section, header] = elements(tree);
    expect(spacing(section?.props.className ?? "")).toEqual(spacing(capture(source, /<section className=\{cn\("([^"]+)"/)));
    expect(spacing(header?.props.className ?? "")).toEqual(spacing(capture(source, /<header className="([^"]+)"/)));
  });

  const variants: ("form" | "list" | "compact")[] = ["form", "list", "compact"];
  it.each(variants)("pads the %s body as the web BODY_VARIANT_CLASS", async (variant) => {
    const webBody = capture(source, new RegExp(`\\n  ${variant}: "([^"]*)"`));
    const view = elements(await render(variant)).find((element) => element.props.children === body);
    expect(spacing(view?.props.className ?? "")).toEqual(spacing(webBody));
  });

  it("draws the web footer: padding, gap, end alignment and the secondary surface", async () => {
    const webFooter = capture(source, /const FOOTER_CLASS =\s*"([^"]+)"/);
    const view = elements(await render()).find((element) => element.props.children === footer);
    const classes = view?.props.className ?? "";
    expect(spacing(classes)).toEqual(spacing(webFooter));
    for (const token of ["items-center", "justify-end"]) expect(tokensOf(webFooter)).toContain(token);
    for (const token of ["items-center", "justify-end"]) expect(tokensOf(classes)).toContain(token);
    expect(tokensOf(webFooter)).toContain("bg-surface-secondary");
    expect(flatten(view?.props.style).backgroundColor).toBe(tokens.color.surfaceSecondary.light);
  });
});

describe("SettingsToggleRow (web SettingsToggleRow.tsx)", () => {
  const source = web("SettingsToggleRow.tsx");
  const webTitle = capture(source, /const titleClassName =\s*"([^"]+)"/);
  const webDescription = capture(source, /<p className="([^"]+)"/);
  const action = createElement("Switch");

  async function render() {
    const { SettingsToggleRow } = await import("../src/settings/SettingsToggleRow");
    return SettingsToggleRow({ title: "Sounds", description: "Play a sound on reply", action });
  }

  it("the web title and description are the measured 14 / 20 / 500 and 12 / 19.5, muted", () => {
    expect(webType(webTitle)).toEqual({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.color.foreground.light });
    expect(webType(webDescription)).toEqual({
      fontSize: 12,
      lineHeight: 19.5,
      fontWeight: undefined,
      color: tokens.color.muted.light,
    });
  });

  it("draws the title and description as the web classes", async () => {
    const tree = await render();
    expectParity(textOf(tree, "Sounds"), webTitle);
    const description = textOf(tree, "Play a sound on reply");
    expectParity(description, webDescription);
    expect(spacing(description.props.className ?? "")).toEqual(spacing(webDescription));
  });

  it("goes one text step up with larger text, with the same weight and leading", async () => {
    larger.value = true;
    const tree = await render();
    const title = textOf(tree, "Sounds");
    const description = textOf(tree, "Play a sound on reply");
    expect(sizeOf(title.props.className ?? "")).toBe(stepUp(sizeOf(webTitle)));
    expect(sizeOf(description.props.className ?? "")).toBe(stepUp(sizeOf(webDescription)));
    expect(nativeType(title).fontWeight).toBe("500");
    const { fontSize } = nativeType(description);
    expect(nativeType(description).lineHeight).toBe(Number(fontSize) * RELAXED);
  });

  it("uses the web row padding and gap, with no row min height", async () => {
    const [row] = elements(await render());
    expect(spacing(row?.props.className ?? "")).toEqual(spacing(capture(source, /className=\{cn\(\s*"([^"]+)"/)));
  });

  it("keeps a 44 touch target on the action column, above the web min-h-10", async () => {
    expect(capture(source, /<div className="([^"]*)">\{action\}/)).toMatch(/(?:^|\s)min-h-10(?:\s|$)/);
    const column = elements(await render()).find((element) => element.props.children === action);
    expect(flatten(column?.props.style).minHeight).toBe(MIN_TOUCH_TARGET);
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(44);
  });
});

describe("SettingsField (web stacked SettingsField.tsx)", () => {
  const source = web("SettingsField.tsx");
  const stacked = source.slice(source.lastIndexOf("return ("));
  const webLabel = capture(stacked, /<label\s+htmlFor=\{htmlFor\}\s+className="([^"]+)"/);
  const webDescription = capture(stacked, /<p className="([^"]+)"/);

  it("draws the label and help text as the web stacked field", async () => {
    const { SettingsField } = await import("../src/settings/SettingsField");
    const tree = SettingsField({ label: "Name", description: "Shown to others", children: createElement("Input") });
    const label = textOf(tree, "Name");
    const description = textOf(tree, "Shown to others");
    expectParity(label, webLabel);
    expectParity(description, webDescription);
    expect(spacing(label.props.className ?? "")).toEqual(spacing(webLabel));
    expect(spacing(description.props.className ?? "")).toEqual(spacing(webDescription));
  });
});

describe("SettingsEmptyState (web SettingsEmptyState.tsx)", () => {
  const source = web("SettingsEmptyState.tsx");
  const action = createElement("Button");

  async function render() {
    const { SettingsEmptyState } = await import("../src/settings/SettingsEmptyState");
    return SettingsEmptyState({ title: "No keys", description: "Add one", icon: () => null, action });
  }

  it("draws the title and description as the web h4 and p", async () => {
    const tree = await render();
    const webDescription = capture(source, /<p className="([^"]+)"/);
    expectParity(textOf(tree, "No keys"), capture(source, /<h4 className="([^"]+)"/));
    const description = textOf(tree, "Add one");
    expectParity(description, webDescription);
    expect(spacing(description.props.className ?? "")).toEqual(spacing(webDescription));
  });

  it("uses the web padding, icon size and spacing, and action margin", async () => {
    const all = elements(await render());
    expect(spacing(all[0]?.props.className ?? "")).toEqual(spacing(capture(source, /<div className="(flex flex-col[^"]+)"/)));
    const iconClass = capture(source, /const ICON_CLASS = "([^"]+)"/);
    const icon = all.find((element) => typeof element.type === "function");
    expect(icon?.props).toMatchObject({ size: Number(capture(source, /<Icon size=\{(\d+)\}/)) });
    const iconWrap = all.find((element) => element.props.children === icon);
    expect(spacing(iconWrap?.props.className ?? "")).toEqual(spacing(iconClass));
    expect(tokensOf(iconClass)).toContain("opacity-50");
    expect(tokensOf(iconWrap?.props.className ?? "")).toContain("opacity-50");
    const actionWrap = all.find((element) => element.props.children === action);
    expect(spacing(actionWrap?.props.className ?? "")).toEqual(spacing(capture(source, /<div className="([^"]+)">\{action\}/)));
  });
});

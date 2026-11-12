import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_TOUCH_TARGET } from "../src/controlStyles";
import { palette, withAlpha } from "../src/palette";
import { tokens } from "../src/tokens";

// Quoted replies (0.13.0): `MessageActionSheet`, `ReplyQuoteChip`, `MessageQuote`,
// the new `Message`, `MessageContent` and `PromptInput` props. Same harness as
// `ai.test.ts`, which describes it.
// The AI chat parts (`@vvedantb/native-ui/ai`). There is no React renderer in
// this package, so a small hook harness stands in for one: `mount` calls a
// render function with `useState`, `useRef`, `useEffect` and `useContext`
// stubbed, keeps their state between calls, renders again when state changes
// (also from a timer or a press), and runs effects after each render. React
// Native, Reanimated, the safe-area hook and the icons are stubbed, and the
// checks read the element trees the parts return. Source checks at the end.

type Effect = { deps?: unknown[]; cleanup?: void | (() => void) };

const hooks = vi.hoisted(() => {
  const state = {
    slots: [] as unknown[],
    effects: [] as Effect[],
    pending: [] as Array<() => void>,
    cursor: 0,
    effectCursor: 0,
    dirty: false,
    running: false,
    contexts: new Map<unknown, unknown>(),
    render: (() => null) as () => unknown,
    tree: undefined as unknown,
  };

  const changed = (prev?: unknown[], next?: unknown[]) =>
    !prev || !next || prev.length !== next.length || prev.some((value, i) => !Object.is(value, next[i]));

  function run() {
    state.running = true;
    let passes = 0;
    try {
      do {
        if (++passes > 50) throw new Error("render loop");
        state.dirty = false;
        state.cursor = 0;
        state.effectCursor = 0;
        state.pending = [];
        state.tree = state.render();
        // A state update during render renders again before any effect, as React does.
        if (state.dirty) continue;
        for (const effect of state.pending) effect();
      } while (state.dirty);
    } finally {
      state.running = false;
    }
  }

  function useState<T>(initial: T | (() => T)) {
    const i = state.cursor++;
    if (!(i in state.slots)) state.slots[i] = typeof initial === "function" ? (initial as () => T)() : initial;
    const set = (next: T | ((prev: T) => T)) => {
      const value = typeof next === "function" ? (next as (prev: T) => T)(state.slots[i] as T) : next;
      if (Object.is(value, state.slots[i])) return;
      state.slots[i] = value;
      state.dirty = true;
      if (!state.running) run();
    };
    return [state.slots[i] as T, set] as const;
  }

  function useRef<T>(initial: T) {
    const i = state.cursor++;
    if (!(i in state.slots)) state.slots[i] = { current: initial };
    return state.slots[i] as { current: T };
  }

  function useEffect(effect: () => void | (() => void), deps?: unknown[]) {
    const i = state.effectCursor++;
    const prev = state.effects[i];
    if (prev && !changed(prev.deps, deps)) return;
    state.pending.push(() => {
      if (typeof prev?.cleanup === "function") prev.cleanup();
      state.effects[i] = { deps, cleanup: effect() };
    });
  }

  function useContext(context: { _currentValue: unknown }) {
    return state.contexts.has(context) ? state.contexts.get(context) : context._currentValue;
  }

  function mount<T>(render: () => T) {
    state.slots = [];
    state.effects = [];
    state.render = render;
    run();
    return {
      get tree() {
        return state.tree as T;
      },
      rerender() {
        run();
      },
      unmount() {
        for (const effect of state.effects) if (typeof effect?.cleanup === "function") effect.cleanup();
        state.effects = [];
      },
    };
  }

  return { state, mount, useState, useRef, useEffect, useContext };
});

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: hooks.useState,
  useRef: hooks.useRef,
  useEffect: hooks.useEffect,
  useContext: hooks.useContext,
  useCallback: <T>(callback: T) => callback,
  useMemo: <T>(factory: () => T) => factory(),
}));

const scheme = vi.hoisted(() => ({ colorScheme: "light" as "light" | "dark" }));
const larger = vi.hoisted(() => ({ value: false }));
const reduceMotion = vi.hoisted(() => ({ value: false }));
const insets = vi.hoisted(() => ({ top: 47, bottom: 34, left: 0, right: 0 }));
const haptic = vi.hoisted(() => vi.fn());
const openURL = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const animation = vi.hoisted(() => ({
  withTiming: vi.fn((to: number, config?: { duration?: number }) => ({ to, config })),
  withRepeat: vi.fn((inner: unknown, count?: number, reverse?: boolean) => ({ inner, count, reverse })),
  cancelAnimation: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default },
  StyleSheet: { create: <T>(styles: T) => styles, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 },
  AccessibilityInfo: {},
  Linking: { openURL },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Image: "Image",
  Modal: "Modal",
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "Animated.View" },
  FadeIn: { duration: (ms: number) => ({ easing: () => `FadeIn(${ms})` }) },
  FadeOut: { duration: (ms: number) => ({ easing: () => `FadeOut(${ms})` }) },
  Easing: { bezier: () => "ease-out" },
  ReduceMotion: { System: "system" },
  cubicBezier: () => "cubic-bezier",
  useSharedValue: <T>(initial: T) => {
    const shared = { value: initial, get: () => shared.value, set: (next: T) => void (shared.value = next) };
    return shared;
  },
  useAnimatedStyle: <T>(updater: () => T) => updater(),
  ...animation,
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => insets }));
vi.mock("nativewind", () => ({ useColorScheme: () => scheme }));
vi.mock("@tabler/icons-react-native", () =>
  Object.fromEntries(
    [
      "IconAlertTriangle",
      "IconArrowBackUp",
      "IconArrowBackUp",
      "IconArrowDown",
      "IconArrowUp",
      "IconBook",
      "IconBrain",
      "IconCheck",
      "IconChevronDown",
      "IconChevronRight",
      "IconCopy",
      "IconFile",
      "IconFileText",
      "IconMusic",
      "IconPaperclip",
      "IconPhoto",
      "IconPlayerStopFilled",
      "IconPointFilled",
      "IconRefresh",
      "IconThumbDown",
      "IconThumbUp",
      "IconVideo",
      "IconWorld",
      "IconX",
    ].map((name) => [name, name]),
  ),
);
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value }));
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => reduceMotion.value }));
vi.mock("../src/Button", () => ({ Button: "Button" }));
vi.mock("../src/haptics", () => ({ selectionHaptic: haptic }));
vi.mock("../src/Spinner", () => ({ Spinner: "Spinner" }));
vi.mock("../src/primitives/input", () => ({ Input: "FieldInput" }));
vi.mock("../src/primitives/native-only-animated-view", () => ({ NativeOnlyAnimatedView: "NativeOnlyAnimatedView" }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, "src", file), "utf8");
const readWeb = (file: string) => readFileSync(join(root, "..", "ui", "src", file), "utf8");
const aiFiles = readdirSync(join(root, "src", "ai")).filter((file) => /\.tsx?$/.test(file));
/** Source without comments. */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}

const find = (node: unknown, test: (element: Element) => boolean) => elements(node).find(test);
const byType = (node: unknown, type: unknown) => elements(node).filter((element) => element.type === type);
const byLabel = (node: unknown, label: string) =>
  find(node, (element) => element.props.accessibilityLabel === label || element.props.label === label);

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : ((style as Record<string, unknown>) ?? {});

/** Calls a function component element, as React would. */
const render = (element: Element) => (element.type as (props: unknown) => unknown)(element.props);

/** Makes `value` what `useContext` returns for the context a provider element names. */
const provide = (provider: Element) => hooks.state.contexts.set(provider.type, provider.props.value);

beforeEach(() => {
  hooks.state.contexts.clear();
});

afterEach(() => {
  vi.useRealTimers();
  scheme.colorScheme = "light";
  larger.value = false;
  reduceMotion.value = false;
  openURL.mockClear();
  haptic.mockClear();
  animation.withTiming.mockClear();
  animation.withRepeat.mockClear();
  animation.cancelAnimation.mockClear();
});

const press = (element: Element | undefined, name: string) => (element!.props[name] as (...args: unknown[]) => void)();

describe("MessageActionSheet", () => {
  async function sheet(props: Record<string, unknown> = {}) {
    const { MessageActionSheet } = await import("../src/ai/message-action-sheet");
    const onClose = vi.fn();
    const reply = vi.fn();
    const copy = vi.fn();
    const remove = vi.fn();
    const actions = [
      { key: "reply", label: "Reply", icon: "IconArrowBackUp", onPress: reply },
      { key: "copy", label: "Copy", icon: "IconCopy", onPress: copy },
      { key: "delete", label: "Delete", destructive: true, onPress: remove },
    ];
    const h = hooks.mount(
      () => MessageActionSheet({ open: true, onClose, actions, ...props } as never) as unknown as Element,
    );
    return { h, onClose, reply, copy, remove };
  }
  const row = (tree: Element, key: string) => find(tree, (el) => el.props.testID === `message-action-sheet-action-${key}`);

  it("is a transparent Modal that closes on Android back and fades, or not with Reduce Motion", async () => {
    const { h, onClose } = await sheet();
    expect(h.tree.type).toBe("Modal");
    expect(h.tree.props).toMatchObject({ visible: true, transparent: true, animationType: "fade" });
    press(h.tree, "onRequestClose");
    expect(onClose).toHaveBeenCalledTimes(1);
    reduceMotion.value = true;
    expect((await sheet()).h.tree.props.animationType).toBe("none");
  });

  it("lists the actions in order, Reply first, each a labelled button", async () => {
    const { h } = await sheet();
    const rows = elements(h.tree).filter((el) => String(el.props.testID ?? "").startsWith("message-action-sheet-action-"));
    expect(rows.map((el) => el.props.accessibilityLabel)).toEqual(["Reply", "Copy", "Delete"]);
    for (const el of rows) expect(el.props.accessibilityRole).toBe("button");
    expect(byLabel(h.tree, "Cancel")!.props.accessibilityRole).toBe("button");
    expect(byLabel(h.tree, "Message actions")).toBeDefined();
  });

  it("draws icons when given, in the foreground, and destructive rows in the danger colour", async () => {
    const { h } = await sheet();
    expect(byType(row(h.tree, "reply"), "IconArrowBackUp")[0]!.props.color).toBe(tokens.color.foreground.light);
    expect(byType(row(h.tree, "delete"), "IconArrowBackUp")).toHaveLength(0);
    const text = byType(row(h.tree, "delete"), "Text")[0]!;
    expect(flatten(text.props.style).color).toBe(palette.danger.light);
    scheme.colorScheme = "dark";
    const dark = await sheet();
    expect(flatten(byType(row("delete" && dark.h.tree, "delete"), "Text")[0]!.props.style).color).toBe(palette.danger.dark);
  });

  it("closes, then runs the action, on a press", async () => {
    const order: string[] = [];
    const { h, onClose, reply } = await sheet();
    onClose.mockImplementation(() => order.push("close"));
    reply.mockImplementation(() => order.push("reply"));
    press(row(h.tree, "reply"), "onPress");
    expect(order).toEqual(["close", "reply"]);
  });

  it("closes on the backdrop and on Cancel without running an action", async () => {
    const { h, onClose, reply, copy, remove } = await sheet();
    press(find(h.tree, (el) => el.props.testID === "message-action-sheet-backdrop"), "onPress");
    press(find(h.tree, (el) => el.props.testID === "message-action-sheet-cancel"), "onPress");
    expect(onClose).toHaveBeenCalledTimes(2);
    for (const fn of [reply, copy, remove]) expect(fn).not.toHaveBeenCalled();
  });

  it("takes title, cancelLabel and testID", async () => {
    const { h } = await sheet({ title: "Reply or copy", cancelLabel: "Close menu", testID: "sheet" });
    expect(byLabel(h.tree, "Reply or copy")!.props.testID).toBe("sheet");
    expect(byLabel(h.tree, "Close menu")!.props.testID).toBe("sheet-cancel");
    expect(find(h.tree, (el) => el.props.testID === "sheet-action-copy")).toBeDefined();
  });

  it("fires the selection haptic once when it opens, and not while closed", async () => {
    const { MessageActionSheet } = await import("../src/ai/message-action-sheet");
    let open = false;
    const h = hooks.mount(() => MessageActionSheet({ open, onClose: () => {}, actions: [] }) as unknown as Element);
    expect(haptic).not.toHaveBeenCalled();
    open = true;
    h.rerender();
    expect(haptic).toHaveBeenCalledTimes(1);
    h.rerender();
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it("pads the bottom safe-area inset and gives rows a 48 minimum, 56 with larger text", async () => {
    const { h } = await sheet();
    const panel = find(h.tree, (el) => el.props.testID === "message-action-sheet")!;
    expect(flatten(panel.props.style).paddingBottom).toBe(34 + 8);
    expect(flatten(row(h.tree, "copy")!.props.style).minHeight).toBe(MIN_TOUCH_TARGET + 4);
    larger.value = true;
    expect(flatten(row((await sheet()).h.tree, "copy")!.props.style).minHeight).toBe(56);
  });
});

describe("ReplyQuoteChip", () => {
  async function chip(props: Record<string, unknown> = {}) {
    const { ReplyQuoteChip } = await import("../src/ai/reply-quote-chip");
    const onDismiss = vi.fn();
    const tree = ReplyQuoteChip({ author: "Ada", text: "Ship it on Friday", onDismiss, ...props } as never) as unknown as Element;
    return { tree, onDismiss };
  }

  it("shows the author on one line and the text on up to two", async () => {
    const { tree } = await chip();
    const [author, text] = byType(tree, "Text");
    expect(author!.props).toMatchObject({ children: "Ada", numberOfLines: 1 });
    expect(text!.props).toMatchObject({ children: "Ship it on Friday", numberOfLines: 2 });
  });

  it("is named Replying to {author}, with the text as the hint", async () => {
    const { tree } = await chip();
    expect(tree.props).toMatchObject({ accessible: true, accessibilityLabel: "Replying to Ada", accessibilityHint: "Ship it on Friday" });
    expect((await chip({ accessibilityLabel: "Reply target" })).tree.props.accessibilityLabel).toBe("Reply target");
  });

  it("has an X button, 44 square, labelled Dismiss reply quote, that calls onDismiss", async () => {
    const { tree, onDismiss } = await chip({ testID: "chip" });
    const x = byLabel(tree, "Dismiss reply quote")!;
    expect(x.props).toMatchObject({ accessibilityRole: "button", testID: "chip-dismiss" });
    expect(flatten(x.props.style)).toMatchObject({ width: 44, height: 44 });
    expect(byType(x, "IconX")).toHaveLength(1);
    press(x, "onPress");
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(byLabel((await chip({ dismissLabel: "Remove quote" })).tree, "Remove quote")).toBeDefined();
  });

  it("uses the field surface and a primary accent bar, per scheme", async () => {
    for (const colorScheme of ["light", "dark"] as const) {
      scheme.colorScheme = colorScheme;
      const { tree } = await chip();
      expect(flatten(tree.props.style)).toMatchObject({ backgroundColor: tokens.color.surfaceSecondary[colorScheme], borderRadius: tokens.radius.field });
      const bar = elements(tree).find((el) => flatten(el.props.style).width === 3)!;
      expect(flatten(bar.props.style).backgroundColor).toBe(palette.primary[colorScheme]);
    }
  });

  it("steps text and icon up with larger text, and merges className and testID", async () => {
    larger.value = true;
    const { tree } = await chip({ className: "mx-2", testID: "c" });
    expect(tree.props.className).toContain("mx-2");
    expect(tree.props.testID).toBe("c");
    expect(byType(tree, "IconX")[0]!.props.size).toBe(20);
    expect(byType(tree, "Text")[1]!.props.className).toContain("text-lg");
  });
});

describe("MessageQuote", () => {
  async function quote(props: Record<string, unknown> = {}) {
    const { MessageQuote } = await import("../src/ai/message-quote");
    const onPress = vi.fn();
    return { onPress, render: (extra: Record<string, unknown> = {}) => MessageQuote({ author: "Ada", text: "Ship it on Friday", ...props, ...extra } as never) as unknown as Element };
  }

  it("without onPress is a labelled View, not a button", async () => {
    const tree = (await quote()).render({ testID: "q" });
    expect(tree.type).toBe("View");
    expect(tree.props).toMatchObject({ testID: "q", accessible: true, accessibilityLabel: "Quoted message from Ada: Ship it on Friday" });
    expect(tree.props.accessibilityRole).toBeUndefined();
  });

  it("with onPress is a button, 44 high, that calls it", async () => {
    const { onPress, render } = await quote();
    const tree = render({ onPress });
    expect(tree.type).toBe("Pressable");
    expect(tree.props).toMatchObject({ accessibilityRole: "button", accessibilityLabel: "Go to quoted message from Ada" });
    expect(tree.props.className).toContain("min-h-11");
    press(tree, "onPress");
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(render({ onPress, accessibilityLabel: "Jump" }).props.accessibilityLabel).toBe("Jump");
  });

  it("shows the author on one line, the text on two, with a left border", async () => {
    const tree = (await quote()).render();
    const [author, text] = byType(tree, "Text");
    expect(author!.props).toMatchObject({ children: "Ada", numberOfLines: 1 });
    expect(text!.props).toMatchObject({ children: "Ship it on Friday", numberOfLines: 2 });
    expect(flatten(tree.props.style).borderLeftWidth).toBe(3);
  });

  it("takes the colour of the enclosing bubble, else the foreground", async () => {
    const { render } = await quote();
    expect(flatten(byType(render(), "Text")[1]!.props.style).color).toBe(withAlpha(tokens.color.foreground.light, 0.9));
    hooks.state.contexts.clear();
    const { ChatTextColorContext } = await import("../src/ai/response-text");
    hooks.state.contexts.set(ChatTextColorContext, "#ffffff");
    const tree = render();
    expect(flatten(byType(tree, "Text")[1]!.props.style).color).toBe(withAlpha("#ffffff", 0.9));
    expect(flatten(tree.props.style).borderLeftColor).toBe(withAlpha("#ffffff", 0.45));
  });
});

describe("Message: long press, actions and highlight", () => {
  async function message(props: Record<string, unknown> = {}) {
    const { Message } = await import("../src/ai/message");
    return hooks.mount(() => Message({ from: "user", children: "child", ...props } as never) as unknown as Element);
  }
  const provider = (tree: Element) => tree.props.children as Element;
  /** The highlight is its own component: find its element and render it. */
  const highlight = (tree: Element) => {
    const element = find(tree, (el) => (el.type as { name?: string }).name === "MessageHighlight");
    if (!element) return undefined;
    return hooks.mount(() => render(element) as unknown as Element).tree;
  };

  it("stays a plain View with no long-press props, as before", async () => {
    const h = await message({ className: "x", style: { margin: 1 }, testID: "m" });
    const view = provider(h.tree);
    expect(view.type).toBe("View");
    expect(view.props).toMatchObject({ testID: "m" });
    expect(view.props.className).toBe("w-full max-w-[95%] gap-2 x");
    expect(flatten(view.props.style)).toMatchObject({ alignSelf: "flex-end", margin: 1 });
    expect(find(h.tree, (el) => el.type === "Modal")).toBeUndefined();
    expect(highlight(h.tree)).toBeUndefined();
  });

  it("with onLongPress only becomes a Pressable that calls it and opens no sheet", async () => {
    const onLongPress = vi.fn();
    const h = await message({ onLongPress, className: "x", testID: "m" });
    const pressable = find(h.tree, (el) => el.type === "Pressable")!;
    expect(pressable.props).toMatchObject({ accessible: false, testID: "m" });
    expect(pressable.props.className).toContain("w-full max-w-[95%] gap-2 x");
    expect(flatten(pressable.props.style)).toMatchObject({ alignSelf: "flex-end", alignItems: "flex-end" });
    press(pressable, "onLongPress");
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(byType(h.tree, "Modal")).toHaveLength(0);
  });

  it("with actions opens the sheet on a long press, and the sheet closes again", async () => {
    const onPress = vi.fn();
    const onLongPress = vi.fn();
    const h = await message({ actions: [{ key: "reply", label: "Reply", onPress }], onLongPress, actionSheetTitle: "Reply to Ada" });
    const sheetOf = () => find(h.tree, (el) => el.type !== undefined && el.props.actions !== undefined)!;
    expect(sheetOf().props).toMatchObject({ open: false, title: "Reply to Ada" });
    press(find(h.tree, (el) => el.type === "Pressable"), "onLongPress");
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(sheetOf().props.open).toBe(true);
    press(sheetOf(), "onClose");
    expect(sheetOf().props.open).toBe(false);
  });

  it("offers the long press to TalkBack as the longpress action, which opens the same sheet", async () => {
    const onLongPress = vi.fn();
    const h = await message({ actions: [{ key: "reply", label: "Reply", onPress: vi.fn() }], onLongPress, actionSheetTitle: "Reply to Ada" });
    const pressable = () => find(h.tree, (el) => el.type === "Pressable")!;
    expect(pressable().props.accessibilityActions).toEqual([{ name: "longpress", label: "Reply to Ada" }]);
    const act = pressable().props.onAccessibilityAction as (event: { nativeEvent: { actionName: string } }) => void;
    act({ nativeEvent: { actionName: "activate" } });
    expect(onLongPress).not.toHaveBeenCalled();
    act({ nativeEvent: { actionName: "longpress" } });
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(find(h.tree, (el) => el.type !== undefined && el.props.actions !== undefined)!.props.open).toBe(true);
    const plain = await message({ onLongPress: vi.fn() });
    expect(find(plain.tree, (el) => el.type === "Pressable")!.props.accessibilityActions).toEqual([{ name: "longpress", label: "Message actions" }]);
  });

  it("keeps a Message with an empty actions list a plain View", async () => {
    const h = await message({ actions: [] });
    expect(provider(h.tree).type).toBe("View");
  });

  it("draws the highlight only while highlighted: a primary wash, a ring and no touches", async () => {
    for (const colorScheme of ["light", "dark"] as const) {
      scheme.colorScheme = colorScheme;
      const h = await message({ highlighted: true });
      const wash = highlight(h.tree)!;
      expect(wash.type).toBe("Animated.View");
      expect(wash.props.pointerEvents).toBe("none");
      expect(flatten(wash.props.style)).toMatchObject({
        backgroundColor: withAlpha(palette.primary[colorScheme], 0.18),
        borderColor: withAlpha(palette.primary[colorScheme], 0.5),
        borderWidth: 1.5,
      });
    }
    expect(highlight((await message({ highlighted: false })).tree)).toBeUndefined();
  });

  it("fades the wash from full to 0 over 1.4 seconds, or holds it still with Reduce Motion", async () => {
    const { MESSAGE_HIGHLIGHT_MS } = await import("../src/ai/message");
    expect(MESSAGE_HIGHLIGHT_MS).toBe(1400);
    highlight((await message({ highlighted: true })).tree);
    expect(animation.withTiming).toHaveBeenCalledWith(0, { duration: 1400 });
    animation.withTiming.mockClear();
    reduceMotion.value = true;
    const wash = highlight((await message({ highlighted: true })).tree)!;
    expect(animation.withTiming).not.toHaveBeenCalled();
    expect(flatten(wash.props.style).opacity).toBe(0.5);
  });

  it("highlights a long-pressable message too", async () => {
    const h = await message({ onLongPress: () => {}, highlighted: true });
    expect(highlight(h.tree)).toBeDefined();
  });
});

describe("MessageContent quote and the reply preset", () => {
  it("draws quote above the text, inside the bubble, and leaves the old shape without it", async () => {
    const { MessageContent } = await import("../src/ai/message");
    const quote = { type: "Quote", props: {} };
    const withQuote = MessageContent({ children: "Hi", quote } as never) as unknown as Element;
    const bubble = withQuote.props.children as Element;
    const parts = ([bubble.props.children].flat() as Element[]).flatMap((part) => [(part.props.children as Element[] | undefined) ?? part].flat());
    expect(parts[0]).toBe(quote);
    expect(elements(bubble).some((el) => el.props.children === "Hi")).toBe(true);
    const plain = (MessageContent({ children: "Hi" } as never) as unknown as Element).props.children as Element;
    expect((plain.props.children as Element).props.children).toBe("Hi");
  });

  it("adds a Reply preset first and keeps the other kinds", async () => {
    const { MESSAGE_ACTIONS, MessageAction } = await import("../src/ai/message");
    expect(Object.keys(MESSAGE_ACTIONS)).toEqual(["reply", "copy", "retry", "like", "dislike"]);
    expect(MESSAGE_ACTIONS.reply).toEqual({ icon: "IconArrowBackUp", label: "Reply" });
    const onPress = vi.fn();
    expect((MessageAction({ kind: "reply", onPress }) as unknown as Element).props).toMatchObject({ icon: "IconArrowBackUp", label: "Reply" });
  });
});

describe("PromptInput replyTo", () => {
  async function input(props: Record<string, unknown> = {}) {
    const { PromptInput } = await import("../src/ai/prompt-input");
    return PromptInput({ onSubmit: () => {}, ...props } as never) as unknown as Element;
  }
  const reply = { type: "Reply", props: {} };
  const header = { type: "Header", props: {} };
  const order = (tree: Element) => elements(tree).map((el) => el.type).filter((type) => type === "Reply" || type === "Header");

  for (const layout of ["stacked", "inline"] as const) {
    it(`draws replyTo above header in the ${layout} layout`, async () => {
      expect(order(await input({ layout, replyTo: reply, header }))).toEqual(["Reply", "Header"]);
    });
    it(`draws nothing extra without replyTo in the ${layout} layout, and header still works`, async () => {
      const tree = await input({ layout, header });
      expect(order(tree)).toEqual(["Header"]);
      expect(byType(tree, "Reply")).toHaveLength(0);
    });
  }

  it("takes a ReplyQuoteChip as the header as well", async () => {
    expect(order(await input({ header: reply }))).toEqual(["Reply"]);
  });

  // 0.12.1 auto-grow must still work when the 0.13.0 `replyTo` slot is set.
  it("keeps auto-grow with replyTo in both layouts", async () => {
    const { PromptInput } = await import("../src/ai/prompt-input");
    const size = (height: number) => ({ nativeEvent: { contentSize: { width: 300, height } } });
    for (const layout of ["stacked", "inline"] as const) {
      const h = hooks.mount(
        () => PromptInput({ onSubmit: () => {}, layout, replyTo: reply } as never) as unknown as Element,
      );
      expect(order(h.tree)).toEqual(["Reply"]);
      const field = () => byType(h.tree, "FieldInput")[0]!;
      expect(field().props.numberOfLines, layout).toBeUndefined();
      (field().props.onContentSizeChange as (e: unknown) => void)(size(72));
      expect(flatten(field().props.style), layout).toMatchObject({ height: 72, maxHeight: 160 });
      expect(field().props.scrollEnabled, layout).toBe(false);
      (field().props.onContentSizeChange as (e: unknown) => void)(size(400));
      expect(flatten(field().props.style), layout).toMatchObject({ height: 160, maxHeight: 160 });
      expect(field().props.scrollEnabled, layout).toBe(true);
    }
  });
});

describe("quoted replies (source contract)", () => {
  it("exports the new parts and types from the ai entry", () => {
    const index = read("ai/index.ts");
    expect(index).toMatch(/MessageActionSheet[\s\S]*MessageActionSheetProps, MessageSheetAction/);
    expect(index).toMatch(/ReplyQuoteChip[\s\S]*ReplyQuoteChipProps/);
    expect(index).toMatch(/MessageQuote[\s\S]*MessageQuoteProps/);
    expect(index).toMatch(/MESSAGE_HIGHLIGHT_MS/);
  });

  it("uses selectionHaptic and adds no dependency", () => {
    expect(read("ai/message-action-sheet.tsx")).toMatch(/selectionHaptic\(\)/);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.dependencies ?? {}).not.toHaveProperty("expo-haptics");
    expect(pkg.peerDependenciesMeta["expo-haptics"]).toEqual({ optional: true });
  });

  it("avoids the Hermes-missing array methods and the bottom-sheet peer", () => {
    for (const file of ["message-action-sheet.tsx", "reply-quote-chip.tsx", "message-quote.tsx", "message.tsx"]) {
      const source = code(read(`ai/${file}`));
      expect(source, file).not.toMatch(/\.(?:findLast|findLastIndex|toSorted|toReversed|toSpliced|with)\(/);
      expect(source, file).not.toMatch(/@gorhom\/bottom-sheet/);
    }
  });
});

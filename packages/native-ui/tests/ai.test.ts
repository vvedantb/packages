import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_TOUCH_TARGET, buttonColors, touchSlop } from "../src/controlStyles";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

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
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "Animated.View" },
  FadeIn: { duration: (ms: number) => `FadeIn(${ms})` },
  FadeOut: { duration: (ms: number) => `FadeOut(${ms})` },
  useSharedValue: <T>(value: T) => ({ value }),
  useAnimatedStyle: <T>(updater: () => T) => updater(),
  ...animation,
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => insets }));
vi.mock("nativewind", () => ({ useColorScheme: () => scheme }));
vi.mock("@tabler/icons-react-native", () =>
  Object.fromEntries(
    [
      "IconAlertTriangle",
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
  animation.withTiming.mockClear();
  animation.withRepeat.mockClear();
  animation.cancelAnimation.mockClear();
});

describe("formatElapsed and the reasoning message", () => {
  it("formats seconds as 12s, 1m and 1m 5s", async () => {
    const { formatElapsed } = await import("../src/ai/chat-text");
    expect(formatElapsed(0)).toBe("0s");
    expect(formatElapsed(12)).toBe("12s");
    expect(formatElapsed(59.6)).toBe("1m");
    expect(formatElapsed(60)).toBe("1m");
    expect(formatElapsed(65)).toBe("1m 5s");
    expect(formatElapsed(-3)).toBe("0s");
  });

  it("says Thinking… while streaming, then Thought for 12s, or a few seconds with no duration", async () => {
    const { reasoningMessage } = await import("../src/ai/reasoning");
    expect(reasoningMessage(true)).toBe("Thinking…");
    expect(reasoningMessage(true, 12)).toBe("Thinking…");
    expect(reasoningMessage(false)).toBe("Thought for a few seconds");
    expect(reasoningMessage(false, 12)).toBe("Thought for 12s");
    expect(reasoningMessage(false, 65)).toBe("Thought for 1m 5s");
  });

  it("steps body, small and caption text up with larger text", async () => {
    const { chatTextSize } = await import("../src/ai/chat-text");
    expect([chatTextSize("body", false), chatTextSize("small", false), chatTextSize("caption", false)]).toEqual([
      "text-base",
      "text-sm",
      "text-xs",
    ]);
    expect([chatTextSize("body", true), chatTextSize("small", true), chatTextSize("caption", true)]).toEqual([
      "text-xl",
      "text-lg",
      "text-base",
    ]);
  });
});

describe("useStreamingDisclosure", () => {
  it("is the web hook: same delay and the same open and close rules", () => {
    const web = readWeb("ai-elements/use-streaming-disclosure.ts");
    const native = read("ai/use-streaming-disclosure.ts");
    expect(web).toMatch(/const AUTO_CLOSE_DELAY_MS = 1000;/);
    expect(native).toMatch(/const AUTO_CLOSE_DELAY_MS = 1000;/);
  });

  it("opens when streaming starts and closes once, a second after it stops", async () => {
    vi.useFakeTimers();
    const { useStreamingDisclosure } = await import("../src/ai/use-streaming-disclosure");
    let streaming = false;
    const h = hooks.mount(() => useStreamingDisclosure(streaming));
    expect(h.tree.open).toBe(false);
    streaming = true;
    h.rerender();
    expect(h.tree.open).toBe(true);
    streaming = false;
    h.rerender();
    expect(h.tree.open).toBe(true);
    vi.advanceTimersByTime(999);
    expect(h.tree.open).toBe(true);
    vi.advanceTimersByTime(1);
    expect(h.tree.open).toBe(false);
    // Once: nothing reopens or closes it later.
    vi.advanceTimersByTime(5000);
    expect(h.tree.open).toBe(false);
  });

  it("starts open when mounted mid-stream, and closed otherwise", async () => {
    const { useStreamingDisclosure } = await import("../src/ai/use-streaming-disclosure");
    expect(hooks.mount(() => useStreamingDisclosure(true)).tree.open).toBe(true);
    expect(hooks.mount(() => useStreamingDisclosure(false)).tree.open).toBe(false);
  });

  it("lets a reader's toggle cancel the pending close", async () => {
    vi.useFakeTimers();
    const { useStreamingDisclosure } = await import("../src/ai/use-streaming-disclosure");
    let streaming = true;
    const h = hooks.mount(() => useStreamingDisclosure(streaming));
    streaming = false;
    h.rerender();
    h.tree.onOpenChange(true);
    vi.advanceTimersByTime(2000);
    expect(h.tree.open).toBe(true);
    h.tree.onOpenChange(false);
    expect(h.tree.open).toBe(false);
  });
});

describe("Collapsible", () => {
  async function fold(props: Record<string, unknown> = {}) {
    const { Collapsible, CollapsibleTrigger, CollapsibleContent } = await import("../src/ai/collapsible");
    return hooks.mount(() => {
      const root = Collapsible({ children: null, ...props }) as unknown as Element;
      provide(root);
      return {
        root,
        trigger: CollapsibleTrigger({ children: "Fold" }) as unknown as Element,
        content: CollapsibleContent({ children: "Body" }) as unknown as Element | null,
      };
    });
  }

  it("is a button with expanded state that toggles the content", async () => {
    const h = await fold();
    expect(h.tree.trigger.type).toBe("Pressable");
    expect(h.tree.trigger.props.accessibilityRole).toBe("button");
    expect(h.tree.trigger.props.accessibilityState).toEqual({ expanded: false });
    expect(h.tree.content).toBeNull();
    (h.tree.trigger.props.onPress as () => void)();
    expect(h.tree.trigger.props.accessibilityState).toEqual({ expanded: true });
    expect(h.tree.content!.type).toBe("NativeOnlyAnimatedView");
    // Fades in through the view that drops layout animations with Reduce Motion.
    expect(h.tree.content!.props.entering).toBe("FadeIn(150)");
    (h.tree.trigger.props.onPress as () => void)();
    expect(h.tree.content).toBeNull();
  });

  it("reaches 44 high from its 28 row, and takes open and onOpenChange", async () => {
    const onOpenChange = vi.fn();
    const h = await fold({ open: true, onOpenChange });
    expect(h.tree.trigger.props.hitSlop).toEqual(touchSlop(MIN_TOUCH_TARGET, 28));
    expect(28 + 2 * (h.tree.trigger.props.hitSlop as { top: number }).top).toBe(44);
    (h.tree.trigger.props.onPress as () => void)();
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    // Controlled: still open until the parent says otherwise.
    expect(h.tree.content).not.toBeNull();
  });
});

describe("Reasoning", () => {
  async function reasoning(initial: Record<string, unknown>) {
    const { Reasoning } = await import("../src/ai/reasoning");
    const props = { children: null, ...initial };
    const h = hooks.mount(() => Reasoning(props as never) as unknown as Element);
    const value = () =>
      h.tree.props.value as { isOpen: boolean; isStreaming: boolean; duration?: number; setIsOpen(open: boolean): void };
    return { h, props, value };
  }

  it("opens while streaming, times it, and closes a second after it stops", async () => {
    vi.useFakeTimers();
    const { h, props, value } = await reasoning({ isStreaming: true });
    expect(value()).toMatchObject({ isOpen: true, isStreaming: true, duration: undefined });
    vi.advanceTimersByTime(4200);
    props.isStreaming = false;
    h.rerender();
    // 4.2 s rounds up, as the web `Math.ceil`.
    expect(value()).toMatchObject({ isOpen: true, isStreaming: false, duration: 5 });
    vi.advanceTimersByTime(999);
    expect(value().isOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(value().isOpen).toBe(false);
    // The fold is the Collapsible, driven by the same state.
    const collapsible = h.tree.props.children as Element;
    expect(collapsible.props.open).toBe(false);
    expect(collapsible.props.className).toBe("mb-4");
  });

  it("opens when a stream starts after mount, unless defaultOpen is false", async () => {
    const open = await reasoning({ isStreaming: false });
    expect(open.value().isOpen).toBe(false);
    open.props.isStreaming = true;
    open.h.rerender();
    expect(open.value().isOpen).toBe(true);

    const shut = await reasoning({ isStreaming: false, defaultOpen: false });
    shut.props.isStreaming = true;
    shut.h.rerender();
    expect(shut.value().isOpen).toBe(false);
  });

  it("keeps a reader's close mid-stream, and a reader's toggle cancels the close", async () => {
    vi.useFakeTimers();
    const { h, props, value } = await reasoning({ isStreaming: true });
    value().setIsOpen(false);
    h.rerender();
    expect(value().isOpen).toBe(false);
    value().setIsOpen(true);
    props.isStreaming = false;
    h.rerender();
    value().setIsOpen(true);
    vi.advanceTimersByTime(3000);
    expect(value().isOpen).toBe(true);
  });

  it("stays closed for a finished message, and uses the duration it is given", async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const { value } = await reasoning({ duration: 8, onOpenChange });
    vi.advanceTimersByTime(3000);
    expect(value()).toMatchObject({ isOpen: false, duration: 8 });
    expect(onOpenChange).not.toHaveBeenCalled();
    value().setIsOpen(true);
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("draws the brain, the shimmering Thinking… and a chevron, labelled with the message", async () => {
    const { Reasoning, ReasoningTrigger } = await import("../src/ai/reasoning");
    const { Shimmer } = await import("../src/ai/shimmer");
    const { ResponseText } = await import("../src/ai/response-text");
    const { CollapsibleChevron } = await import("../src/ai/collapsible");
    for (const isStreaming of [true, false]) {
      const h = hooks.mount(() => {
        const tree = Reasoning({ isStreaming, duration: isStreaming ? undefined : 12, children: null }) as unknown as Element;
        provide(tree);
        return ReasoningTrigger({}) as unknown as Element;
      });
      const message = isStreaming ? "Thinking…" : "Thought for 12s";
      expect(h.tree.props.accessibilityLabel).toBe(message);
      expect(byType(h.tree, "IconBrain")[0]!.props).toEqual({ size: 16, color: tokens.color.muted.light });
      const text = byType(h.tree, isStreaming ? Shimmer : ResponseText)[0]!;
      expect(text.props.children).toBe(message);
      expect(byType(h.tree, CollapsibleChevron)[0]!.props).toMatchObject({ open: isStreaming, size: 16 });
    }
  });
});

describe("Shimmer", () => {
  it("pulses the foreground text down to 0.45 and back once per duration", async () => {
    const { Shimmer, SHIMMER_LOW_OPACITY } = await import("../src/ai/shimmer");
    const h = hooks.mount(() => Shimmer({ children: "Thinking…", duration: 2 }) as unknown as Element);
    expect(SHIMMER_LOW_OPACITY).toBe(0.45);
    expect(animation.withTiming).toHaveBeenCalledWith(0.45, { duration: 1000 });
    expect(animation.withRepeat).toHaveBeenCalledWith(expect.anything(), -1, true);
    const text = byType(h.tree, "Text")[0]!;
    expect(flatten(text.props.style).color).toBe(tokens.color.foreground.light);
    h.unmount();
    expect(animation.cancelAnimation).toHaveBeenCalled();
  });

  it("holds still in the muted colour with Reduce Motion", async () => {
    reduceMotion.value = true;
    const { Shimmer } = await import("../src/ai/shimmer");
    const h = hooks.mount(() => Shimmer({ children: "Thinking…" }) as unknown as Element);
    expect(animation.withRepeat).not.toHaveBeenCalled();
    expect(flatten(h.tree.props.style).opacity).toBe(1);
    expect(flatten(byType(h.tree, "Text")[0]!.props.style).color).toBe(tokens.color.muted.light);
  });
});

describe("Message", () => {
  async function message(from: "user" | "assistant", children: unknown = "Hello") {
    const { Message, MessageContent } = await import("../src/ai/message");
    return hooks.mount(() => {
      const row = Message({ from, children: null }) as unknown as Element;
      provide(row);
      return { row, content: MessageContent({ children } as never) as unknown as Element };
    }).tree;
  }

  it("puts a user message at the end, in the web primary bubble (16, bottom-right 14)", async () => {
    const web = readWeb("ai-elements/message.tsx");
    expect(web).toMatch(/group-\[\.is-user\]:rounded-2xl group-\[\.is-user\]:rounded-br-md group-\[\.is-user\]:bg-primary/);
    for (const colorScheme of ["light", "dark"] as const) {
      scheme.colorScheme = colorScheme;
      const { row, content } = await message("user");
      const view = row.props.children as Element;
      expect(flatten(view.props.style)).toMatchObject({ alignSelf: "flex-end", alignItems: "flex-end" });
      expect(view.props.className).toBe("w-full max-w-[95%] gap-2");
      // The bubble hands the label colour to the text in it.
      expect(content.props.value).toBe(palette.primaryForeground[colorScheme]);
      const bubble = content.props.children as Element;
      expect(bubble.props.className).toBe("min-w-0 max-w-full gap-2 px-4 py-3");
      expect(flatten(bubble.props.style)).toEqual({
        backgroundColor: palette.primary[colorScheme],
        borderRadius: 16,
        borderBottomRightRadius: 14,
      });
    }
  });

  it("draws an assistant message with no fill, in the foreground", async () => {
    const { ResponseText } = await import("../src/ai/response-text");
    const { row, content } = await message("assistant");
    expect(flatten((row.props.children as Element).props.style)).toMatchObject({ alignSelf: "flex-start" });
    expect(content.props.value).toBe(tokens.color.foreground.light);
    const body = content.props.children as Element;
    expect(flatten(body.props.style)).toEqual({});
    // A string child is ResponseText.
    expect((body.props.children as Element).type).toBe(ResponseText);
  });

  it("names the four actions and paints them at the web icon-sm size with a 44 target", async () => {
    const { MessageAction, MESSAGE_ACTIONS } = await import("../src/ai/message");
    const { ChatIconButton } = await import("../src/ai/icon-button");
    expect(Object.values(MESSAGE_ACTIONS).map((action) => action.label)).toEqual([
      "Copy",
      "Retry",
      "Good response",
      "Bad response",
    ]);
    const onPress = vi.fn();
    const action = MessageAction({ kind: "like", onPress }) as unknown as Element;
    expect(action.type).toBe(ChatIconButton);
    expect(action.props).toMatchObject({ icon: "IconThumbUp", label: "Good response", accessibilityState: { selected: false } });
    const button = render(action) as Element;
    expect(button.type).toBe("Button");
    expect(button.props).toMatchObject({
      variant: "ghost",
      size: "icon",
      accessibilityLabel: "Good response",
      className: "h-8 w-8",
      hitSlop: touchSlop(32),
      style: { borderRadius: 16 },
    });
    expect(32 + 2 * touchSlop(32).top).toBe(44);
    expect((button.props.children as Element).props).toEqual({ size: 16, color: buttonColors("ghost", "light")!.color });
    (button.props.onPress as () => void)();
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("marks chosen feedback selected and draws it in the foreground", async () => {
    const { MessageAction } = await import("../src/ai/message");
    const action = MessageAction({ kind: "dislike", selected: true }) as unknown as Element;
    expect(action.props.accessibilityState).toEqual({ selected: true });
    const button = render(action) as Element;
    expect((button.props.children as Element).props).toEqual({ size: 16, color: tokens.color.foreground.light });
    expect(button.props.accessibilityState).toEqual({ selected: true });
  });

  it("paints actions 44 with a 20 icon with larger text", async () => {
    larger.value = true;
    const { MessageAction } = await import("../src/ai/message");
    const button = render(MessageAction({ kind: "copy" }) as unknown as Element) as Element;
    expect(button.props).toMatchObject({ className: "h-11 w-11", hitSlop: touchSlop(44), style: { borderRadius: 22 } });
    expect((button.props.children as Element).props.size).toBe(20);
  });
});

describe("ResponseText", () => {
  it("takes the MessageContent colour, or the tone, and keeps newlines", async () => {
    const { ResponseText, ChatTextColorContext } = await import("../src/ai/response-text");
    const text = "First line\n\nSecond line";
    hooks.state.contexts.set(ChatTextColorContext, "#123456");
    const inherited = ResponseText({ children: text }) as unknown as Element;
    expect(inherited.type).toBe("Text");
    expect(inherited.props.children).toBe(text);
    expect(inherited.props.selectable).toBe(true);
    expect(flatten(inherited.props.style)).toEqual({ fontSize: 16, lineHeight: 24, color: "#123456" });
    const muted = ResponseText({ children: text, tone: "muted", size: "small" }) as unknown as Element;
    expect(flatten(muted.props.style)).toEqual({ fontSize: 14, lineHeight: 20, color: tokens.color.muted.light });
    hooks.state.contexts.clear();
    scheme.colorScheme = "dark";
    expect(flatten((ResponseText({ children: text }) as unknown as Element).props.style).color).toBe(
      tokens.color.foreground.dark,
    );
  });
});

describe("Conversation", () => {
  const event = (offset: number, content = 2000, view = 800) => ({
    contentOffset: { x: 0, y: offset },
    contentSize: { width: 390, height: content },
    layoutMeasurement: { width: 390, height: view },
  });

  it("counts within 70 of the end, or content shorter than the view, as the bottom", async () => {
    const { isScrolledToBottom, AT_BOTTOM_THRESHOLD } = await import("../src/ai/conversation");
    expect(AT_BOTTOM_THRESHOLD).toBe(70);
    expect(isScrolledToBottom(event(1200))).toBe(true);
    expect(isScrolledToBottom(event(1130))).toBe(true);
    expect(isScrolledToBottom(event(1129))).toBe(false);
    expect(isScrolledToBottom(event(0, 300))).toBe(true);
  });

  async function conversation() {
    const { Conversation, ConversationScrollButton } = await import("../src/ai/conversation");
    const scrollToEnd = vi.fn();
    const h = hooks.mount(() => {
      const frame = Conversation({ children: null }) as unknown as Element;
      provide(frame);
      return { frame, button: ConversationScrollButton({}) as unknown as Element | null };
    });
    type Value = {
      isAtBottom: boolean;
      scrollRef: { current: unknown };
      onScroll(event: unknown): void;
      onUserScroll(): void;
      followContent(): void;
      scrollToBottom(): void;
    };
    const value = () => h.tree.frame.props.value as Value;
    value().scrollRef.current = { scrollToEnd };
    return { h, value, scrollToEnd };
  }

  it("follows new content while at the bottom, and stops once the reader scrolls up", async () => {
    const { h, value, scrollToEnd } = await conversation();
    expect(value().isAtBottom).toBe(true);
    expect(h.tree.button).toBeNull();
    value().followContent();
    expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: false });
    value().onUserScroll();
    value().onScroll(event(400));
    expect(value().isAtBottom).toBe(false);
    scrollToEnd.mockClear();
    value().followContent();
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it("shows a round outline arrow away from the bottom that scrolls down and hides at once", async () => {
    const { h, value, scrollToEnd } = await conversation();
    value().onScroll(event(400));
    const frame = h.tree.button!;
    expect(frame.type).toBe("NativeOnlyAnimatedView");
    expect(frame.props.style).toEqual({ position: "absolute", left: 0, right: 0, bottom: 16, alignItems: "center" });
    expect(frame.props.pointerEvents).toBe("box-none");
    const button = frame.props.children as Element;
    expect(button.props).toMatchObject({
      variant: "outline",
      size: "icon",
      accessibilityLabel: "Scroll to bottom",
      style: { borderRadius: tokens.radius.pill, backgroundColor: tokens.color.surface.light },
    });
    expect((button.props.children as Element).type).toBe("IconArrowDown");
    (button.props.onPress as () => void)();
    expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: true });
    expect(h.tree.button).toBeNull();
    // Its own animated scroll, on the way down, does not bring the button back.
    value().onScroll(event(900));
    expect(h.tree.button).toBeNull();
    value().onScroll(event(1200));
    // The reader dragging up again does.
    value().onUserScroll();
    value().onScroll(event(300));
    expect(h.tree.button).not.toBeNull();
  });

  it("jumps instead of animating with Reduce Motion", async () => {
    reduceMotion.value = true;
    const { value, scrollToEnd } = await conversation();
    value().onScroll(event(400));
    value().scrollToBottom();
    expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: false });
  });

  it("wires the scroll view: follow on size and layout changes, throttle 16, taps go through to the keyboard", async () => {
    const { Conversation, ConversationContent } = await import("../src/ai/conversation");
    const onScroll = vi.fn();
    const h = hooks.mount(() => {
      const frame = Conversation({ children: null }) as unknown as Element;
      provide(frame);
      return { frame, scroll: ConversationContent({ onScroll }) as unknown as Element };
    });
    const scrollToEnd = vi.fn();
    (h.tree.frame.props.value as { scrollRef: { current: unknown } }).scrollRef.current = { scrollToEnd };
    const scroll = h.tree.scroll;
    expect(scroll.type).toBe("ScrollView");
    expect(scroll.props).toMatchObject({
      contentContainerClassName: "gap-4 px-3 py-3",
      keyboardShouldPersistTaps: "handled",
      keyboardDismissMode: "interactive",
      scrollEventThrottle: 16,
    });
    (scroll.props.onContentSizeChange as (w: number, h: number) => void)(390, 3000);
    (scroll.props.onLayout as (event: unknown) => void)({ nativeEvent: {} });
    expect(scrollToEnd).toHaveBeenCalledTimes(2);
    const scrolled = { nativeEvent: event(100) };
    (scroll.props.onScroll as (event: unknown) => void)(scrolled);
    expect(onScroll).toHaveBeenCalledWith(scrolled);
  });
});

describe("PromptInput", () => {
  async function composer(props: Record<string, unknown> = {}) {
    const { PromptInput, PromptInputSubmit } = await import("../src/ai/prompt-input");
    const onSubmit = vi.fn();
    const h = hooks.mount(() => PromptInput({ onSubmit, ...props } as never) as unknown as Element);
    const field = () => byType(h.tree, "FieldInput")[0]!;
    const submit = () => byType(h.tree, PromptInputSubmit)[0]!;
    return { h, onSubmit, field, submit };
  }

  it("sends the trimmed text and clears the field", async () => {
    const { onSubmit, field, submit } = await composer();
    expect(field().props).toMatchObject({
      multiline: true,
      value: "",
      placeholder: "What would you like to know?",
      accessibilityLabel: "Message",
    });
    // Not Textarea's fixed `numberOfLines`: the field grows from one line to a cap.
    expect(field().props.numberOfLines).toBeUndefined();
    expect(flatten(field().props.style)).toMatchObject({ backgroundColor: "transparent", maxHeight: 160 });
    expect(submit().props.canSubmit).toBe(false);
    (field().props.onChangeText as (text: string) => void)("  Hello there  ");
    expect(submit().props.canSubmit).toBe(true);
    (submit().props.onSubmit as () => void)();
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Hello there");
    expect(field().props.value).toBe("");
  });

  it("does not send blank text, or while disabled or answering", async () => {
    for (const props of [{}, { disabled: true }, { status: "streaming" }, { status: "submitted" }]) {
      const { onSubmit, field, submit } = await composer(props);
      (field().props.onChangeText as (text: string) => void)(Object.keys(props).length ? "Hi" : "   ");
      (submit().props.onSubmit as () => void)();
      expect(onSubmit, JSON.stringify(props)).not.toHaveBeenCalled();
    }
  });

  it("sits on the keyboard with padding and pads the safe-area insets", async () => {
    const { h } = await composer({ keyboardVerticalOffset: 100 });
    expect(h.tree.type).toBe("KeyboardAvoidingView");
    expect(h.tree.props.behavior).toBe("padding");
    // The home indicator inset is padded below, and the keyboard covers it.
    expect(h.tree.props.keyboardVerticalOffset).toBe(100 - insets.bottom);
    const pad = h.tree.props.children as Element;
    expect(pad.props.style).toEqual({ paddingBottom: insets.bottom + 8, paddingLeft: 12, paddingRight: 12 });
    const off = (await composer({ safeBottom: false })).h.tree;
    expect(off.props.keyboardVerticalOffset).toBe(0);
    expect((off.props.children as Element).props.style).toMatchObject({ paddingBottom: 8 });
  });

  it("draws the web field surface with the header and toolbar slots", async () => {
    const { h } = await composer({ header: "HEADER", toolbar: "TOOLS" });
    const surface = (h.tree.props.children as Element).props.children as Element;
    expect(surface.props.style).toEqual({
      backgroundColor: tokens.color.surface.light,
      borderColor: tokens.color.border.light,
      borderRadius: tokens.radius.field,
    });
    expect(surface.props.className).toBe("border");
    expect(elements(surface).some((element) => element.props.children === "HEADER")).toBe(true);
    expect(elements(surface).some((element) => element.props.children === "TOOLS")).toBe(true);
  });

  it("is Send (primary, or secondary and disabled when empty), and Stop while the AI answers", async () => {
    const { PromptInputSubmit } = await import("../src/ai/prompt-input");
    const onSubmit = vi.fn();
    const onStop = vi.fn();
    const send = PromptInputSubmit({ onSubmit }) as unknown as Element;
    expect(send.props).toMatchObject({ icon: "IconArrowUp", label: "Send", variant: "primary", disabled: false });
    const empty = PromptInputSubmit({ onSubmit, canSubmit: false }) as unknown as Element;
    expect(empty.props).toMatchObject({ label: "Send", variant: "secondary", disabled: true });
    for (const status of ["streaming", "submitted"] as const) {
      const stop = PromptInputSubmit({ status, onSubmit, onStop }) as unknown as Element;
      expect(stop.props).toMatchObject({ icon: "IconPlayerStopFilled", label: "Stop", variant: "primary", disabled: false });
      (stop.props.onPress as () => void)();
    }
    expect(onStop).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
    expect((PromptInputSubmit({ status: "streaming" }) as unknown as Element).props.disabled).toBe(true);
    expect((PromptInputSubmit({ status: "error", onSubmit }) as unknown as Element).props.label).toBe("Send");
  });
});

describe("Suggestion, Source, FileChip and Attachment", () => {
  it("Suggestion is a labelled round chip that passes its text and reaches 44", async () => {
    const { Suggestion } = await import("../src/ai/suggestion");
    const onPress = vi.fn();
    const chip = Suggestion({ suggestion: "Draft a reply", onPress }) as unknown as Element;
    expect(chip.type).toBe("Pressable");
    expect(chip.props).toMatchObject({ accessibilityRole: "button", accessibilityLabel: "Draft a reply" });
    expect(chip.props.hitSlop).toEqual(touchSlop(MIN_TOUCH_TARGET, 32));
    const style = chip.props.style as (state: { pressed: boolean }) => Record<string, unknown>;
    expect(style({ pressed: false })).toEqual({
      borderRadius: tokens.radius.pill,
      borderColor: tokens.color.border.light,
      backgroundColor: tokens.color.surfaceSecondary.light,
    });
    expect(style({ pressed: true }).backgroundColor).toBe(palette.surfaceTertiary.light);
    const label = (chip.props.children as (state: { pressed: boolean }) => Element)({ pressed: false });
    expect(label.props.children).toBe("Draft a reply");
    expect(flatten(label.props.style).color).toBe(tokens.color.muted.light);
    (chip.props.onPress as () => void)();
    expect(onPress).toHaveBeenCalledExactlyOnceWith("Draft a reply");
  });

  it("Source is a link row that opens its address, or hands it to onPress", async () => {
    const { Source, sourcesLabel } = await import("../src/ai/sources");
    const row = Source({ href: "https://example.com/a", title: "Example" }) as unknown as Element;
    expect(row.props).toMatchObject({ accessibilityRole: "link", accessibilityLabel: "Example" });
    expect(row.props.hitSlop).toEqual(touchSlop(MIN_TOUCH_TARGET, 36));
    (row.props.onPress as () => void)();
    expect(openURL).toHaveBeenCalledExactlyOnceWith("https://example.com/a");
    const onPress = vi.fn();
    (((Source({ href: "https://example.com/b", onPress }) as unknown as Element).props.onPress) as () => void)();
    expect(onPress).toHaveBeenCalledExactlyOnceWith("https://example.com/b");
    expect(openURL).toHaveBeenCalledOnce();
    expect(sourcesLabel(1)).toBe("Used 1 source");
    expect(sourcesLabel(3)).toBe("Used 3 sources");
  });

  it("FileChip is plain text without a handler, and a labelled button with one", async () => {
    const { FileChip } = await import("../src/ai/file-chip");
    expect((FileChip({ name: "a.md" }) as unknown as Element).type).not.toBe("Pressable");
    const onOpenFile = vi.fn();
    const chip = FileChip({ name: "a.md", path: "/docs/a.md", onOpenFile }) as unknown as Element;
    expect(chip.props).toMatchObject({ accessibilityRole: "button", accessibilityLabel: "a.md" });
    expect(chip.props.hitSlop).toEqual(touchSlop(MIN_TOUCH_TARGET, 22));
    (chip.props.onPress as () => void)();
    expect(onOpenFile).toHaveBeenCalledExactlyOnceWith("/docs/a.md");
  });

  it("sorts and names attachments as the web does", async () => {
    const { getAttachmentLabel, getMediaCategory } = await import("../src/ai/attachments");
    expect(getMediaCategory({ id: "1", mediaType: "image/png" })).toBe("image");
    expect(getMediaCategory({ id: "2", mediaType: "video/mp4" })).toBe("video");
    expect(getMediaCategory({ id: "3", mediaType: "audio/mpeg" })).toBe("audio");
    expect(getMediaCategory({ id: "4", mediaType: "application/pdf" })).toBe("document");
    expect(getMediaCategory({ id: "5", mediaType: "text/plain" })).toBe("document");
    expect(getMediaCategory({ id: "6" })).toBe("unknown");
    expect(getMediaCategory({ id: "7", type: "source-document" })).toBe("source");
    expect(getAttachmentLabel({ id: "1", mediaType: "image/png" })).toBe("Image");
    expect(getAttachmentLabel({ id: "2" })).toBe("Attachment");
    expect(getAttachmentLabel({ id: "3", filename: "a.pdf" })).toBe("a.pdf");
    expect(getAttachmentLabel({ id: "4", type: "source-document" })).toBe("Source");
    expect(getAttachmentLabel({ id: "5", type: "source-document", title: "Docs" })).toBe("Docs");
  });

  it("Attachment has a labelled remove button with a 44 target, and a thumbnail for an image with a url", async () => {
    const { Attachment } = await import("../src/ai/attachments");
    const onRemove = vi.fn();
    const chip = Attachment({ data: { id: "1", filename: "notes.pdf", mediaType: "application/pdf" }, onRemove }) as unknown as Element;
    const remove = byLabel(chip, "Remove notes.pdf")!;
    expect(remove.props).toMatchObject({ accessibilityRole: "button", hitSlop: touchSlop(20) });
    expect(20 + 2 * touchSlop(20).top).toBe(44);
    (remove.props.onPress as () => void)();
    expect(onRemove).toHaveBeenCalledOnce();
    expect(byType(chip, "IconFileText")).toHaveLength(1);
    const image = Attachment({ data: { id: "2", mediaType: "image/png", url: "file:///a.png" } }) as unknown as Element;
    expect(byType(image, "Image")[0]!.props.source).toEqual({ uri: "file:///a.png" });
    expect(byLabel(image, "Remove Image")).toBeUndefined();
  });
});

describe("CodeBlock", () => {
  it("copies through onCopy, shows Copied for two seconds, then resets", async () => {
    vi.useFakeTimers();
    const { CodeBlockCopyButton } = await import("../src/ai/code-block");
    const onCopy = vi.fn();
    const h = hooks.mount(() => CodeBlockCopyButton({ code: "let a = 1;", onCopy }) as unknown as Element);
    expect(h.tree.props).toMatchObject({ icon: "IconCopy", label: "Copy code" });
    (h.tree.props.onPress as () => void)();
    await vi.advanceTimersByTimeAsync(0);
    expect(onCopy).toHaveBeenCalledExactlyOnceWith("let a = 1;");
    expect(h.tree.props).toMatchObject({ icon: "IconCheck", label: "Copied" });
    // Presses while the check shows do nothing, as on the web.
    (h.tree.props.onPress as () => void)();
    await vi.advanceTimersByTimeAsync(1999);
    expect(onCopy).toHaveBeenCalledOnce();
    expect(h.tree.props.label).toBe("Copied");
    await vi.advanceTimersByTimeAsync(1);
    expect(h.tree.props).toMatchObject({ icon: "IconCopy", label: "Copy code" });
  });

  it("keeps the copy icon when the copy fails", async () => {
    const { CodeBlockCopyButton } = await import("../src/ai/code-block");
    const h = hooks.mount(() =>
      CodeBlockCopyButton({ code: "x", onCopy: () => Promise.reject(new Error("no clipboard")) }) as unknown as Element,
    );
    (h.tree.props.onPress as () => void)();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.tree.props.label).toBe("Copy code");
  });

  it("draws plain monospace code on the flat panel, with a header only for a language or copy", async () => {
    const { CodeBlock, CodeBlockCopyButton } = await import("../src/ai/code-block");
    const { MONO_FONT } = await import("../src/ai/chat-text");
    const block = CodeBlock({ code: "a\nb", language: "ts", onCopy: vi.fn() }) as unknown as Element;
    expect(block.props.style).toEqual({ borderRadius: 16, backgroundColor: tokens.color.surfaceSecondary.light });
    expect(byType(block, CodeBlockCopyButton)).toHaveLength(1);
    const code = byType(block, "Text").find((text) => text.props.children === "a\nb")!;
    expect(code.props.selectable).toBe(true);
    expect(flatten(code.props.style).fontFamily).toBe(MONO_FONT);
    expect(MONO_FONT).toBe("Menlo");
    const bare = CodeBlock({ code: "a" }) as unknown as Element;
    expect(byType(bare, CodeBlockCopyButton)).toHaveLength(0);
    expect(byType(bare, "ScrollView")[0]!.props).toMatchObject({ horizontal: true, contentContainerClassName: "p-4" });
  });
});

describe("trace lines and activity steps", () => {
  it("colours a line muted, or the danger colour on error, and fades pending", async () => {
    const { AgentTraceLine, traceLineColor } = await import("../src/ai/trace");
    expect(traceLineColor(undefined, "light")).toBe(tokens.color.muted.light);
    expect(traceLineColor("running", "dark")).toBe(tokens.color.muted.dark);
    expect(traceLineColor("error", "dark")).toBe(palette.danger.dark);
    const pending = AgentTraceLine({ status: "pending" }) as unknown as Element;
    expect(pending.props.value).toBe(tokens.color.muted.light);
    expect(flatten((pending.props.children as Element).props.style).opacity).toBe(0.6);
  });

  it("an activity step reads its label, status and description, and pulses while running", async () => {
    const { ActivityStep } = await import("../src/ai/activity-step");
    const { AgentTraceTitle, AgentTraceIcon } = await import("../src/ai/trace");
    const running = ActivityStep({ label: "Searching the web", icon: (() => null) as never, status: "running" }) as unknown as Element;
    expect(running.props).toMatchObject({
      accessible: true,
      accessibilityLabel: "Searching the web, in progress",
      accessibilityState: { busy: true },
    });
    expect(byType(running, AgentTraceTitle)[0]!.props).toMatchObject({ shimmer: true, children: "Searching the web" });
    expect(byType(running, "Spinner")).toHaveLength(1);
    const done = ActivityStep({ label: "Read 3 files", description: "Worked for 12s" }) as unknown as Element;
    expect(done.props.accessibilityLabel).toBe("Read 3 files, done, Worked for 12s");
    expect(byType(done, AgentTraceIcon).at(-1)!.props.icon).toBe("IconCheck");
    const failed = ActivityStep({ label: "Fetch page", status: "error" }) as unknown as Element;
    expect(failed.props.status).toBe("error");
    expect(failed.props.accessibilityLabel).toBe("Fetch page, failed");
    expect(byType(failed, AgentTraceIcon).at(-1)!.props.icon).toBe("IconAlertTriangle");
  });
});

describe("AI parts (source contract)", () => {
  const sources = Object.fromEntries(aiFiles.map((file) => [file, code(read(`ai/${file}`))]));
  const gallery = code(read("examples/AiChatGallery.tsx"));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  it("adds no markdown, highlighter or clipboard package, and names the markdown options in the stub", () => {
    for (const [file, source] of Object.entries(sources)) {
      expect(source, file).not.toMatch(/from "(?:react-native-markdown-display|@ronradtke\/react-native-markdown-display|react-native-marked|shiki|streamdown|expo-clipboard|@react-native-clipboard\/clipboard)"/);
      expect(source, file).not.toMatch(/\bClipboard\b/);
    }
    const stub = read("ai/response-text.tsx");
    for (const name of ["react-native-markdown-display", "@ronradtke/react-native-markdown-display", "react-native-marked"]) {
      expect(stub).toContain(`\`${name}\``);
    }
    const all = { ...pkg.peerDependencies, ...pkg.devDependencies };
    for (const name of ["react-native-markdown-display", "react-native-marked", "shiki", "expo-clipboard", "@react-native-clipboard/clipboard"]) {
      expect(all[name], name).toBeUndefined();
    }
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(["@types/react", "react", "typescript", "vitest"]);
    expect(pkg.dependencies).toBeUndefined();
  });

  it("draws no shadow and sets colours as styles, not NativeWind colour classes", () => {
    for (const [file, source] of Object.entries(sources)) {
      expect(source, file).not.toMatch(/floatingShadow|shadow-(?:sm|md|lg|xl|2xl)\b|shadowType="shadow"|boxShadow|\belevation\b/);
      expect(source, file).not.toMatch(/["'\s](?:text|bg|border)-(?:foreground|muted-foreground|muted|primary|primary-foreground|secondary|background|surface[\w-]*|border)(?=["'\s/])/);
    }
  });

  it("gives every pressable a role (or hides it) and a hit slop or a 44 size", () => {
    let count = 0;
    for (const [file, source] of Object.entries(sources)) {
      for (const tag of source.match(/<Pressable\b[\s\S]*?>/g) ?? []) {
        count++;
        expect(tag, file).toMatch(/accessibilityRole="(?:button|link)"|accessible=\{false\}/);
        expect(tag, file).toMatch(/hitSlop=\{/);
      }
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it("scales type and icons with larger text in every part that draws text or an icon", () => {
    for (const [file, source] of Object.entries(sources)) {
      // `CollapsibleChevron` takes its `size` from the trigger that draws it.
      if (file === "collapsible.tsx" || !/<(?:Text|Icon(?!Props\b)\w*)[\s/>]/.test(source)) continue;
      expect(source, file).toMatch(/useLargerText\(\)/);
    }
    expect(sources["collapsible.tsx"]).toMatch(/size: number;/);
  });

  it("names its controls for VoiceOver and TalkBack", () => {
    expect(sources["conversation.tsx"]).toMatch(/label = "Scroll to bottom"/);
    expect(sources["prompt-input.tsx"]).toMatch(/label="Send"/);
    expect(sources["prompt-input.tsx"]).toMatch(/label="Stop"/);
    expect(sources["code-block.tsx"]).toMatch(/label = "Copy code"/);
    expect(sources["attachments.tsx"]).toMatch(/accessibilityLabel=\{`Remove \$\{label\}`\}/);
    expect(sources["collapsible.tsx"]).toMatch(/accessibilityState=\{\{ \.\.\.accessibilityState, expanded: open \}\}/);
  });

  it("stays generic: no model or provider names, and the AI wording", () => {
    for (const [file, source] of Object.entries({ ...sources, "AiChatGallery.tsx": gallery })) {
      expect(source, file).not.toMatch(/\b(?:gpt|claude|gemini|llama|mistral|openai|anthropic|vibot)\b/i);
    }
    expect(sources["reasoning.tsx"]).toMatch(/"Thinking…"/);
    expect(sources["reasoning.tsx"]).toMatch(/`Thought for \$\{formatElapsed\(duration\)\}`/);
    expect(gallery).toMatch(/`Worked for \$\{formatElapsed\(/);
  });

  it("is exported from /ai, and the gallery imports the /ai parts, not the root entry", () => {
    const entry = read("entries/ai.ts");
    expect(entry).toMatch(/export \* from "\.\.\/ai";/);
    expect(pkg.exports["./ai"]).toEqual({ types: "./src/entries/ai.ts", default: "./src/entries/ai.ts" });
    expect(pkg.exports["./ai-gallery"]).toEqual({
      types: "./src/examples/AiChatGallery.tsx",
      default: "./src/examples/AiChatGallery.tsx",
    });
    expect(gallery).toMatch(/from "\.\.\/ai";/);
    expect(gallery).not.toMatch(/from "\.\.\/index"/);
    // Every file in src/ai is reached from the barrel.
    const barrel = read("ai/index.ts");
    for (const file of aiFiles) {
      if (file === "index.ts" || file === "icon-button.tsx") continue;
      expect(barrel, file).toContain(`from "./${file.replace(/\.tsx?$/, "")}"`);
    }
  });

  it("shows the AI parts in the ParityGallery, from the same sample thread", () => {
    const parity = code(read("examples/ParityGallery.tsx"));
    expect(parity).toMatch(/<Section title="AI chat">\s+<AiChatSamples \/>/);
    expect(parity).toMatch(/import \{ AiChatSamples \} from "\.\/AiChatGallery";/);
  });
});

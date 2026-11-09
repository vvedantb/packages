import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_TOUCH_TARGET } from "../src/controlStyles";
import { palette, withAlpha } from "../src/palette";
import { tokens } from "../src/tokens";

// Tool and subagent cards and the bot label (0.13.0). Same harness as `ai.test.ts`.
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
      "IconTool",
      "IconRobot",
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

/** Expands a function-component element one level, as React would. */
const unwrap = (element: Element) => (typeof element.type === "function" ? render(element) : element);

const collapsible = () => import("../src/ai/collapsible");

describe("ToolApprovalCard", () => {
  async function card(props: Record<string, unknown> = {}) {
    const { ToolApprovalCard } = await import("../src/ai/tool-approval-card");
    const onDecide = vi.fn();
    return { onDecide, render: (extra: Record<string, unknown> = {}) => unwrap(ToolApprovalCard({ toolName: "send_email", args: { to: "team", subject: "Plan" }, onDecide, ...props, ...extra } as never) as unknown as Element) };
  }
  // CardButton is a function component: render it to read its Pressable.
  const button = (tree: Element, id: string) => unwrap(find(tree, (e) => e.props.testID === id)!);

  it("shows the tool name and an args summary, with testIDs", async () => {
    const tree = (await card()).render();
    expect(tree.props.testID).toBe("tool-approval-card");
    expect(button(tree, "tool-approval-card-name").props.children).toBe("send_email");
    expect(button(tree, "tool-approval-card-args").props.children).toBe('{"to":"team","subject":"Plan"}');
  });

  it("has Approve and Deny and no Edit", async () => {
    const tree = (await card()).render();
    expect(button(tree, "tool-approval-card-approve")).toBeDefined();
    expect(button(tree, "tool-approval-card-deny")).toBeDefined();
    expect(find(tree, (e) => e.props.testID === "tool-approval-card-edit")).toBeUndefined();
  });

  it("reports approve and deny through onDecide", async () => {
    const { onDecide, render } = await card();
    const tree = render();
    const approve = button(tree, "tool-approval-card-approve");
    const deny = button(tree, "tool-approval-card-deny");
    expect(approve.props.accessibilityLabel).toBe("Approve send_email");
    press(approve, "onPress");
    press(deny, "onPress");
    expect(onDecide.mock.calls).toEqual([["approve"], ["deny"]]);
  });

  it("turns the buttons off while pending or disabled", async () => {
    const { render } = await card();
    for (const extra of [{ pending: true }, { disabled: true }]) {
      const tree = render(extra);
      for (const id of ["approve", "deny"]) {
        const b = button(tree, `tool-approval-card-${id}`);
        expect(b.props.disabled).toBe(true);
        expect(b.props.accessibilityState).toEqual({ disabled: true });
      }
    }
    expect(byType(render({ pending: true }), "Text").some((t) => t.props.children === "Sending decision…")).toBe(true);
  });

  it("cuts long args and survives circular ones", async () => {
    const { summarizeArgs, ARGS_MAX_CHARS } = await import("../src/ai/tool-approval-card");
    const long = summarizeArgs("x".repeat(500));
    expect(long).toHaveLength(ARGS_MAX_CHARS);
    expect(long.endsWith("…")).toBe(true);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(summarizeArgs(circular)).toBe("[unserialisable arguments]");
    expect(summarizeArgs(undefined)).toBe("");
    expect(summarizeArgs("a\n  b")).toBe("a b");
  });

  it("steps text up with larger text", async () => {
    const { render } = await card();
    larger.value = true;
    expect(button(render(), "tool-approval-card-name").props.className).toContain("text-xl");
  });
});

describe("ToolDraftCard", () => {
  it("adds Edit, which reports edit, with its own testIDs", async () => {
    const { ToolDraftCard } = await import("../src/ai/tool-approval-card");
    const onDecide = vi.fn();
    const tree = unwrap(ToolDraftCard({ toolName: "create_doc", onDecide } as never) as unknown as Element);
    expect(tree.props.testID).toBe("tool-draft-card");
    const edit = find(tree, (e) => e.props.testID === "tool-draft-card-edit")!;
    press(unwrap(edit), "onPress");
    press(unwrap(find(tree, (e) => e.props.testID === "tool-draft-card-approve")!), "onPress");
    expect(onDecide.mock.calls).toEqual([["edit"], ["approve"]]);
    const off = unwrap(ToolDraftCard({ toolName: "create_doc", pending: true } as never) as unknown as Element);
    expect(unwrap(find(off, (e) => e.props.testID === "tool-draft-card-edit")!).props.disabled).toBe(true);
  });
});

describe("SubagentRunCard", () => {
  async function run(props: Record<string, unknown> = {}) {
    const { SubagentRunCard } = await import("../src/ai/subagent-cards");
    const onCancel = vi.fn();
    return { onCancel, render: (extra: Record<string, unknown> = {}) => SubagentRunCard({ title: "Research", status: "running", elapsedSeconds: 65, onCancel, ...props, ...extra } as never) as unknown as Element };
  }
  const named = (tree: Element, id: string) => {
    const element = find(tree, (e) => e.props.testID === id);
    return element && typeof element.type === "function" ? unwrap(element) : element;
  };

  it("shows status and elapsed time", async () => {
    const tree = (await run()).render();
    expect(named(tree, "subagent-run-card-status")!.props.accessibilityLabel).toBe("Status: Running");
    expect(named(tree, "subagent-run-card-elapsed")!.props.children).toBe("1m 5s");
  });

  it("offers Cancel only while running", async () => {
    const { onCancel, render } = await run();
    press(named(render(), "subagent-run-card-cancel"), "onPress");
    expect(onCancel).toHaveBeenCalledTimes(1);
    for (const status of ["done", "failed", "cancelled"]) {
      expect(named(render({ status }), "subagent-run-card-cancel")).toBeUndefined();
    }
    expect(named(render({ onCancel: undefined }), "subagent-run-card-cancel")).toBeUndefined();
  });

  it("labels each status and colours it", async () => {
    const { render } = await run();
    const { subagentStatusColors } = await import("../src/ai/subagent-cards");
    for (const [status, label] of [["done", "Done"], ["failed", "Failed"], ["cancelled", "Cancelled"]] as const) {
      expect(named(render({ status }), "subagent-run-card-status")!.props.accessibilityLabel).toBe(`Status: ${label}`);
    }
    expect(subagentStatusColors("failed", "dark").color).toBe(palette.danger.dark);
    expect(subagentStatusColors("done", "light").color).toBe(palette.success.light);
  });

  it("omits elapsed when unknown", async () => {
    expect(named((await run()).render({ elapsedSeconds: undefined }), "subagent-run-card-elapsed")).toBeUndefined();
  });
});

describe("SubagentResultCard", () => {
  it("shows the summary and folds the detail behind a trigger", async () => {
    const { SubagentResultCard } = await import("../src/ai/subagent-cards");
    const { Collapsible, CollapsibleTrigger, CollapsibleContent } = await collapsible();
    const tree = SubagentResultCard({ title: "Research", summary: "Three sources", detail: "Long detail" } as never) as unknown as Element;
    expect(tree.type).toBe(Collapsible);
    const parts = elements(tree);
    const trigger = parts.find((e) => e.type === CollapsibleTrigger)!;
    expect(trigger.props).toMatchObject({ testID: "subagent-result-card-trigger", accessibilityLabel: "Details for Research" });
    expect(parts.find((e) => e.type === CollapsibleContent)!.props.testID).toBe("subagent-result-card-detail");
  });

  it("has no fold without detail", async () => {
    const { SubagentResultCard } = await import("../src/ai/subagent-cards");
    const { CollapsibleTrigger } = await collapsible();
    const tree = SubagentResultCard({ title: "Research", summary: "Done" } as never) as unknown as Element;
    expect(elements(tree).some((e) => e.type === CollapsibleTrigger)).toBe(false);
  });
});

describe("Message bot label", () => {
  it("draws the bot name and avatar above the content for assistant messages only", async () => {
    const { Message, MessageBotLabel } = await import("../src/ai/message");
    const avatar = { type: "Avatar", props: {} };
    const assistant = Message({ from: "assistant", bot: { name: "Planner", avatar }, children: "x" } as never) as unknown as Element;
    const label = elements(assistant).find((e) => e.type === MessageBotLabel)!;
    expect(label.props).toMatchObject({ name: "Planner", avatar });
    const user = Message({ from: "user", bot: { name: "Planner" }, children: "x" } as never) as unknown as Element;
    expect(elements(user).some((e) => e.type === MessageBotLabel)).toBe(false);
    const none = Message({ from: "assistant", children: "x" } as never) as unknown as Element;
    expect(elements(none).some((e) => e.type === MessageBotLabel)).toBe(false);
  });

  it("is labelled From {name}", async () => {
    const { MessageBotLabel } = await import("../src/ai/message");
    const tree = MessageBotLabel({ name: "Planner" }) as unknown as Element;
    expect(tree.props).toMatchObject({ testID: "message-bot-label", accessible: true, accessibilityLabel: "From Planner" });
  });
});

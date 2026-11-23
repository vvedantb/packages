import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Shared element transitions: the kit builder, the tag helper and the Reduce
// Motion fallback of `SharedTransitionView` and `SharedTransitionText`.

const motion = vi.hoisted(() => ({ reduce: false }));

vi.mock("react-native", () => ({ View: "View", Text: "Text" }));
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => motion.reduce }));
vi.mock("react-native-reanimated", () => {
  /** Records each modifier call, as the real chainable `SharedTransition` builder does. */
  class SharedTransition {
    calls: Array<[string, unknown]> = [];
    private record(name: string, arg?: unknown) {
      this.calls.push([name, arg]);
      return this;
    }
    static springify(duration?: number) {
      return new SharedTransition().springify(duration);
    }
    springify(duration?: number) {
      return this.record("springify", duration);
    }
    dampingRatio(value: number) {
      return this.record("dampingRatio", value);
    }
    reduceMotion(value: string) {
      return this.record("reduceMotion", value);
    }
    fadeContent(config?: unknown) {
      return this.record("fadeContent", config);
    }
  }
  return {
    default: { View: "Animated.View", Text: "Animated.Text" },
    ReduceMotion: { System: "system", Always: "always", Never: "never" },
    SharedTransition,
  };
});

const {
  DEFAULT_SHARED_TRANSITION,
  DEFAULT_FADE_CONTENT,
  SharedTransitionText,
  SharedTransitionView,
  createSharedTransition,
  sharedTransitionTag,
  useSharedTransitionStyle,
} = await import("../src/SharedTransition");

const calls = (builder: unknown) => (builder as { calls: Array<[string, unknown]> }).calls;
const call = (builder: unknown, name: string) => calls(builder).find(([key]) => key === name)?.[1];

beforeEach(() => {
  motion.reduce = false;
});

describe("default shared transition", () => {
  it("is a critically damped spring that follows the system Reduce Motion setting and fades content", () => {
    expect(calls(DEFAULT_SHARED_TRANSITION).map(([name]) => name)).toEqual(["springify", "dampingRatio", "reduceMotion", "fadeContent"]);
    expect(call(DEFAULT_SHARED_TRANSITION, "springify")).toBe(280);
    expect(call(DEFAULT_SHARED_TRANSITION, "dampingRatio")).toBe(1);
    expect(call(DEFAULT_SHARED_TRANSITION, "reduceMotion")).toBe("system");
    expect(call(DEFAULT_SHARED_TRANSITION, "fadeContent")).toEqual({ fadeOut: { end: 0.55 }, fadeIn: { duration: 180 } });
    expect(call(DEFAULT_SHARED_TRANSITION, "fadeContent")).toBe(DEFAULT_FADE_CONTENT);
  });

  it("is rebuilt per call by createSharedTransition, with overrides", () => {
    const custom = createSharedTransition({ duration: 250, dampingRatio: 0.9, fadeContent: { fadeIn: { duration: 100 } } });
    expect(custom).not.toBe(DEFAULT_SHARED_TRANSITION);
    expect(call(custom, "springify")).toBe(250);
    expect(call(custom, "dampingRatio")).toBe(0.9);
    expect(call(custom, "fadeContent")).toEqual({ fadeIn: { duration: 100 } });
    // Reduce Motion stays on, whatever the overrides.
    expect(call(custom, "reduceMotion")).toBe("system");
    expect(createSharedTransition()).not.toBe(createSharedTransition());
  });

  it("leaves out fadeContent when it is false, and still applies Reduce Motion", () => {
    const plain = createSharedTransition({ fadeContent: false });
    expect(calls(plain).map(([name]) => name)).toEqual(["springify", "dampingRatio", "reduceMotion"]);
  });
});

describe("sharedTransitionTag", () => {
  it("is stable per id, namespaced, and different for different ids", () => {
    expect(sharedTransitionTag("card-1")).toBe(sharedTransitionTag("card-1"));
    expect(sharedTransitionTag("card-1")).toBe("nui:card-1");
    expect(sharedTransitionTag("card-1")).not.toBe(sharedTransitionTag("card-2"));
  });
});

describe("useSharedTransitionStyle", () => {
  it("returns the default builder, or undefined with Reduce Motion", () => {
    expect(useSharedTransitionStyle()).toBe(DEFAULT_SHARED_TRANSITION);
    motion.reduce = true;
    expect(useSharedTransitionStyle()).toBeUndefined();
  });
});

describe("SharedTransitionView and SharedTransitionText", () => {
  const view = () => SharedTransitionView({ tag: "card-1", testID: "card", style: { height: 40 }, children: "x" }) as ReactElement<Record<string, unknown>>;
  const text = () => SharedTransitionText({ tag: "title-1", testID: "title", children: "x" }) as ReactElement<Record<string, unknown>>;

  it("tags an Animated.View and passes style and testID through", () => {
    const element = view();
    expect(element.type).toBe("Animated.View");
    expect(element.props.sharedTransitionTag).toBe("nui:card-1");
    expect(element.props.sharedTransitionStyle).toBe(DEFAULT_SHARED_TRANSITION);
    expect(element.props.testID).toBe("card");
    expect(element.props.style).toEqual({ height: 40 });
  });

  it("tags an Animated.Text", () => {
    const element = text();
    expect(element.type).toBe("Animated.Text");
    expect(element.props.sharedTransitionTag).toBe("nui:title-1");
    expect(element.props.sharedTransitionStyle).toBe(DEFAULT_SHARED_TRANSITION);
  });

  it("omits the shared props with Reduce Motion and renders a plain View or Text", () => {
    motion.reduce = true;
    const element = view();
    expect(element.type).toBe("View");
    expect("sharedTransitionTag" in element.props).toBe(false);
    expect("sharedTransitionStyle" in element.props).toBe(false);
    expect(element.props.testID).toBe("card");
    expect(element.props.style).toEqual({ height: 40 });

    const label = text();
    expect(label.type).toBe("Text");
    expect("sharedTransitionTag" in label.props).toBe(false);
    expect("sharedTransitionStyle" in label.props).toBe(false);
  });
});

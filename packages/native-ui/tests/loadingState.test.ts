import { createElement, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cssEaseInOut,
  DRIVE_CYCLE_MS,
  DRIVE_DELAYS,
  DRIVE_IDLE_OPACITY,
  driveCellOpacity,
} from "../src/loadingGrid";
import { tokens } from "../src/tokens";

// `LoadingState` (root and `/primitives`): the web `LoadingState` Drive grid,
// `iconOnly`. The timing is the web WAAPI pulse; the grid runs it on the UI
// thread off one frame clock.

const motion = vi.hoisted(() => ({ reduce: false }));
const frames = vi.hoisted(() => ({ callbacks: [] as Array<(frame: { timeSinceFirstFrame: number }) => void> }));
const clock = vi.hoisted(() => ({ value: 0 }));

vi.mock("react-native", () => ({ View: "View" }));
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), useContext: () => 0 }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => motion.reduce }));
vi.mock("react-native-reanimated", () => ({
  default: { View: "Animated.View" },
  useSharedValue: () => ({ get: () => clock.value, set: (next: number) => (clock.value = next) }),
  useFrameCallback: (callback: (frame: { timeSinceFirstFrame: number }) => void) => {
    frames.callbacks.push(callback);
  },
  useAnimatedStyle: (updater: () => object) => updater(),
}));

const { LoadingState } = await import("../src/LoadingState");

type Props = { style?: unknown; children?: ReactNode; accessibilityLabel?: string; accessibilityRole?: string };

/** Renders function parts down to host elements ("View", "Animated.View"). */
function render(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map(render);
  if (!isValidElement<Props>(node)) return node;
  if (typeof node.type === "function") return render(node.type(node.props));
  return createElement(node.type, { ...node.props, children: render(node.props.children) });
}

function hosts(node: ReactNode, type: string): Props[] {
  if (Array.isArray(node)) return node.flatMap((child) => hosts(child, type));
  if (!isValidElement<Props>(node)) return [];
  return [...(node.type === type ? [node.props] : []), ...hosts(node.props.children, type)];
}

function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return typeof style === "object" && style !== null ? { ...style } : {};
}

beforeEach(() => {
  motion.reduce = false;
  frames.callbacks = [];
  clock.value = 0;
});

describe("Drive timing (the web PATTERNS.Drive)", () => {
  it("delays each cell by column plus distance from the middle row, so the front is a chevron", () => {
    expect(DRIVE_DELAYS).toEqual([90, 180, 270, 0, 90, 180, 90, 180, 270]);
  });

  it("holds a cell at 0.15 during its delay, then pulses 0.12 -> 1 -> 0.12 every 650 ms", () => {
    expect(driveCellOpacity(89, 90)).toBe(DRIVE_IDLE_OPACITY);
    expect(driveCellOpacity(90, 90)).toBeCloseTo(0.12);
    expect(driveCellOpacity(90 + DRIVE_CYCLE_MS / 2, 90)).toBeCloseTo(1);
    expect(driveCellOpacity(90 + DRIVE_CYCLE_MS * 3, 90)).toBeCloseTo(0.12);
    expect(driveCellOpacity(100, 0)).toBeCloseTo(driveCellOpacity(100 + DRIVE_CYCLE_MS * 7, 0));
    // Each half eases the same way, so the fall mirrors the rise.
    expect(driveCellOpacity(200, 0)).toBeCloseTo(driveCellOpacity(DRIVE_CYCLE_MS - 200, 0));
  });

  it("eases each half with CSS ease-in-out, cubic-bezier(0.42, 0, 0.58, 1)", () => {
    expect(cssEaseInOut(0)).toBe(0);
    expect(cssEaseInOut(0.5)).toBeCloseTo(0.5);
    expect(cssEaseInOut(0.25)).toBeCloseTo(0.1291, 3);
    expect(cssEaseInOut(1)).toBe(1);
  });
});

describe("LoadingState", () => {
  it("is a busy progress bar named Working, as the web role=status label", () => {
    const [root] = hosts(render(createElement(LoadingState, {})), "View");
    expect(root).toMatchObject({ accessibilityRole: "progressbar", accessibilityLabel: "Working" });
    const [named] = hosts(render(createElement(LoadingState, { label: "Building" })), "View");
    expect(named?.accessibilityLabel).toBe("Building");
  });

  it("pulses nine cells off one frame clock, each at its own delay", () => {
    const tree = render(createElement(LoadingState, { size: "sm" }));
    expect(frames.callbacks).toHaveLength(1);
    const cells = hosts(tree, "Animated.View").map((cell) => flat(cell.style));
    expect(cells).toHaveLength(9);
    // `sm`: the web 3 pt cell with the 0.5 radius, in the muted text colour.
    expect(cells[0]).toMatchObject({ width: 3, height: 3, borderRadius: 0.5, backgroundColor: tokens.color.muted.light });
    // Mount (0 ms): only the middle row's left cell has no delay.
    expect(cells.map((cell) => cell.opacity)).toEqual(DRIVE_DELAYS.map((delay) => driveCellOpacity(0, delay)));

    frames.callbacks[0]?.({ timeSinceFirstFrame: 400 });
    const later = hosts(render(createElement(LoadingState, { size: "sm" })), "Animated.View");
    expect(later.map((cell) => flat(cell.style).opacity)).toEqual(DRIVE_DELAYS.map((delay) => driveCellOpacity(400, delay)));
  });

  it("colours each column from colors, left to right, as the web column colours", () => {
    const tree = render(createElement(LoadingState, { size: "sm", colors: ["#8B3FB8", "#6360c9", "#3B7DD8"] }));
    const cells = hosts(tree, "Animated.View").map((cell) => flat(cell.style).backgroundColor);
    expect(cells).toEqual(["#8B3FB8", "#6360c9", "#3B7DD8", "#8B3FB8", "#6360c9", "#3B7DD8", "#8B3FB8", "#6360c9", "#3B7DD8"]);
  });

  it("holds a still chevron with Reduce Motion or paused, and runs no clock", () => {
    for (const setup of [() => (motion.reduce = true), () => undefined]) {
      frames.callbacks = [];
      setup();
      const tree = render(createElement(LoadingState, { paused: !motion.reduce, color: "#123456" }));
      expect(frames.callbacks).toHaveLength(0);
      expect(hosts(tree, "Animated.View")).toHaveLength(0);
      const cells = hosts(tree, "View")
        .map((cell) => flat(cell.style))
        .filter((style) => style.backgroundColor === "#123456");
      expect(cells).toHaveLength(9);
      const opacity = cells.map((cell) => Number(cell.opacity));
      // The middle row reads bright on the left, dim on the right.
      expect(opacity[3]).toBeGreaterThan(opacity[4] ?? 1);
      expect(opacity[4]).toBeGreaterThan(opacity[5] ?? 1);
    }
  });
});

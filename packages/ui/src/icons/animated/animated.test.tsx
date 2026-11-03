// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MotionProvider } from "../../motion/motion-provider";
import * as root from "../../index";
import * as animated from "./index";
import {
  AnimatedBellIcon,
  AnimatedCounter,
  AnimatedKeyIcon,
  AnimatedNotificationIcon,
  AnimatedProgress,
  AnimatedStatusDot,
  MorphingMenuIcon,
  MorphingMicIcon,
  PulsingRings,
  type NotificationIconType,
  type StatusDotPhase,
} from "./index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let reactRoot: Root | null = null;
let host: HTMLElement | null = null;

async function render(node: ReactNode): Promise<HTMLElement> {
  if (!host) {
    host = document.createElement("div");
    document.body.appendChild(host);
    reactRoot = createRoot(host);
  }
  await act(async () => reactRoot?.render(node));
  return host;
}

afterEach(async () => {
  await act(async () => reactRoot?.unmount());
  host?.remove();
  reactRoot = null;
  host = null;
});

const NAMES = [
  "AnimatedBellIcon", "AnimatedCounter", "AnimatedKeyIcon", "AnimatedNotificationIcon", "AnimatedProgress",
  "AnimatedStatusDot", "MorphingMenuIcon", "MorphingMicIcon", "PulsingRings",
];

describe("animated icons", () => {
  it("exports these from @vvedantb/ui/icons/animated only (not the root)", () => {
    expect(Object.keys(animated).sort()).toEqual([...NAMES].sort());
    for (const name of NAMES) expect(root, name).not.toHaveProperty(name);
  });

  it("render an svg with and without the app's MotionProvider", async () => {
    const all = (
      <>
        <AnimatedBellIcon />
        <AnimatedKeyIcon />
        <AnimatedProgress value={40} />
        <AnimatedStatusDot phase="idle" />
        <MorphingMenuIcon isOpen={false} />
        <MorphingMicIcon isListening={false} />
        <div className="relative"><PulsingRings size={40} /></div>
      </>
    );
    for (const node of [all, <MotionProvider>{all}</MotionProvider>]) {
      const el = await render(node);
      expect(el.querySelectorAll("svg").length).toBeGreaterThanOrEqual(8);
      for (const svg of el.querySelectorAll("svg")) {
        expect(svg.closest("[aria-hidden='true']"), svg.outerHTML.slice(0, 60)).not.toBeNull();
      }
    }
  });

  it.each(["success", "warning", "error", "info"] as NotificationIconType[])(
    "AnimatedNotificationIcon renders the %s icon",
    async (type) => {
      const el = await render(<AnimatedNotificationIcon type={type} size={18} className="n" />);
      const wrap = el.querySelector(".n")!;
      expect(wrap.getAttribute("data-type")).toBe(type);
      const svg = wrap.querySelector("svg")!;
      expect(svg.getAttribute("width")).toBe("18");
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.innerHTML).toContain(
        { success: "--color-success", warning: "--color-warning", error: "--color-danger", info: "--color-primary" }[type],
      );
    },
  );

  it("AnimatedNotificationIcon color overrides the token", async () => {
    const el = await render(<AnimatedNotificationIcon type="success" color="red" />);
    expect(el.innerHTML).toContain('stroke="red"');
  });

  it("MorphingMenuIcon toggles open and closed", async () => {
    let el = await render(<MorphingMenuIcon isOpen={false} />);
    expect(el.querySelector("svg")!.getAttribute("data-state")).toBe("closed");
    expect(el.querySelectorAll("line")).toHaveLength(3);
    el = await render(<MorphingMenuIcon isOpen />);
    expect(el.querySelector("svg")!.getAttribute("data-state")).toBe("open");
    el = await render(<MorphingMenuIcon isOpen={false} />);
    expect(el.querySelector("svg")!.getAttribute("data-state")).toBe("closed");
  });

  it("MorphingMicIcon toggles listening", async () => {
    let el = await render(<MorphingMicIcon isListening={false} size={24} />);
    expect(el.querySelector("span")!.getAttribute("data-state")).toBe("idle");
    expect(el.querySelector("[data-slot='mic']")).not.toBeNull();
    expect(el.querySelector("[data-slot='stop']")).not.toBeNull();
    el = await render(<MorphingMicIcon isListening size={24} />);
    expect(el.querySelector("span")!.getAttribute("data-state")).toBe("listening");
  });

  it("AnimatedBellIcon draws the mute slash only when muted", async () => {
    let el = await render(<AnimatedBellIcon />);
    expect(el.querySelector("[data-slot='mute-slash']")).not.toBeNull();
    el = await render(<AnimatedBellIcon muted={false} />);
    expect(el.querySelector("[data-slot='mute-slash']")).toBeNull();
  });

  it.each(["idle", "listening", "thinking", "speaking", "error"] as StatusDotPhase[])(
    "AnimatedStatusDot renders %s",
    async (phase) => {
      const el = await render(<AnimatedStatusDot phase={phase} size={8} />);
      const svg = el.querySelector("svg")!;
      expect(svg.getAttribute("data-phase")).toBe(phase);
      expect(svg.getAttribute("width")).toBe("24");
      const circles = svg.querySelectorAll("circle").length;
      expect(circles).toBe(phase === "listening" ? 5 : phase === "speaking" ? 2 : 1);
    },
  );

  it("AnimatedProgress is a progressbar with a clamped value and per-instance gradient ids", async () => {
    const el = await render(<><AnimatedProgress value={140} label="Upload" /><AnimatedProgress value={-5} /></>);
    const bars = el.querySelectorAll("[role='progressbar']");
    expect(bars[0]!.getAttribute("aria-valuenow")).toBe("100");
    expect(bars[0]!.getAttribute("aria-label")).toBe("Upload");
    expect(bars[1]!.getAttribute("aria-valuenow")).toBe("0");
    const ids = [...el.querySelectorAll("linearGradient")].map((g) => g.id);
    expect(new Set(ids).size).toBe(4);
  });

  it("PulsingRings renders ringCount rings, and nothing when inactive", async () => {
    let el = await render(<PulsingRings size={40} ringCount={4} />);
    expect(el.querySelectorAll("circle")).toHaveLength(4);
    el = await render(<PulsingRings size={40} active={false} />);
    expect(el.querySelector("svg")).toBeNull();
  });

  it("AnimatedCounter renders a tabular-nums span", async () => {
    const el = await render(<AnimatedCounter value={1200} animateOnView={false} className="c" />);
    const span = el.querySelector("span.c")!;
    expect(span.className).toContain("tabular-nums");
    expect(span.textContent).toMatch(/^\d/);
  });
});

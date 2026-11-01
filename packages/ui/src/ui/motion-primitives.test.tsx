// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LazyMotion, domAnimation } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSmoothText } from "../markdown/useSmoothText";
import { RollingNumber } from "./rolling-number";
import { SendQueueIcon } from "./send-queue-icon";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  vi.useRealTimers();
});

async function mount(node: ReactNode): Promise<HTMLDivElement> {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<LazyMotion features={domAnimation}>{node}</LazyMotion>));
  return host;
}

async function update(node: ReactNode): Promise<void> {
  await act(async () => root?.render(<LazyMotion features={domAnimation}>{node}</LazyMotion>));
}

function Smooth({ text, live }: { text: string; live: boolean }) {
  return <p data-testid="out">{useSmoothText(text, live)}</p>;
}

function shown(container: HTMLElement): number {
  return container.querySelector("[data-testid=out]")?.textContent?.length ?? 0;
}

describe("useSmoothText", () => {
  it("shows text present on mount at once", async () => {
    const container = await mount(<Smooth text="hello world" live />);
    expect(shown(container)).toBe(11);
  });

  it("eases a burst in over frames, then catches up", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    const container = await mount(<Smooth text="" live />);
    await update(<Smooth text={"x".repeat(400)} live />);
    await act(async () => vi.advanceTimersByTime(16));
    const first = shown(container);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(400);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(shown(container)).toBe(400);
  });

  it("shows everything at once when the stream ends", async () => {
    const container = await mount(<Smooth text="" live />);
    await update(<Smooth text={"y".repeat(300)} live={false} />);
    expect(shown(container)).toBe(300);
  });
});

describe("RollingNumber", () => {
  it("keeps the full value for screen readers and rolls each digit", async () => {
    const container = await mount(<RollingNumber value="1m 05s" />);
    expect(container.querySelector(".sr-only")?.textContent).toBe("1m 05s");
    // One ten-row column per digit: 1, 0, 5.
    expect(container.querySelectorAll(".flex-col")).toHaveLength(3);
  });
});

describe("SendQueueIcon", () => {
  it("draws the same three lines in both states", async () => {
    const container = await mount(<SendQueueIcon queued={false} />);
    expect(container.querySelectorAll("line")).toHaveLength(3);
    await update(<SendQueueIcon queued />);
    expect(container.querySelectorAll("line")).toHaveLength(3);
  });
});

// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MotionProvider } from "../motion/motion-provider";
import { Shimmer } from "./shimmer";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode): Promise<HTMLDivElement> {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<MotionProvider>{node}</MotionProvider>));
  return host;
}

async function rerender(node: ReactNode): Promise<void> {
  await act(async () => root?.render(<MotionProvider>{node}</MotionProvider>));
}

function shimmerNode(container: HTMLElement): Element {
  const node = container.querySelector("[class*='bg-clip-text']");
  if (!node) throw new Error("shimmer root not found");
  return node;
}

describe("Shimmer (gradient)", () => {
  it("keeps the same DOM node when the parent re-renders", async () => {
    const container = await mount(<Shimmer duration={2}>Thinking...</Shimmer>);
    const first = shimmerNode(container);

    // Re-render the parent with the same props, as a streaming response does
    // on every token. The gradient sweep must not restart, so the node must
    // be the same instance, not a remount.
    await rerender(<Shimmer duration={2}>Thinking...</Shimmer>);
    const second = shimmerNode(container);

    expect(second).toBe(first);
  });
});

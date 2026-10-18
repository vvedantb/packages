// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SlideOverPanel } from "./slide-over-panel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

describe("SlideOverPanel", () => {
  it("renders header and children when open", async () => {
    await mount(
      <SlideOverPanel open onClose={() => {}} header={<h2>Head</h2>}>
        <p>Body</p>
      </SlideOverPanel>,
    );
    expect(document.body.textContent).toContain("Head");
    expect(document.body.textContent).toContain("Body");
    expect(document.body.innerHTML).toContain("absolute top-0 right-0 bottom-0 w-96 z-20");
  });

  it("renders nothing when closed", async () => {
    await mount(
      <SlideOverPanel open={false} onClose={() => {}} header="Head">
        Body
      </SlideOverPanel>,
    );
    expect(document.body.textContent).toBe("");
  });

  it("calls onClose from the close button", async () => {
    const onClose = vi.fn();
    await mount(
      <SlideOverPanel open onClose={onClose} header="Head">
        Body
      </SlideOverPanel>,
    );
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="Close panel"]');
    await act(async () => button?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionsHoverCard } from "./SessionsHoverCard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

async function mount(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  document.body.innerHTML = "";
  root = null;
  host = null;
});

describe("SessionsHoverCard", () => {
  it("renders header, body and footer slots when open", async () => {
    await mount(
      <SessionsHoverCard open header="Head" body="Body text" footer="Foot">
        <button type="button">Row</button>
      </SessionsHoverCard>,
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("Row");
    expect(text).toContain("Head");
    expect(text).toContain("Body text");
    expect(text).toContain("Foot");
    expect(document.body.innerHTML).toContain("w-64");
  });

  it("does not call the body render prop or loadContent while closed", async () => {
    const body = vi.fn(() => "x");
    const loadContent = vi.fn(() => "y");
    await mount(
      <>
        <SessionsHoverCard open={false} body={body}>
          <button type="button">A</button>
        </SessionsHoverCard>
        <SessionsHoverCard open={false} loadContent={loadContent}>
          <button type="button">B</button>
        </SessionsHoverCard>
      </>,
    );
    expect(body).not.toHaveBeenCalled();
    expect(loadContent).not.toHaveBeenCalled();
  });

  it("calls the render prop with open true and loads content once when open", async () => {
    const body = vi.fn((ctx: { open: boolean }) => `open=${ctx.open}`);
    const loadContent = vi.fn(async () => "Loaded preview");
    await mount(
      <>
        <SessionsHoverCard open body={body}>
          <button type="button">A</button>
        </SessionsHoverCard>
        <SessionsHoverCard open loadContent={loadContent} loadingFallback="Loading">
          <button type="button">B</button>
        </SessionsHoverCard>
      </>,
    );
    expect(body).toHaveBeenCalledWith({ open: true });
    expect(document.body.textContent).toContain("open=true");
    expect(loadContent).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Loaded preview");
  });
});

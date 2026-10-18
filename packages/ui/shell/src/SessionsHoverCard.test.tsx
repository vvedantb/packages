// @vitest-environment happy-dom
import { act, createRef } from "react";
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

  it("portals the content to document.body by default", async () => {
    await mount(
      <div id="clip" style={{ overflow: "hidden" }}>
        <SessionsHoverCard open body="Body text">
          <button type="button">Row</button>
        </SessionsHoverCard>
      </div>,
    );
    const content = document.querySelector("[data-radix-popper-content-wrapper]");
    expect(content).not.toBeNull();
    expect(document.getElementById("clip")!.contains(content)).toBe(false);
    expect(document.body.textContent).toContain("Body text");
  });

  it("keeps the content in place with portal={false}", async () => {
    await mount(
      <div id="clip" style={{ overflow: "hidden" }}>
        <SessionsHoverCard open portal={false} body="Body text">
          <button type="button">Row</button>
        </SessionsHoverCard>
      </div>,
    );
    const content = document.querySelector("[data-radix-popper-content-wrapper]");
    expect(document.getElementById("clip")!.contains(content)).toBe(true);
  });

  it("swaps the surface without keeping the default one", async () => {
    await mount(
      <>
        <SessionsHoverCard open surface="glass" body="G" className="p-5">
          <button type="button">A</button>
        </SessionsHoverCard>
      </>,
    );
    const card = document.querySelector("[data-state=open][data-side]") as HTMLElement;
    expect(card.className).toContain("glass-panel-strong");
    expect(card.className).toContain("rounded-surface");
    expect(card.className).not.toContain("bg-overlay");
    expect(card.className).not.toContain("rounded-lg");
    expect(card.className).toContain("p-5");
    expect(card.className).not.toContain("p-3");
  });

  it("uses the floating overlay surface by default", async () => {
    await mount(
      <SessionsHoverCard open body="B">
        <button type="button">A</button>
      </SessionsHoverCard>,
    );
    const card = document.querySelector("[data-state=open][data-side]") as HTMLElement;
    expect(card.className).toContain("bg-overlay");
    expect(card.className).toContain("rounded-lg");
  });

  it("forwards the ref and props to the child trigger and keeps its handlers", async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    await mount(
      <SessionsHoverCard ref={ref as never} data-testid="row" body="B">
        <button type="button" onClick={onClick}>
          Row
        </button>
      </SessionsHoverCard>,
    );
    const button = document.querySelector("button") as HTMLButtonElement;
    expect(ref.current).toBe(button);
    expect(button.getAttribute("data-testid")).toBe("row");
    await act(async () => button.click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders its own trigger element with asChild={false}", async () => {
    await mount(
      <SessionsHoverCard asChild={false} body="B">
        <span>Row</span>
      </SessionsHoverCard>,
    );
    const trigger = document.querySelector("[data-state]") as HTMLElement;
    expect(trigger.tagName).toBe("A");
    expect(trigger.textContent).toBe("Row");
  });

  describe("focus and pointer", () => {
    function setFocusVisible(el: HTMLElement, value: boolean) {
      const orig = el.matches.bind(el);
      el.matches = (sel: string) => (sel === ":focus-visible" ? value : orig(sel));
    }

    it("does not open on pointer-driven focus after a context menu", async () => {
      const onOpenChange = vi.fn();
      await mount(
        <SessionsHoverCard openDelay={0} header="Head" onOpenChange={onOpenChange}>
          <button type="button">Row</button>
        </SessionsHoverCard>,
      );
      const row = document.querySelector("button")!;
      setFocusVisible(row, false);
      await act(async () => {
        row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
        row.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
        row.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      });
      await act(async () => new Promise((r) => setTimeout(r, 20)));
      expect(onOpenChange).not.toHaveBeenCalledWith(true);
      expect(document.body.textContent).not.toContain("Head");
    });

    it("opens on keyboard focus-visible", async () => {
      const onOpenChange = vi.fn();
      await mount(
        <SessionsHoverCard openDelay={0} header="Head" onOpenChange={onOpenChange}>
          <button type="button">Row</button>
        </SessionsHoverCard>,
      );
      const row = document.querySelector("button")!;
      setFocusVisible(row, true);
      await act(async () => {
        row.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      });
      await act(async () => new Promise((r) => setTimeout(r, 20)));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it("closes on pointer leave while focus stays on the trigger", async () => {
      const onOpenChange = vi.fn();
      await mount(
        <SessionsHoverCard defaultOpen header="Head" onOpenChange={onOpenChange}>
          <button type="button">Row</button>
        </SessionsHoverCard>,
      );
      const row = document.querySelector("button")!;
      row.focus();
      await act(async () => {
        row.dispatchEvent(new PointerEvent("pointerout", { pointerType: "mouse", bubbles: true, relatedTarget: null }));
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      await act(async () => new Promise((r) => setTimeout(r, 20)));
      expect(document.body.textContent).not.toContain("Head");
    });
  });
});

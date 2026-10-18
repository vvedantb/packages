// @vitest-environment happy-dom
import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolbarSearchInput } from "./toolbar-search-input";

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

describe("ToolbarSearchInput", () => {
  it("clears via onChange without focusing the input", async () => {
    const onChange = vi.fn();
    const ref = createRef<HTMLInputElement>();
    await mount(<ToolbarSearchInput ref={ref} value="abc" onChange={onChange} />);
    const clear = document.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]');
    expect(clear?.getAttribute("aria-hidden")).toBe("false");
    await act(async () => clear?.click());
    expect(onChange).toHaveBeenCalledWith("");
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(document.activeElement).not.toBe(ref.current);
  });

  it("hides the clear button while the value is blank", async () => {
    await mount(<ToolbarSearchInput value="  " onChange={() => {}} />);
    const clear = document.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]');
    expect(clear?.getAttribute("aria-hidden")).toBe("true");
    expect(clear?.tabIndex).toBe(-1);
    expect(clear?.className).toContain("pointer-events-none opacity-0");
  });
});

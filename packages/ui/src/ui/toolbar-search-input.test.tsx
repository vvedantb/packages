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
  it("renders SearchInput variant toolbar with its old defaults and class props", async () => {
    const ref = createRef<HTMLInputElement>();
    await mount(
      <ToolbarSearchInput ref={ref} value="" onChange={() => {}} className="wrap-x" inputClassName="input-x" />,
    );
    const input = ref.current;
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input?.getAttribute("aria-label")).toBe("Search");
    expect(input?.placeholder).toBe("Search...");
    expect(input?.className).toContain("rounded-field");
    expect(input?.className).toContain("bg-transparent");
    expect(input?.className).toContain("input-x");
    expect(input?.parentElement?.className).toContain("wrap-x");
  });

  it("clears via onChange without focusing the input", async () => {
    const onChange = vi.fn();
    const ref = createRef<HTMLInputElement>();
    await mount(<ToolbarSearchInput ref={ref} value="abc" onChange={onChange} />);
    const clear = document.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]');
    await act(async () => clear?.click());
    expect(onChange).toHaveBeenCalledWith("");
    expect(document.activeElement).not.toBe(ref.current);
  });
});

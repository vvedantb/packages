// @vitest-environment happy-dom
import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchInput } from "./search-input";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return {
    rerender: (next: ReactNode) => act(async () => created.render(next)),
  };
}

function input() {
  const el = document.querySelector("input");
  if (!el) throw new Error("no input");
  return el;
}

const clearButton = () => document.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]');
const kbd = () => document.querySelector("kbd");

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

describe("SearchInput", () => {
  it("defaults the label to Search and uses it as aria-label and placeholder", async () => {
    await mount(<SearchInput value="" onChange={() => {}} />);
    expect(input().getAttribute("aria-label")).toBe("Search");
    expect(input().placeholder).toBe("Search");
    expect(input().getAttribute("enterkeyhint")).toBe("search");
  });

  it("uses label for both, and placeholder only when given", async () => {
    const { rerender } = await mount(<SearchInput value="" onChange={() => {}} label="Find files" />);
    expect(input().getAttribute("aria-label")).toBe("Find files");
    expect(input().placeholder).toBe("Find files");
    await rerender(<SearchInput value="" onChange={() => {}} label="Find files" placeholder="Name..." />);
    expect(input().getAttribute("aria-label")).toBe("Find files");
    expect(input().placeholder).toBe("Name...");
  });

  it("forwards the ref and other input props", async () => {
    const ref = createRef<HTMLInputElement>();
    const onKeyDown = vi.fn();
    await mount(<SearchInput ref={ref} value="" onChange={() => {}} name="q" id="q" onKeyDown={onKeyDown} />);
    expect(ref.current).toBe(input());
    expect(input().name).toBe("q");
    expect(input().id).toBe("q");
    await act(async () => input().dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true })));
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("shows the clear button only with text, and clearing calls onChange('')", async () => {
    const onChange = vi.fn();
    const { rerender } = await mount(<SearchInput value="" onChange={onChange} />);
    expect(clearButton()).toBeNull();
    await rerender(<SearchInput value="abc" onChange={onChange} />);
    await act(async () => clearButton()?.click());
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("shows the shortcut hint only while empty", async () => {
    const { rerender } = await mount(<SearchInput value="" onChange={() => {}} shortcut="⌘K" />);
    expect(kbd()?.textContent).toBe("⌘K");
    await rerender(<SearchInput value="a" onChange={() => {}} shortcut="⌘K" />);
    expect(kbd()).toBeNull();
    expect(clearButton()).not.toBeNull();
  });

  it("sizes sm by default and md on request", async () => {
    const { rerender } = await mount(<SearchInput value="" onChange={() => {}} />);
    expect(input().className).toContain("h-8");
    await rerender(<SearchInput value="" onChange={() => {}} size="md" />);
    expect(input().className).toContain("h-10");
    expect(input().className).not.toContain("h-8");
  });

  it("toolbar variant is transparent with rounded-field and the light focus ring", async () => {
    await mount(<SearchInput value="" onChange={() => {}} variant="toolbar" />);
    const classes = input().className.split(" ");
    expect(classes).toEqual(
      expect.arrayContaining(["rounded-field", "bg-transparent", "hover:bg-default", "sm:w-44", "md:w-52", "focus-visible:ring-1"]),
    );
    expect(classes).not.toContain("rounded-lg");
    expect(classes).not.toContain("focus-visible:ring-2");
    expect(classes).not.toContain("bg-field-background");
    expect(input().parentElement?.className).toContain("flex-1");
  });
});

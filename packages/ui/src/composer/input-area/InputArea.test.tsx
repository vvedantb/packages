// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InputArea, type InputAreaProps } from "./InputArea";
import { normaliseSelection, placeCaretAtEnd } from "./InputAreaEditor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

async function mount(props: InputAreaProps) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<InputArea {...props} />);
  });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = host = null;
});

const editor = () => document.querySelector("[data-slot=input-group-control]") as HTMLElement;
const submit = () => document.querySelector('button[type="submit"]') as HTMLButtonElement;

async function type(text: string) {
  await act(async () => {
    const el = editor();
    el.appendChild(document.createTextNode(text));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function key(init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  editor().dispatchEvent(event);
  return event;
}

describe("InputArea", () => {
  it("keeps the slash anchor and disables send while empty", async () => {
    await mount({});
    expect(document.querySelector("[data-composer-slash-anchor]")).not.toBeNull();
    expect(submit().disabled).toBe(true);
  });

  it("enables send once there is text, and submits trimmed text", async () => {
    const onSubmit = vi.fn();
    await mount({ onSubmit });
    await type("  hello  ");
    expect(submit().disabled).toBe(false);
    await act(async () => {
      submit().form!.requestSubmit();
    });
    expect(onSubmit).toHaveBeenCalledWith("hello");
    expect(editor().textContent?.replaceAll("\u200b", "")).toBe("");
  });

  it("enables send for chips alone", async () => {
    await mount({ chipCount: 1 });
    expect(submit().disabled).toBe(false);
  });

  it("honours a canSubmit override", async () => {
    await mount({ canSubmit: true });
    expect(submit().disabled).toBe(false);
  });

  it("shows the stop button only while streaming", async () => {
    await mount({ isStreaming: true });
    expect(document.querySelector('[aria-label="Stop generating"]')).not.toBeNull();
  });

  describe("prediction", () => {
    it("shows ghost text through data-suggestion in inline mode", async () => {
      await mount({ getPrediction: async () => "and then some" });
      await type("a draft long enough to predict");
      await act(async () => {
        await new Promise((r) => setTimeout(r, 650));
      });
      expect(editor().getAttribute("data-suggestion")).toBe(" and then some");
    });

    it("applies predictionTextClassName to the ghost text in inline mode", async () => {
      const style = document.createElement("style");
      style.textContent = ".ghost-test { color: rgb(1, 2, 3); }";
      document.head.appendChild(style);
      try {
        await mount({
          getPrediction: async () => "and then some",
          predictionTextClassName: "ghost-test",
        });
        await type("a draft long enough to predict");
        await act(async () => {
          await new Promise((r) => setTimeout(r, 650));
        });
        const probe = document.querySelector("[data-composer-ghost-probe] > span");
        expect(probe?.className).toBe("ghost-test");
        expect(editor().className).toContain("var(--composer-ghost-color");
        expect(editor().style.getPropertyValue("--composer-ghost-color")).toBe("rgb(1, 2, 3)");
      } finally {
        style.remove();
      }
    });

    it("applies predictionTextClassName to the overlay span when chips are on top", async () => {
      await mount({
        getPrediction: async () => "and then some",
        chipsPlacement: "top",
        predictionTextClassName: "text-muted-foreground",
      });
      await act(async () => {
        const ta = document.querySelector("textarea") as HTMLTextAreaElement;
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
          ta,
          "a draft long enough to predict",
        );
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 650));
      });
      const span = document.querySelector("[aria-hidden] > span") as HTMLElement | null;
      expect(span?.className).toBe("text-muted-foreground");
    });
  });

  describe("height and chips", () => {
    const chip = <button type="button" data-testid="chip">skill</button>;
    const chipEl = () => document.querySelector('[data-testid="chip"]') as HTMLElement;
    const container = () => document.querySelector("form > div, form") as HTMLElement;

    it("stays compact with chips and short text", async () => {
      await mount({ chips: chip, chipCount: 3, defaultValue: "short" });
      expect(editor().className).toContain("max-h-9");
      expect(editor().className).not.toContain("min-h-16");
      expect(container().outerHTML).toContain("rounded-full");
    });

    it("expands with the session padding on a newline", async () => {
      await mount({ chips: chip, chipCount: 1, defaultValue: "line one\nline two" });
      const cls = editor().className.split(" ");
      expect(cls).toContain("min-h-16");
      expect(cls).toContain("px-4");
      expect(cls).toContain("max-h-50");
      expect(cls).not.toContain("max-h-9");
    });

    it("renders chips as a non-editable atom inside the same contenteditable", async () => {
      await mount({ chips: chip, chipCount: 1, defaultValue: "hello" });
      const host = chipEl().closest("[data-composer-chips-inline]") as HTMLElement;
      expect(host).not.toBeNull();
      expect(host.getAttribute("contenteditable")).toBe("false");
      // `contents` so each chip is an atom in the editor flow (not one flex box).
      expect(host.className).toContain("contents");
      expect(editor().contains(host)).toBe(true);
      expect(editor().getAttribute("contenteditable")).toBe("true");
      expect(host.parentElement).toBe(editor());
      expect(document.querySelector("textarea")).toBeNull();
      expect(editor().textContent).toContain("hello");
      // A U+200B anchor leads the text, so the caret always has a place after the chips.
      expect(host.nextSibling?.textContent).toBe("\u200bhello");
    });

    it("keeps typed text after the chips and reports plain text", async () => {
      const onChange = vi.fn();
      await mount({ chips: chip, chipCount: 1, onChange });
      await type("abc");
      expect(onChange).toHaveBeenLastCalledWith("abc");
      expect(editor().textContent?.replaceAll("\u200b", "")).toBe("skillabc");
    });

    it("places chips above the input when chipsPlacement is top", async () => {
      await mount({ chips: chip, chipCount: 1, chipsPlacement: "top" });
      expect(document.querySelector("[data-composer-chips-inline]")).toBeNull();
      const ta = document.querySelector("textarea") as HTMLTextAreaElement;
      expect(chipEl().compareDocumentPosition(ta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("removes the last chip on Backspace at the start of the text", async () => {
      const onRemoveLastChip = vi.fn();
      await mount({ chips: chip, chipCount: 1, onRemoveLastChip });
      await act(async () => {
        editor().focus();
        const range = document.createRange();
        range.selectNodeContents(editor());
        range.collapse(false);
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(range);
        key({ key: "Backspace" });
      });
      expect(onRemoveLastChip).toHaveBeenCalledTimes(1);
    });
  });

  describe("caret around inline chips", () => {
    const chips = (
      <>
        <button type="button" data-testid="chip">/review</button>
        <button type="button" aria-label="Remove review">x</button>
      </>
    );
    const chipsHost = () =>
      document.querySelector("[data-composer-chips-inline]") as HTMLElement;
    const selection = () => window.getSelection()!;
    const caretOutsideHost = () => {
      const sel = selection();
      return !chipsHost().contains(sel.anchorNode) && !chipsHost().contains(sel.focusNode);
    };
    function setCaret(node: Node, offset: number, focusNode = node, focusOffset = offset) {
      selection().setBaseAndExtent(node, offset, focusNode, focusOffset);
    }

    it.each(["", "hello"])("keeps a U+200B text node right after the host (value %j)", async (value) => {
      await mount({ chips, chipCount: 1, defaultValue: value });
      const next = chipsHost().nextSibling;
      expect(next?.nodeType).toBe(Node.TEXT_NODE);
      expect(next?.textContent).toBe(`\u200b${value}`);
    });

    it("restores the anchor when the DOM loses it", async () => {
      const onChange = vi.fn();
      await mount({ chips, chipCount: 1, onChange });
      await act(async () => {
        chipsHost().nextSibling!.remove();
        editor().appendChild(document.createTextNode("x"));
        editor().dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(chipsHost().nextSibling?.textContent).toBe("\u200b");
      expect(onChange).toHaveBeenLastCalledWith("x");
    });

    it("never reports U+200B through onChange or onSubmit", async () => {
      const onChange = vi.fn();
      const onSubmit = vi.fn();
      await mount({ chips, chipCount: 1, onChange, onSubmit });
      await type("hi");
      await act(async () => {
        key({ key: "Enter" });
      });
      await type("again");
      expect(onChange.mock.calls.map(([v]) => v)).toEqual(["hi", "", "again"]);
      expect(onSubmit.mock.calls).toEqual([["hi"]]);
      expect(editor().hasAttribute("data-empty")).toBe(false);
    });

    it("keeps data-empty for an empty draft with chips", async () => {
      await mount({ chips, chipCount: 1, placeholder: "Ask" });
      expect(editor().hasAttribute("data-empty")).toBe(true);
      expect(editor().getAttribute("data-placeholder")).toBe("Ask");
    });

    it.each(["", "hello"])("placeCaretAtEnd lands after the host (value %j)", async (value) => {
      await mount({ chips, chipCount: 1, defaultValue: value });
      editor().focus();
      placeCaretAtEnd(editor());
      const sel = selection();
      expect(sel.isCollapsed).toBe(true);
      expect(sel.anchorNode).toBe(chipsHost().nextSibling);
      expect(sel.anchorOffset).toBe(1 + value.length);
    });

    it("moves a caret inside a chip to the start of the text", async () => {
      await mount({ chips, chipCount: 1, defaultValue: "hello" });
      const chipText = (document.querySelector('[data-testid="chip"]') as HTMLElement).firstChild!;
      setCaret(chipText, 3);
      normaliseSelection(editor());
      expect(caretOutsideHost()).toBe(true);
      expect(selection().anchorNode).toBe(chipsHost().nextSibling);
      expect(selection().anchorOffset).toBe(1);
    });

    it("moves a caret before the host, or before the anchor, to the start of the text", async () => {
      await mount({ chips, chipCount: 1 });
      const anchor = chipsHost().nextSibling!;
      for (const [node, offset] of [[editor(), 0], [editor(), 1], [anchor, 0]] as const) {
        setCaret(node, offset);
        normaliseSelection(editor());
        expect([selection().anchorNode, selection().anchorOffset]).toEqual([anchor, 1]);
      }
    });

    it("normalises the caret on focus", async () => {
      await mount({ chips, chipCount: 1, defaultValue: "hello" });
      setCaret(editor(), 0);
      await act(async () => {
        editor().focus();
        editor().dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      });
      expect(caretOutsideHost()).toBe(true);
    });

    it("type-anywhere focuses the editor with the caret after the host", async () => {
      await mount({ chips, chipCount: 1 });
      (document.activeElement as HTMLElement | null)?.blur();
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
      });
      expect(document.activeElement).toBe(editor());
      expect(selection().anchorNode).toBe(chipsHost().nextSibling);
      expect(selection().anchorOffset).toBe(1);
    });

    it.each(["", "hello"])("Backspace at the text start removes one chip and keeps the anchor (value %j)", async (value) => {
      const onRemoveLastChip = vi.fn();
      await mount({ chips, chipCount: 1, onRemoveLastChip, defaultValue: value });
      editor().focus();
      setCaret(chipsHost().nextSibling!, 1);
      let event!: KeyboardEvent;
      await act(async () => {
        event = key({ key: "Backspace" });
      });
      expect(event.defaultPrevented).toBe(true);
      expect(onRemoveLastChip).toHaveBeenCalledTimes(1);
      expect(chipsHost().nextSibling?.textContent).toBe(`\u200b${value}`);
    });

    it("leaves Backspace inside the text to the browser", async () => {
      const onRemoveLastChip = vi.fn();
      await mount({ chips, chipCount: 1, onRemoveLastChip, defaultValue: "hello" });
      editor().focus();
      placeCaretAtEnd(editor());
      let event!: KeyboardEvent;
      await act(async () => {
        event = key({ key: "Backspace" });
      });
      expect(event.defaultPrevented).toBe(false);
      expect(onRemoveLastChip).not.toHaveBeenCalled();
    });

    it("select-all selects the text only", async () => {
      await mount({ chips, chipCount: 1, defaultValue: "hello" });
      editor().focus();
      let event!: KeyboardEvent;
      await act(async () => {
        event = key({ key: "a", ctrlKey: true });
      });
      expect(event.defaultPrevented).toBe(true);
      expect(caretOutsideHost()).toBe(true);
      expect(selection().toString().replaceAll("\u200b", "")).toBe("hello");
    });

    it.each(["Backspace", "Delete", "x"])("a whole-editor selection + %s clears the text and keeps the chips", async (pressed) => {
      const onChange = vi.fn();
      await mount({ chips, chipCount: 1, onChange, defaultValue: "hello" });
      editor().focus();
      setCaret(editor(), 0, editor(), editor().childNodes.length);
      await act(async () => {
        const event = key({ key: pressed });
        expect(event.defaultPrevented).toBe(false);
        // The browser default: delete the (normalised) selection.
        selection().getRangeAt(0).deleteContents();
        editor().dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(editor().contains(chipsHost())).toBe(true);
      expect(document.querySelector('[data-testid="chip"]')).not.toBeNull();
      expect(document.querySelector('[aria-label="Remove review"]')).not.toBeNull();
      expect(chipsHost().nextSibling?.textContent).toBe("\u200b");
      expect(onChange).toHaveBeenLastCalledWith("");
    });

    it("does not move the caret while a chip control is clicked", async () => {
      const onRemove = vi.fn();
      await mount({
        chips: <button type="button" aria-label="Remove review" onClick={onRemove}>x</button>,
        chipCount: 1,
      });
      const remove = document.querySelector('[aria-label="Remove review"]') as HTMLButtonElement;
      await act(async () => {
        remove.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        remove.click();
      });
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe("Enter", () => {
    it("submits on Enter", async () => {
      const onSubmit = vi.fn();
      await mount({ onSubmit });
      await type("hi");
      await act(async () => {
        key({ key: "Enter" });
      });
      expect(onSubmit).toHaveBeenCalledWith("hi");
    });

    it("does not submit on Shift+Enter", async () => {
      const onSubmit = vi.fn();
      await mount({ onSubmit });
      await type("hi");
      let event!: KeyboardEvent;
      await act(async () => {
        event = key({ key: "Enter", shiftKey: true });
      });
      expect(event.defaultPrevented).toBe(false);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("opens the slash menu from /", async () => {
    await mount({
      slashItems: [
        {
          id: "action:attach",
          label: "attach",
          group: "Actions",
          kind: "action",
          action: "attach",
          icon: "paperclip",
          keywords: [],
        },
      ],
    });
    await type("/");
    expect(editor().getAttribute("aria-expanded")).toBe("true");
  });
});

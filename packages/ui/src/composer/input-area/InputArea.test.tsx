// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InputArea, type InputAreaProps } from "./InputArea";

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
    expect(editor().textContent).toBe("");
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
      expect(host.className).toContain("inline-flex");
      expect(editor().contains(host)).toBe(true);
      expect(editor().getAttribute("contenteditable")).toBe("true");
      expect(host.parentElement).toBe(editor());
      expect(document.querySelector("textarea")).toBeNull();
      expect(editor().textContent).toContain("hello");
      expect(host.nextSibling?.textContent).toBe("hello");
    });

    it("keeps typed text after the chips and reports plain text", async () => {
      const onChange = vi.fn();
      await mount({ chips: chip, chipCount: 1, onChange });
      await type("abc");
      expect(onChange).toHaveBeenLastCalledWith("abc");
      expect(editor().textContent).toBe("skillabc");
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

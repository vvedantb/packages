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

const textarea = () => document.querySelector("textarea") as HTMLTextAreaElement;
const submit = () => document.querySelector('button[type="submit"]') as HTMLButtonElement;

async function type(text: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(textarea(), text);
    textarea().dispatchEvent(new Event("input", { bubbles: true }));
  });
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
    expect(textarea().value).toBe("");
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

  describe("prediction text class", () => {
    async function ghostSpan(extra: Partial<InputAreaProps>) {
      await mount({ getPrediction: async () => "and then some", ...extra });
      await type("a draft long enough to predict");
      await act(async () => {
        await new Promise((r) => setTimeout(r, 650));
      });
      return document.querySelector("[aria-hidden] > span") as HTMLElement | null;
    }

    it("defaults to text-muted, as the original app composer", async () => {
      const span = await ghostSpan({});
      expect(span?.className).toBe("text-muted");
    });

    it("applies predictionTextClassName", async () => {
      const span = await ghostSpan({ predictionTextClassName: "text-muted-foreground" });
      expect(span?.className).toBe("text-muted-foreground");
    });
  });

  describe("height and chips", () => {
    const chip = <button type="button" data-testid="chip">skill</button>;
    const chipEl = () => document.querySelector('[data-testid="chip"]') as HTMLElement;

    it("grows only on wrap: no reserved min height when expanded", async () => {
      await mount({ defaultValue: "line one\nline two" });
      const cls = textarea().className;
      expect(cls.split(" ")).not.toContain("min-h-16");
      expect(cls.split(" ")).toContain("min-h-0");
      expect(cls).toContain("field-sizing-content");
      expect(cls).toContain("max-h-50");
      expect(textarea().getAttribute("rows")).toBe("1");
    });

    it("places chips inline, in a flex-wrap row before the textarea", async () => {
      await mount({ chips: chip, chipCount: 1 });
      const row = chipEl().parentElement as HTMLElement;
      expect(row.hasAttribute("data-composer-chips-inline")).toBe(true);
      expect(row.className).toContain("flex-wrap");
      expect(row.contains(textarea())).toBe(true);
      expect(
        chipEl().compareDocumentPosition(textarea()) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("places chips above the input row when chipsPlacement is top", async () => {
      await mount({ chips: chip, chipCount: 1, chipsPlacement: "top" });
      expect(document.querySelector("[data-composer-chips-inline]")).toBeNull();
      expect(
        chipEl().compareDocumentPosition(textarea()) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("removes the last chip on Backspace at position 0", async () => {
      const onRemoveLastChip = vi.fn();
      await mount({ chips: chip, chipCount: 1, onRemoveLastChip });
      await act(async () => {
        textarea().setSelectionRange(0, 0);
        textarea().dispatchEvent(
          new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }),
        );
      });
      expect(onRemoveLastChip).toHaveBeenCalledTimes(1);
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
    expect(textarea().getAttribute("aria-expanded")).toBe("true");
  });
});

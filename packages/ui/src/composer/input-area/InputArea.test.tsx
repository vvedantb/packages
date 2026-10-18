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

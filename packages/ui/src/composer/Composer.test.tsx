// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Composer, type ComposerProps } from "./Composer";

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

const textarea = () => document.querySelector("textarea") as HTMLTextAreaElement;
const ghost = () => document.querySelector("[data-slot=composer-ghost]")!;
const sendButton = () => document.querySelector("[data-slot=composer-send]") as HTMLButtonElement | null;
const stopButton = () => document.querySelector("[data-slot=composer-stop]") as HTMLButtonElement | null;

async function type(text: string) {
  const el = textarea();
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(el, text);
    el.setSelectionRange(text.length, text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function press(
  key: string,
  init: { shiftKey?: boolean; isComposing?: boolean; keyCode?: number } = {},
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    shiftKey: init.shiftKey,
    isComposing: init.isComposing,
  });
  if (init.keyCode !== undefined) Object.defineProperty(event, "keyCode", { value: init.keyCode });
  await act(async () => {
    textarea().dispatchEvent(event);
  });
  return event;
}

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  document.body.innerHTML = "";
  root = null;
  host = null;
  vi.useRealTimers();
});

describe("Composer keyboard", () => {
  it("submits the trimmed draft on Enter and clears an uncontrolled composer", async () => {
    const onSubmit = vi.fn();
    await mount(<Composer onSubmit={onSubmit} />);
    await type("  hello  ");
    const event = await press("Enter");
    expect(event.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("hello");
    expect(textarea().value).toBe("");
  });

  it("does not submit on Shift+Enter", async () => {
    const onSubmit = vi.fn();
    await mount(<Composer onSubmit={onSubmit} />);
    await type("hello");
    const event = await press("Enter", { shiftKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea().value).toBe("hello");
  });

  it("does not submit while an IME composition is active", async () => {
    const onSubmit = vi.fn();
    await mount(<Composer onSubmit={onSubmit} />);
    await type("konnichiha");
    await press("Enter", { isComposing: true });
    await press("Enter", { keyCode: 229 });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit an empty draft", async () => {
    const onSubmit = vi.fn();
    await mount(<Composer onSubmit={onSubmit} />);
    await type("   ");
    await press("Enter");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(sendButton()!.disabled).toBe(true);
  });

  it("submits from the send button", async () => {
    const onSubmit = vi.fn();
    await mount(<Composer onSubmit={onSubmit} />);
    await type("hello");
    await act(async () => sendButton()!.click());
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("hello");
  });

  it("does not submit when disabled", async () => {
    const onSubmit = vi.fn();
    await mount(<Composer onSubmit={onSubmit} defaultValue="hello" disabled />);
    expect(textarea().disabled).toBe(true);
    expect(sendButton()!.disabled).toBe(true);
    await press("Enter");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("restores the draft when an async submit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("offline"));
    await mount(<Composer onSubmit={onSubmit} />);
    await type("hello");
    await press("Enter");
    expect(textarea().value).toBe("hello");
  });
});

describe("Composer streaming", () => {
  it("shows stop instead of send, calls onStop, and ignores Enter", async () => {
    const onStop = vi.fn();
    const onSubmit = vi.fn();
    await mount(<Composer streaming onStop={onStop} onSubmit={onSubmit} defaultValue="next" />);
    expect(sendButton()).toBeNull();
    await press("Enter");
    expect(onSubmit).not.toHaveBeenCalled();
    await act(async () => stopButton()!.click());
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("passes context to slot functions", async () => {
    const plus = vi.fn(() => <span>plus</span>);
    const trailing = vi.fn(() => <span>tools</span>);
    await mount(<Composer disabled streaming plusMenu={plus} trailingActions={trailing} />);
    expect(plus).toHaveBeenCalledWith({ disabled: true });
    expect(trailing).toHaveBeenCalledWith({ disabled: true, streaming: true });
    expect(document.body.textContent).toContain("plus");
    expect(document.body.textContent).toContain("tools");
  });

  it("renders the attachments row", async () => {
    await mount(<Composer attachments={<span>chip</span>} />);
    expect(document.querySelector("[data-slot=composer-attachments]")?.textContent).toBe("chip");
  });
});

describe("Composer value", () => {
  it("is uncontrolled with defaultValue and reports changes", async () => {
    const onChange = vi.fn();
    await mount(<Composer defaultValue="start" onChange={onChange} />);
    expect(textarea().value).toBe("start");
    await type("start more");
    expect(textarea().value).toBe("start more");
    expect(onChange).toHaveBeenLastCalledWith("start more");
  });

  it("is controlled: shows the value prop and does not change on its own", async () => {
    const onChange = vi.fn();
    await mount(<Composer value="fixed" onChange={onChange} />);
    await type("fixed!");
    expect(onChange).toHaveBeenCalledWith("fixed!");
    expect(textarea().value).toBe("fixed");
  });

  it("follows a controlled parent and leaves clearing to the caller on submit", async () => {
    const onSubmit = vi.fn();
    function Parent() {
      const [value, setValue] = useState("");
      return <Composer value={value} onChange={setValue} onSubmit={onSubmit} />;
    }
    await mount(<Parent />);
    await type("hello");
    expect(textarea().value).toBe("hello");
    await press("Enter");
    expect(onSubmit).toHaveBeenCalledWith("hello");
    expect(textarea().value).toBe("hello");
  });
});

describe("Composer predictions", () => {
  const draft = "I would like to ask";
  const setup = (props: Partial<ComposerProps> = {}) => {
    const getPrediction = vi.fn(async () => "about pricing");
    return {
      getPrediction,
      ready: () => mount(<Composer getPrediction={getPrediction} {...props} />),
    };
  };

  it("debounces: one request after the pause, with the final draft", async () => {
    const { getPrediction, ready } = setup();
    await ready();
    await type("I would like to");
    await wait(300);
    await type(draft);
    await wait(499);
    expect(getPrediction).not.toHaveBeenCalled();
    await wait(1);
    expect(getPrediction).toHaveBeenCalledExactlyOnceWith(draft, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(ghost().textContent).toBe(`${draft} about pricing`);
  });

  it("honours predictionDebounceMs and predictionMinLength", async () => {
    const { getPrediction, ready } = setup({ predictionDebounceMs: 50, predictionMinLength: 3 });
    await ready();
    await type("abcd");
    await wait(50);
    expect(getPrediction).toHaveBeenCalledOnce();
  });

  it("skips short drafts, mentions, commands and finished sentences", async () => {
    const { getPrediction, ready } = setup();
    await ready();
    for (const text of ["short", "please ask @dan", "please run /deploy", "This is finished."]) {
      await type(text);
      await wait(1000);
    }
    expect(getPrediction).not.toHaveBeenCalled();
  });

  it("aborts a stale request and ignores its late result", async () => {
    const signals: AbortSignal[] = [];
    const resolvers: Array<(text: string) => void> = [];
    const getPrediction = vi.fn(
      (_draft: string, { signal }: { signal: AbortSignal }) =>
        new Promise<string>((resolve) => {
          signals.push(signal);
          resolvers.push(resolve);
        }),
    );
    await mount(<Composer getPrediction={getPrediction} />);
    await type(draft);
    await wait(500);
    expect(signals).toHaveLength(1);
    await type(`${draft} you`);
    expect(signals[0]!.aborted).toBe(true);
    await act(async () => resolvers[0]!("stale text"));
    expect(ghost().textContent).toBe(`${draft} you`);
    await wait(500);
    await act(async () => resolvers[1]!("fresh text"));
    expect(ghost().textContent).toBe(`${draft} you fresh text`);
  });

  it("swallows a failed prediction", async () => {
    const getPrediction = vi.fn().mockRejectedValue(new Error("boom"));
    await mount(<Composer getPrediction={getPrediction} />);
    await type(draft);
    await wait(500);
    expect(getPrediction).toHaveBeenCalledOnce();
    expect(ghost().textContent).toBe(draft);
  });

  it("Tab accepts the prediction", async () => {
    const onChange = vi.fn();
    const { ready } = setup({ onChange });
    await ready();
    await type(draft);
    await wait(500);
    const event = await press("Tab");
    expect(event.defaultPrevented).toBe(true);
    expect(textarea().value).toBe(`${draft} about pricing`);
    expect(onChange).toHaveBeenLastCalledWith(`${draft} about pricing`);
  });

  it("Tab does nothing without a prediction", async () => {
    const { ready } = setup();
    await ready();
    await type(draft);
    const event = await press("Tab");
    expect(event.defaultPrevented).toBe(false);
    expect(textarea().value).toBe(draft);
  });

  it("Esc dismisses the prediction and stops new requests for that draft", async () => {
    const { getPrediction, ready } = setup();
    await ready();
    await type(draft);
    await wait(500);
    const event = await press("Escape");
    expect(event.defaultPrevented).toBe(true);
    expect(ghost().textContent).toBe(draft);
    await wait(1000);
    expect(getPrediction).toHaveBeenCalledOnce();
    // Tab no longer accepts.
    await press("Tab");
    expect(textarea().value).toBe(draft);
    // Typing again asks again.
    await type(`${draft} you`);
    await wait(500);
    expect(getPrediction).toHaveBeenCalledTimes(2);
  });

  it("hides the prediction when the caret is not at the end", async () => {
    const { ready } = setup();
    await ready();
    await type(draft);
    await wait(500);
    expect(ghost().textContent).toContain("about pricing");
    await act(async () => {
      textarea().setSelectionRange(2, 2);
      textarea().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(ghost().textContent).toBe(draft);
    const event = await press("Tab");
    expect(event.defaultPrevented).toBe(false);
  });

  it("makes no request while streaming or disabled", async () => {
    const getPrediction = vi.fn(async () => "more");
    await mount(<Composer getPrediction={getPrediction} streaming defaultValue={draft} />);
    await wait(1000);
    expect(getPrediction).not.toHaveBeenCalled();
  });

  it("makes no request without getPrediction", async () => {
    await mount(<Composer defaultValue={draft} />);
    await wait(1000);
    expect(ghost().textContent).toBe(draft);
  });
});

// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimePicker } from "./time-picker";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
  vi.restoreAllMocks();
});

function trigger(): HTMLButtonElement {
  const found = document.querySelector('button[aria-haspopup="dialog"]');
  if (!(found instanceof HTMLButtonElement)) throw new Error("missing trigger");
  return found;
}

/** The option `value` in the column whose label is `label`. */
function option(label: string, value: string): HTMLButtonElement {
  const column = [...document.querySelectorAll("[data-time-column]")].find(
    (c) => c.getAttribute("data-time-column") === label,
  );
  const found = column?.querySelector(`[data-time-value="${value}"]`);
  if (!(found instanceof HTMLButtonElement)) {
    throw new Error(`missing ${label} ${value}`);
  }
  return found;
}

async function click(button: HTMLButtonElement) {
  await act(async () => button.click());
}

describe("TimePicker", () => {
  it("shows 24h by default", async () => {
    await mount(<TimePicker value="14:30" onChange={() => {}} />);
    expect(trigger().textContent).toBe("14:30");
    await click(trigger());
    expect(document.querySelector('[data-time-column="AM/PM"]')).toBeNull();
  });

  it("shows 12h with an AM/PM column and keeps the value 24h", async () => {
    const onChange = vi.fn();
    await mount(<TimePicker value="14:30" onChange={onChange} hourCycle={12} />);
    expect(trigger().textContent).toBe("02:30 PM");
    await click(trigger());

    await click(option("Hours", "09"));
    expect(onChange).toHaveBeenLastCalledWith("21:30");
    await click(option("AM/PM", "AM"));
    expect(onChange).toHaveBeenLastCalledWith("02:30");
    await click(option("Minutes", "05"));
    expect(onChange).toHaveBeenLastCalledWith("14:05");
  });

  it("maps midnight and noon to 12 AM and 12 PM", async () => {
    const onChange = vi.fn();
    await mount(<TimePicker value="00:15" onChange={onChange} hourCycle={12} />);
    expect(trigger().textContent).toBe("12:15 AM");
    await click(trigger());
    await click(option("AM/PM", "PM"));
    expect(onChange).toHaveBeenLastCalledWith("12:15");
  });

  it("centres each column on the selected item when the popover opens", async () => {
    // happy-dom has no layout: give every option a 28px row and every list a
    // 192px viewport, so the expected scrollTop is item centre - half view.
    vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(
      function (this: HTMLElement) {
        const value = this.getAttribute("data-time-value");
        const list = this.parentElement;
        if (value === null || list === null) return 0;
        return [...list.children].indexOf(this) * 28;
      },
    );
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(28);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(192);

    await mount(<TimePicker value="14:30" onChange={() => {}} />);
    await click(trigger());

    const hours = option("Hours", "14").parentElement;
    const minutes = option("Minutes", "30").parentElement;
    expect(hours?.scrollTop).toBe(14 * 28 - 96 + 14);
    expect(minutes?.scrollTop).toBe(30 * 28 - 96 + 14);
  });
});

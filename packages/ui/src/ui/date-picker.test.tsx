// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as rootExports from "../index";
import {
  DatePicker,
  DateTimePicker,
  formatDateValue,
  MonthPicker,
  parseDateValue,
} from "./date-picker";

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

async function rerender(node: ReactNode) {
  await act(async () => root?.render(node));
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
  vi.useRealTimers();
});

function el<T extends Element>(selector: string, type: new () => T): T {
  const found = document.querySelector(selector);
  if (!(found instanceof type)) throw new Error(`missing ${selector}`);
  return found;
}

function buttonByLabel(label: string): HTMLButtonElement {
  return el(`button[aria-label="${label}"]`, HTMLButtonElement);
}

function trigger(): HTMLButtonElement {
  return el('button[aria-haspopup="dialog"]', HTMLButtonElement);
}

function day(iso: string): HTMLButtonElement {
  return el(`[data-day="${iso}"] button`, HTMLButtonElement);
}

async function click(button: HTMLButtonElement) {
  await act(async () => button.click());
}

const medium = (y: number, m: number, d: number) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(y, m - 1, d),
  );

describe("date helpers", () => {
  it("parse as local midnight and round-trip every day of a leap year", () => {
    const parsed = parseDateValue("2024-03-31");
    expect(parsed?.getFullYear()).toBe(2024);
    expect(parsed?.getMonth()).toBe(2);
    expect(parsed?.getDate()).toBe(31);
    expect(parsed?.getHours()).toBe(0);

    for (let i = 0; i < 366; i++) {
      const date = new Date(2024, 0, 1 + i);
      const value = formatDateValue(date);
      expect(value.startsWith("2024-")).toBe(true);
      const back = parseDateValue(value);
      expect(back?.getDate()).toBe(date.getDate());
      expect(back?.getMonth()).toBe(date.getMonth());
      expect(back && formatDateValue(back)).toBe(value);
    }
  });

  it("reject empty, malformed and overflowing values and keep small years", () => {
    expect(parseDateValue("")).toBeUndefined();
    expect(parseDateValue("2024-2-01")).toBeUndefined();
    expect(parseDateValue("2025-02-29")).toBeUndefined();
    expect(parseDateValue("2025-13-01")).toBeUndefined();
    const early = parseDateValue("0099-05-06");
    expect(early?.getFullYear()).toBe(99);
    expect(early && formatDateValue(early)).toBe("0099-05-06");
    expect(formatDateValue(new Date(Number.NaN))).toBe("");
  });

  it("are exported from the root with the pickers and Calendar", () => {
    for (const name of [
      "Calendar",
      "DatePicker",
      "DateTimePicker",
      "MonthPicker",
      "parseDateValue",
      "formatDateValue",
    ]) {
      expect(rootExports, name).toHaveProperty(name);
    }
  });
});

describe("DatePicker", () => {
  it("shows the placeholder in the placeholder colour, then the formatted value", async () => {
    const onChange = vi.fn();
    await mount(<DatePicker value="" onChange={onChange} locale="en-GB" />);
    expect(trigger().textContent).toBe("Pick a date");
    expect(trigger().querySelector("span")?.className).toContain(
      "text-field-placeholder",
    );

    await rerender(
      <DatePicker value="2026-03-05" onChange={onChange} locale="en-GB" />,
    );
    expect(trigger().textContent).toBe(medium(2026, 3, 5));
    expect(trigger().querySelector("span")?.className).not.toContain(
      "text-field-placeholder",
    );
  });

  it("is a labelled dialog trigger styled like the TimePicker trigger", async () => {
    await mount(
      <DatePicker value="" onChange={() => {}} ariaLabel="Due" id="due" />,
    );
    const t = trigger();
    expect(t.type).toBe("button");
    expect(t.id).toBe("due");
    expect(t.getAttribute("aria-label")).toBe("Due, Pick a date");
    for (const cls of ["h-8", "rounded-field", "border-border", "bg-field-background", "focus-visible:ring-focus-ring", "w-40"]) {
      expect(t.className).toContain(cls);
    }
  });

  it("opens the calendar on the selected month and selecting a day calls onChange and closes", async () => {
    const onChange = vi.fn();
    await mount(<DatePicker value="2026-03-05" onChange={onChange} />);
    expect(document.querySelector('[data-slot="calendar"]')).toBeNull();
    await click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[data-slot="calendar"]')).not.toBeNull();
    expect(document.querySelector('[data-day="2026-03-05"]')?.hasAttribute("data-selected")).toBe(true);

    await click(day("2026-03-18"));
    expect(onChange).toHaveBeenCalledWith("2026-03-18");
    expect(document.querySelector('[data-slot="calendar"]')).toBeNull();
  });

  it("disables days outside min and max", async () => {
    await mount(
      <DatePicker
        value="2026-03-15"
        onChange={() => {}}
        min="2026-03-10"
        max="2026-03-20"
      />,
    );
    await click(trigger());
    const disabled = (iso: string) =>
      document.querySelector(`[data-day="${iso}"]`)?.hasAttribute("data-disabled");
    expect(disabled("2026-03-09")).toBe(true);
    expect(disabled("2026-03-10")).toBe(false);
    expect(disabled("2026-03-20")).toBe(false);
    expect(disabled("2026-03-21")).toBe(true);
    expect(day("2026-03-21").disabled).toBe(true);
  });

  it("clearable shows a clear control only with a value, which calls onChange('')", async () => {
    const onChange = vi.fn();
    await mount(<DatePicker value="" onChange={onChange} clearable />);
    expect(document.querySelector('button[aria-label="Clear date"]')).toBeNull();

    await rerender(<DatePicker value="2026-03-05" onChange={onChange} clearable />);
    await click(buttonByLabel("Clear date"));
    expect(onChange).toHaveBeenCalledWith("");
    expect(document.activeElement).toBe(trigger());
  });

  it("renders a hidden input with name and value", async () => {
    await mount(<DatePicker value="2026-03-05" onChange={() => {}} name="due" />);
    const hidden = el('input[type="hidden"]', HTMLInputElement);
    expect(hidden.name).toBe("due");
    expect(hidden.value).toBe("2026-03-05");
  });
});

describe("DatePicker layout and overrides", () => {
  const classes = (element: Element | null | undefined) =>
    (element?.getAttribute("class") ?? "").split(" ");

  it("a selected today keeps the selected text colour and today's dot follows it", async () => {
    const today = formatDateValue(new Date());
    await mount(<DatePicker value={today} onChange={() => {}} />);
    await click(trigger());
    const cell = document.querySelector(`[data-day="${today}"]`);
    expect(cell?.hasAttribute("data-today")).toBe(true);
    expect(cell?.hasAttribute("data-selected")).toBe(true);
    const list = classes(day(today));
    expect(list).toContain("group-data-selected/day:text-primary-foreground");
    expect(list).toContain("group-data-today/day:after:bg-current");
    // every today or outside text colour is scoped to unselected days
    const stateText = list.filter(
      (c) => /group-data-(today|outside)\/day:/.test(c) && /:text-(?!xs|sm)/.test(c),
    );
    expect(stateText.length).toBe(2);
    for (const c of stateText) expect(c).toContain("not-group-data-selected/day:");
  });

  it("triggerClassName w-full replaces the default width and the wrapper goes full width", async () => {
    await mount(<DatePicker value="2026-03-05" onChange={() => {}} clearable triggerClassName="w-full" />);
    const wrapper = trigger().parentElement;
    expect(classes(trigger())).toContain("w-full");
    expect(classes(trigger())).not.toContain("w-40");
    expect(classes(wrapper)).toEqual(expect.arrayContaining(["has-[.w-full]:flex", "has-[.w-full]:w-full"]));
    const clear = buttonByLabel("Clear date");
    expect(clear.parentElement).toBe(wrapper);
    expect(trigger().contains(clear)).toBe(false);
    expect(classes(clear)).toEqual(expect.arrayContaining(["absolute", "right-8"]));
  });

  it("className w-full sizes the wrapper and the trigger grows into it", async () => {
    await mount(<MonthPicker value="" onChange={() => {}} className="w-full" />);
    expect(classes(trigger().parentElement)).toContain("w-full");
    expect(classes(trigger())).toEqual(expect.arrayContaining(["grow", "min-w-0"]));
  });

  it("pill overrides replace height, radius, padding, text size and width", async () => {
    await mount(
      <DatePicker value="" onChange={() => {}} triggerClassName="h-10 w-full rounded-full px-4 text-sm" />,
    );
    const list = classes(trigger());
    expect(list).toEqual(expect.arrayContaining(["h-10", "w-full", "rounded-full", "px-4", "text-sm"]));
    for (const gone of ["h-8", "w-40", "rounded-field", "px-2.5", "text-xs"]) expect(list).not.toContain(gone);
    expect(list).toEqual(expect.arrayContaining(["border-border", "bg-field-background", "focus-visible:ring-focus-ring"]));
  });

  it("DateTimePicker passes overrides to both triggers, but a width only to the date", async () => {
    await mount(
      <DateTimePicker value="" onChange={() => {}} triggerClassName="h-10 w-full rounded-full text-sm" ariaLabel="Start" />,
    );
    const date = classes(trigger());
    const time = classes(buttonByLabel("Start, time"));
    expect(date).toEqual(expect.arrayContaining(["h-10", "w-full", "rounded-full", "text-sm"]));
    expect(time).toEqual(expect.arrayContaining(["h-10", "w-[110px]", "rounded-full", "text-sm", "shrink-0"]));
    expect(time).not.toContain("w-full");
    expect(time).not.toContain("rounded-field");
    expect(classes(trigger().parentElement?.parentElement)).toContain("has-[.w-full]:w-full");
  });
});

describe("DateTimePicker", () => {
  it("picking a date keeps the time, or uses defaultTime when there is none", async () => {
    const onChange = vi.fn();
    await mount(<DateTimePicker value="2026-03-05T14:30" onChange={onChange} />);
    await click(buttonByLabel(`Date, ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(2026, 2, 5))}`));
    await click(day("2026-03-07"));
    expect(onChange).toHaveBeenLastCalledWith("2026-03-07T14:30");

    await rerender(<DateTimePicker value="" onChange={onChange} defaultTime="09:00" />);
    await click(buttonByLabel("Date, Pick a date"));
    const today = formatDateValue(new Date());
    await click(day(today));
    expect(onChange).toHaveBeenLastCalledWith(`${today}T09:00`);
  });

  it("picking a time keeps the date, or uses today's local date when there is none", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 23, 23, 30));
    const onChange = vi.fn();
    await mount(<DateTimePicker value="2026-03-05T14:30" onChange={onChange} />);
    await click(buttonByLabel("Time"));
    await click(el('[data-time-value="45"]', HTMLButtonElement));
    expect(onChange).toHaveBeenLastCalledWith("2026-03-05T14:45");

    await rerender(<DateTimePicker value="" onChange={onChange} />);
    await click(el('[data-time-value="08"]', HTMLButtonElement));
    expect(onChange).toHaveBeenLastCalledWith("2026-10-23T08:00");
  });

  it("applies the date part of min and max and submits the combined value", async () => {
    await mount(
      <DateTimePicker
        value="2026-03-15T10:00"
        onChange={() => {}}
        min="2026-03-10T08:00"
        max="2026-03-20T18:00"
        name="when"
        ariaLabel="Start"
      />,
    );
    expect(el('input[type="hidden"]', HTMLInputElement).value).toBe("2026-03-15T10:00");
    await click(trigger());
    expect(document.querySelector('[data-day="2026-03-09"]')?.hasAttribute("data-disabled")).toBe(true);
    expect(document.querySelector('[data-day="2026-03-10"]')?.hasAttribute("data-disabled")).toBe(false);
    expect(document.querySelector('[data-day="2026-03-21"]')?.hasAttribute("data-disabled")).toBe(true);
    expect(buttonByLabel("Start, time")).toBeTruthy();
  });
});

describe("MonthPicker", () => {
  it("opens on the selected year and selecting a month calls onChange and closes", async () => {
    const onChange = vi.fn();
    await mount(<MonthPicker value="2025-04" onChange={onChange} locale="en-GB" />);
    expect(trigger().textContent).toBe("Apr 2025");
    await click(trigger());
    expect(buttonByLabel("April 2025").getAttribute("aria-pressed")).toBe("true");
    expect(buttonByLabel("May 2025").getAttribute("aria-pressed")).toBe("false");

    await click(buttonByLabel("Next year"));
    await click(buttonByLabel("February 2026"));
    expect(onChange).toHaveBeenCalledWith("2026-02");
    expect(document.querySelector('button[aria-label="February 2026"]')).toBeNull();
  });

  it("disables months and year navigation outside min and max", async () => {
    await mount(
      <MonthPicker value="" onChange={() => {}} min="2025-03" max="2025-10" locale="en-GB" />,
    );
    expect(trigger().textContent).toBe("Pick a month");
    await click(trigger());
    expect(buttonByLabel("February 2025").disabled).toBe(true);
    expect(buttonByLabel("March 2025").disabled).toBe(false);
    expect(buttonByLabel("October 2025").disabled).toBe(false);
    expect(buttonByLabel("November 2025").disabled).toBe(true);
    expect(buttonByLabel("Previous year").disabled).toBe(true);
    expect(buttonByLabel("Next year").disabled).toBe(true);
  });
});

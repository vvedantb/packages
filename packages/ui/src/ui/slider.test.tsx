// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LabeledSliderRow } from "./labeled-slider-row";
import { Slider } from "./slider";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// Radix sizes thumbs with ResizeObserver, which happy-dom may lack.
if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.assign(globalThis, { ResizeObserver: ResizeObserverStub });
}

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

async function render(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return host;
}

const thumbs = (host: HTMLElement) => Array.from(host.querySelectorAll<HTMLElement>('[role="slider"]'));

function thumbAt(host: HTMLElement, index = 0) {
  const thumb = thumbs(host)[index];
  if (!thumb) throw new Error(`no thumb at ${index}`);
  return thumb;
}

async function press(el: HTMLElement, key: string) {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

describe("Slider", () => {
  it("renders one thumb with the value range", async () => {
    const host = await render(<Slider defaultValue={[30]} min={10} max={90} aria-label="Volume" />);
    expect(thumbs(host)).toHaveLength(1);
    const thumb = thumbAt(host);
    expect(thumb.getAttribute("aria-valuenow")).toBe("30");
    expect(thumb.getAttribute("aria-valuemin")).toBe("10");
    expect(thumb.getAttribute("aria-valuemax")).toBe("90");
    expect(thumb.getAttribute("aria-label")).toBe("Volume");
  });

  it("renders a thumb per value for a range", async () => {
    const host = await render(<Slider defaultValue={[20, 80]} thumbLabels={["From", "To"]} />);
    const all = thumbs(host);
    expect(all.map((t) => t.getAttribute("aria-valuenow"))).toEqual(["20", "80"]);
    expect(all.map((t) => t.getAttribute("aria-label"))).toEqual(["From", "To"]);
  });

  it("steps with ArrowRight, ArrowLeft, Home and End", async () => {
    const onValueChange = vi.fn();
    const host = await render(
      <Slider defaultValue={[50]} step={5} onValueChange={onValueChange} aria-label="Level" />,
    );
    const thumb = thumbAt(host);
    await press(thumb, "ArrowRight");
    expect(onValueChange).toHaveBeenLastCalledWith([55]);
    expect(thumb.getAttribute("aria-valuenow")).toBe("55");
    await press(thumb, "ArrowLeft");
    expect(onValueChange).toHaveBeenLastCalledWith([50]);
    await press(thumb, "Home");
    expect(onValueChange).toHaveBeenLastCalledWith([0]);
    await press(thumb, "End");
    expect(onValueChange).toHaveBeenLastCalledWith([100]);
  });

  it("ignores keys when disabled", async () => {
    const onValueChange = vi.fn();
    const host = await render(
      <Slider defaultValue={[50]} disabled onValueChange={onValueChange} aria-label="Level" />,
    );
    const thumb = thumbAt(host);
    expect(thumb.hasAttribute("data-disabled")).toBe(true);
    expect(host.firstElementChild?.hasAttribute("data-disabled")).toBe(true);
    await press(thumb, "ArrowRight");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("puts id, aria-labelledby and aria-valuetext on the first thumb, not Root", async () => {
    const host = await render(
      <Slider id="vol" defaultValue={[1, 2]} aria-labelledby="vol-label" aria-valuetext="1 to 2" />,
    );
    const first = thumbAt(host, 0);
    const second = thumbAt(host, 1);
    expect(first.id).toBe("vol");
    expect(first.getAttribute("aria-labelledby")).toBe("vol-label");
    expect(first.getAttribute("aria-valuetext")).toBe("1 to 2");
    expect(second.id).toBe("");
    expect(host.firstElementChild?.id).toBe("");
  });
});

describe("LabeledSliderRow", () => {
  it("names the thumb from the label and shows the formatted value", async () => {
    const host = await render(
      <LabeledSliderRow
        id="temp"
        label="Temperature"
        value={[0.7]}
        max={2}
        step={0.1}
        formatValue={(v) => v.map((n) => n.toFixed(1)).join("–")}
        minLabel="Precise"
        maxLabel="Creative"
      />,
    );
    const thumb = thumbAt(host);
    expect(thumb.id).toBe("temp");
    expect(document.getElementById(thumb.getAttribute("aria-labelledby") ?? "")?.textContent).toBe("Temperature");
    expect(host.querySelector("output")?.textContent).toBe("0.7");
    expect(host.textContent).toContain("Precise");
    expect(host.textContent).toContain("Creative");
  });
});

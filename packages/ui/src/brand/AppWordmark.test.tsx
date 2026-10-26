// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import * as root from "../index";
import { AppWordmark, type ProductAppName } from "./index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let reactRoot: Root | null = null;
let host: HTMLElement | null = null;

async function render(node: ReactNode): Promise<HTMLElement> {
  const el = document.createElement("div");
  document.body.appendChild(el);
  host = el;
  reactRoot = createRoot(el);
  await act(async () => reactRoot?.render(node));
  return el;
}

afterEach(async () => {
  await act(async () => reactRoot?.unmount());
  host?.remove();
});

const APPS: ProductAppName[] = ["vibot", "vmem", "verve", "velth", "vhub"];

describe("AppWordmark", () => {
  it("is exported from the root with a displayName", () => {
    expect(root.AppWordmark).toBe(AppWordmark);
    expect(AppWordmark.displayName).toBe("AppWordmark");
  });

  it("renders the full lowercase name as one text unit for every product app", async () => {
    for (const app of APPS) {
      const el = await render(<AppWordmark app={app} />);
      const text = el.querySelector(".landing-wordmark-text")!;
      expect(text.textContent).toBe(app);
      expect(text.childNodes).toHaveLength(1);
      expect(text.firstChild!.nodeType).toBe(Node.TEXT_NODE);
      expect(text.className).not.toMatch(/(^|\s)italic(\s|$)/);
      expect(text.querySelector(".italic, i, em, span")).toBeNull();
      expect((text as HTMLElement).style.fontStyle).toBe("");
      expect(el.querySelector(".italic")).toBeNull();
      await act(async () => reactRoot?.unmount());
      host?.remove();
    }
  });

  it("shows an icon by default and none with icon={false}", async () => {
    let el = await render(<AppWordmark app="vmem" />);
    expect(el.querySelector("svg")).not.toBeNull();
    await act(async () => reactRoot?.unmount());
    host?.remove();
    el = await render(<AppWordmark app="vmem" icon={false} />);
    expect(el.querySelector("svg")).toBeNull();
    expect(el.textContent).toBe("vmem");
  });

  it("sets the font size from size and the icon to Math.round(size * 0.875)", async () => {
    const el = await render(<AppWordmark app="verve" size={48} />);
    expect((el.firstElementChild as HTMLElement).style.fontSize).toBe("48px");
    const svg = el.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("42");
    expect(svg.getAttribute("height")).toBe("42");
  });

  it("defaults to size 24 with a 21px icon and a 0.3em gap", async () => {
    const el = await render(<AppWordmark app="vhub" />);
    const rootEl = el.firstElementChild as HTMLElement;
    expect(rootEl.style.fontSize).toBe("24px");
    expect(el.querySelector("svg")!.getAttribute("width")).toBe("21");
    expect(rootEl.style.gap).toBe("0.3em");
  });

  it("renders an anchor with href and a span without", async () => {
    let el = await render(<AppWordmark app="vhub" href="https://vhub.projectv.uk" target="_blank" rel="noreferrer" />);
    const a = el.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("https://vhub.projectv.uk");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.className).toContain("focus-visible:ring-2");
    await act(async () => reactRoot?.unmount());
    host?.remove();
    el = await render(<AppWordmark app="vhub" />);
    expect(el.querySelector("a")).toBeNull();
    expect(el.firstElementChild!.tagName).toBe("SPAN");
  });

  it("excludes projectv at type level", () => {
    // @ts-expect-error projectv is not a product app
    const node = <AppWordmark app="projectv" />;
    expect(node).toBeTruthy();
  });
});

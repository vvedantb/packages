// @vitest-environment happy-dom
import { createRef, type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import * as root from "../index";
import { APP_ICONS, APP_MARKS, APP_NAMES, IconProjectV, markStrokeWidth } from "./index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let reactRoot: Root | null = null;
let host: HTMLElement | null = null;

async function render(node: ReactNode): Promise<SVGSVGElement> {
  const el = document.createElement("div");
  document.body.appendChild(el);
  host = el;
  reactRoot = createRoot(el);
  await act(async () => reactRoot?.render(node));
  return el.querySelector("svg")!;
}

afterEach(async () => {
  await act(async () => reactRoot?.unmount());
  host?.remove();
});

const EXPORTS = { vibot: "IconVibot", vhub: "IconVhub", vmem: "IconVmem", verve: "IconVerve", velth: "IconVelth", projectv: "IconProjectV" } as const;

describe("Icon* app icons", () => {
  it("exports one icon per app from the root, with displayName", () => {
    for (const app of APP_NAMES) {
      const icon = (root as Record<string, unknown>)[EXPORTS[app]];
      expect(icon).toBe(APP_ICONS[app]);
      expect((icon as { displayName?: string }).displayName).toBe(EXPORTS[app]);
    }
  });

  it("renders the plain glyph with size as both width and height", async () => {
    for (const app of APP_NAMES) {
      const Icon = APP_ICONS[app];
      const svg = await render(<Icon size={32} />);
      expect(svg.getAttribute("data-app")).toBe(app);
      expect(svg.getAttribute("height")).toBe("32");
      expect(svg.getAttribute("width")).toBe("32");
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.querySelector("rect")).toBeNull();
      await act(async () => reactRoot?.unmount());
      host?.remove();
    }
  });

  it("applies color to fill and stroke glyphs", async () => {
    for (const app of APP_NAMES) {
      const Icon = APP_ICONS[app];
      const svg = await render(<Icon color="red" />);
      const g = svg.querySelector("g")!;
      expect(g.getAttribute("fill") === "red" || g.getAttribute("stroke") === "red").toBe(true);
      await act(async () => reactRoot?.unmount());
      host?.remove();
    }
  });

  it("scales a stroke override into viewBox units and defaults to the glyph weight", async () => {
    for (const app of APP_NAMES.filter((a) => APP_MARKS[a].kind === "stroke")) {
      const Icon = APP_ICONS[app];
      const plain = await render(<Icon />);
      expect(plain.querySelector("g")!.getAttribute("stroke-width")).toBe(String(markStrokeWidth(app)));
      await act(async () => reactRoot?.unmount());
      host?.remove();
      const over = await render(<Icon size={24} stroke={2} />);
      const h = Number(over.getAttribute("viewBox")!.split(" ")[3]);
      expect(Number(over.querySelector("g")!.getAttribute("stroke-width"))).toBeCloseTo(2 * (h / 24));
      await act(async () => reactRoot?.unmount());
      host?.remove();
    }
  });

  it("forwards ref, className and title", async () => {
    const ref = createRef<SVGSVGElement>();
    const svg = await render(<IconProjectV ref={ref} className="x" title="Project V" />);
    expect(ref.current).toBe(svg);
    expect(svg.getAttribute("class")).toBe("x");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.querySelector("title")?.textContent).toBe("Project V");
    expect(svg.getAttribute("aria-labelledby")).toBe(svg.querySelector("title")?.id);
  });
});

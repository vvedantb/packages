// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import * as root from "../index";
import { APP_MARKS, APP_MARK_SVG, APP_MARK_VIEWBOX, APP_NAMES, APP_TILE_LIGHT_SVG, APP_TILE_SVG, AppMark, appAdaptiveSvg, appExtension128Svg, markBBox, markLinecap, markStrokeWidth, pathBBox } from "./index";
import { MARK_VIEWBOX } from "./svg";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let reactRoot: Root | null = null;
let host: HTMLElement | null = null;

async function render(node: ReactNode): Promise<SVGSVGElement> {
  await cleanup();
  const el = document.createElement("div");
  document.body.appendChild(el);
  const r = createRoot(el);
  host = el;
  reactRoot = r;
  await act(async () => {
    r.render(node);
  });
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("no svg rendered");
  return svg;
}

async function cleanup() {
  await act(async () => reactRoot?.unmount());
  host?.remove();
  reactRoot = null;
  host = null;
}

afterEach(cleanup);

/** The element that carries the glyph paint (the `g` inside the svg). */
const glyph = (svg: Element) => svg.querySelector("g") as SVGGElement;

describe("brand exports", () => {
  it("lists the six apps", () => {
    expect([...APP_NAMES]).toEqual(["projectv", "vibot", "vhub", "vmem", "verve", "velth"]);
  });

  it("is re-exported from the root", () => {
    expect(root.AppMark).toBe(AppMark);
    expect(root.APP_NAMES).toBe(APP_NAMES);
    expect(root.appMarkSvg).toBeTypeOf("function");
  });
});

describe.each(APP_NAMES)("AppMark %s", (app) => {
  const { kind } = APP_MARKS[app];

  it("renders the glyph on its square viewBox in currentColor", async () => {
    const svg = await render(<AppMark app={app} />);
    expect(svg.getAttribute("viewBox")).toBe(APP_MARK_VIEWBOX[app]);
    expect(svg.querySelector("rect")).toBeNull();
    expect(svg.querySelectorAll("path").length).toBe(APP_MARKS[app].paths.length);
    const g = glyph(svg);
    if (kind === "fill") {
      expect(g.getAttribute("fill")).toBe("currentColor");
      expect(g.getAttribute("stroke")).toBeNull();
    } else {
      expect(g.getAttribute("fill")).toBe("none");
      expect(g.getAttribute("stroke")).toBe("currentColor");
      expect(g.getAttribute("stroke-width")).toBe(String(markStrokeWidth(app)));
      expect(g.getAttribute("stroke-linecap")).toBe(markLinecap(app));
      expect(g.getAttribute("stroke-linejoin")).toBe("round");
    }
  });

  it("vmem uses butt caps and every other stroke mark keeps round caps", () => {
    expect(markLinecap("vmem")).toBe("butt");
    expect(APP_MARK_SVG.vmem).toContain('stroke-linecap="butt"');
    for (const app of APP_NAMES.filter((a) => a !== "vmem")) expect(markLinecap(app)).toBe("round");
  });

  it("tile is a black rounded tile with a white glyph", async () => {
    const svg = await render(<AppMark app={app} variant="tile" />);
    const rect = svg.querySelector("rect");
    expect(rect?.getAttribute("fill")).toBe("#000");
    expect(rect?.getAttribute("rx")).toBe("224");
    expect(rect?.getAttribute("width")).toBe("1024");
    expect(svg.getAttribute("viewBox")).toBe("0 0 1024 1024");
    expect(glyph(svg).getAttribute(kind === "fill" ? "fill" : "stroke")).toBe("#fff");
  });

  it("tile-light is a white rounded tile with a black glyph", async () => {
    const svg = await render(<AppMark app={app} variant="tile-light" />);
    expect(svg.querySelector("rect")?.getAttribute("fill")).toBe("#fff");
    expect(glyph(svg).getAttribute(kind === "fill" ? "fill" : "stroke")).toBe("#000");
  });

  it("raw SVG strings match the component geometry", () => {
    expect(APP_MARK_SVG[app]).toContain(`viewBox="${APP_MARK_VIEWBOX[app]}"`);
    expect(APP_TILE_SVG[app]).toContain('viewBox="0 0 1024 1024"');
    expect(APP_MARK_SVG[app]).toContain('"currentColor"');
    expect(APP_TILE_SVG[app]).toContain('<rect width="1024" height="1024" rx="224" fill="#000"/>');
    expect(APP_TILE_LIGHT_SVG[app]).toContain('<rect width="1024" height="1024" rx="224" fill="#fff"/>');
    for (const d of APP_MARKS[app].paths) {
      expect(APP_MARK_SVG[app]).toContain(`d="${d}"`);
      expect(APP_TILE_SVG[app]).toContain(`d="${d}"`);
    }
  });
});

describe("AppMark props", () => {
  it("sets width and height from size (default 24)", async () => {
    const svg = await render(<AppMark app="verve" />);
    expect(svg.getAttribute("height")).toBe("24");
    expect(svg.getAttribute("width")).toBe("24");
    const sized = await render(<AppMark app="projectv" size={64} />);
    expect(sized.getAttribute("height")).toBe("64");
    expect(sized.getAttribute("width")).toBe("64");
    const tile = await render(<AppMark app="projectv" variant="tile" size={64} />);
    expect(tile.getAttribute("width")).toBe("64");
    expect(tile.getAttribute("height")).toBe("64");
    const css = await render(<AppMark app="verve" size="2rem" />);
    expect(css.getAttribute("width")).toBe("2rem");
    expect(css.getAttribute("height")).toBe("2rem");
  });

  it("is aria-hidden without a title", async () => {
    const svg = await render(<AppMark app="vhub" />);
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.querySelector("title")).toBeNull();
  });

  it("is a labelled img with a title", async () => {
    const svg = await render(<AppMark app="vhub" title="Vhub" />);
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-hidden")).toBeNull();
    const title = svg.querySelector("title");
    expect(title?.textContent).toBe("Vhub");
    expect(svg.getAttribute("aria-labelledby")).toBe(title?.id);
  });

  it("passes className and data attributes through", async () => {
    const svg = await render(<AppMark app="vmem" variant="tile" className="x" data-testid="m" />);
    expect(svg.getAttribute("class")).toBe("x");
    expect(svg.getAttribute("data-testid")).toBe("m");
    expect(svg.getAttribute("data-app")).toBe("vmem");
    expect(svg.getAttribute("data-variant")).toBe("tile");
  });
});

describe("APP_MARK_VIEWBOX", () => {
  it("is square and equal to the tile viewBox for every app", () => {
    for (const app of APP_NAMES) {
      const [, , w = 0, h = 0] = APP_MARK_VIEWBOX[app].split(" ").map(Number);
      expect(w).toBeGreaterThan(0);
      expect(w).toBe(h);
      expect(APP_MARK_VIEWBOX[app]).toBe(MARK_VIEWBOX);
      expect(APP_MARK_VIEWBOX[app]).toBe("0 0 1024 1024");
    }
  });
});

describe.each(APP_NAMES)("shared viewBox %s", (app) => {
  it("contains the path geometry (stroke marks grown by half the stroke width)", () => {
    const [x0, y0, x1, y1] = markBBox(app);
    const [x = 0, y = 0, w = 0, h = 0] = APP_MARK_VIEWBOX[app].split(" ").map(Number);
    expect(x).toBeLessThanOrEqual(x0);
    expect(y).toBeLessThanOrEqual(y0);
    expect(x + w).toBeGreaterThanOrEqual(x1);
    expect(y + h).toBeGreaterThanOrEqual(y1);
  });
});

describe("pathBBox", () => {
  it("handles lines, curves and arcs", () => {
    expect(pathBBox("M10 20L30 5L40 50")).toEqual([10, 5, 40, 50]);
    const [, , , qMaxY] = pathBBox("M0 0Q50 100 100 0");
    expect(qMaxY).toBeCloseTo(50, 6);
    const [, cMinY] = pathBBox("M0 0C0 -40 100 -40 100 0");
    expect(cMinY).toBeCloseTo(-30, 6);
    const [ax0, ay0, ax1, ay1] = pathBBox("M100 0A100 100 0 0 1 -100 0");
    expect([ax0, ay0, ax1, ay1].map(Math.round)).toEqual([-100, 0, 100, 100]);
  });

  it("grows stroke marks by half the stroke width and leaves fills alone", () => {
    expect(markBBox("vhub")[0]).toBe(211 - 25);
    expect(markBBox("projectv")[0]).toBe(172);
  });
});

describe("generated SVG helpers", () => {
  it("builds the adaptive layer and the padded extension icon", () => {
    expect(appAdaptiveSvg("velth", "#fff")).toContain('viewBox="0 0 432 432"');
    const ext = appExtension128Svg("velth");
    expect(ext).toContain('viewBox="0 0 128 128"');
    expect(ext).toContain('x="16" y="16" width="96" height="96"');
  });
});

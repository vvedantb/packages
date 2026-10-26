// Geometry and raw SVG strings for the family app marks. No imports, so the
// asset script can load this file directly with Node.

export const APP_NAMES = ["projectv", "vibot", "vhub", "vmem", "verve", "velth"] as const;

export type AppName = (typeof APP_NAMES)[number];

/** `mark`: glyph only on an equalised square viewBox, follows `currentColor`. `tile`: white glyph on a black tile. `tile-light`: black glyph on a white tile. */
export type AppMarkVariant = "mark" | "tile" | "tile-light";

export const MARK_VIEWBOX = "0 0 1024 1024";
export const MARK_STROKE_WIDTH = 50;
export const TILE_RADIUS = 224;

export type MarkShape = {
  /** Filled shapes (no stroke) versus lines (50 wide, round caps by default). */
  kind: "fill" | "stroke";
  /** Path data on the 1024 grid. */
  paths: readonly string[];
  /** Stroke width override on the 1024 grid. Defaults to `MARK_STROKE_WIDTH`. */
  strokeWidth?: number;
  /** Line cap override. Defaults to `"round"`. */
  linecap?: "butt" | "round";
};

/** Stroke width of a mark on the 1024 grid. */
export function markStrokeWidth(app: AppName): number {
  return APP_MARKS[app].strokeWidth ?? MARK_STROKE_WIDTH;
}

/** Line cap of a mark. */
export function markLinecap(app: AppName): "butt" | "round" {
  return APP_MARKS[app].linecap ?? "round";
}

/**
 * Glyphs sized by one rule: longest side = 512 * min(1.2, aspect^0.25), centred halfway between
 * the bounding-box centre and the centre of mass. `verve` and `velth` are the final vectors.
 * The others are traced from the approved 1024px renders.
 */
export const APP_MARKS: Record<AppName, MarkShape> = {
  projectv: {
    kind: "fill",
    paths: ["M172 398L260 397L418 558L580 377L858 378L824 415L604 415L452 598L466 611L622 433L808 433L773 471L658 471L491 671L442 672Z"],
  },
  vibot: {
    kind: "fill",
    paths: [
      "M295 314L396 314L396 574C520 540 620 440 655 314L711 314C680 470 560 590 396 627L390 627L390 651L396 651C560 610 700 480 734 314L789 314C740 540 560 712 295 712Z",
    ],
  },
  vhub: {
    kind: "stroke",
    paths: ["M211 512L743 512", "M415 512C500 512 540 363 743 363", "M415 512C500 512 540 661 743 661"],
  },
  vmem: {
    kind: "stroke",
    strokeWidth: 58,
    linecap: "butt",
    paths: [
      "M693.2 379.5A227.25 227.25 0 0 1 581.0 732.7",
      "M442.5 732.7A227.25 227.25 0 0 1 330.9 378.7",
      "M397.3 319.9A227.25 227.25 0 0 1 627.1 320.4",
    ],
  },
  verve: {
    kind: "stroke",
    paths: [
      "M285.4 344.1Q428.6 344.1 512 552.6Q595.4 344.1 738.6 344.1",
      "M285.4 344.1L285.4 579.8Q428.6 579.8 512 706.7Q595.4 579.8 738.6 579.8L738.6 344.1",
    ],
  },
  velth: {
    kind: "stroke",
    paths: [
      "M512 732.3C379.8 652.1 289.7 471.9 299.7 301.6C419.9 371.7 500 552 512 732.3Z",
      "M512 732.3C644.2 652.1 734.3 471.9 724.3 301.6C604.1 371.7 524 552 512 732.3Z",
    ],
  },
};

type Point = [number, number];
type Box = [minX: number, minY: number, maxX: number, maxY: number];

/** Roots in (0, 1) of the derivative of a Bezier with 1D control values `v` (quadratic or cubic). */
function bezierExtrema(v: number[]): number[] {
  const roots: number[] = [];
  if (v.length === 3) {
    const d = v[0]! - 2 * v[1]! + v[2]!;
    if (d !== 0) roots.push((v[0]! - v[1]!) / d);
  } else {
    const a = -v[0]! + 3 * v[1]! - 3 * v[2]! + v[3]!;
    const b = 2 * (v[0]! - 2 * v[1]! + v[2]!);
    const c = v[1]! - v[0]!;
    if (Math.abs(a) < 1e-12) {
      if (b !== 0) roots.push(-c / b);
    } else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) roots.push((-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a));
    }
  }
  return roots.filter((t) => t > 0 && t < 1);
}

function bezierAt(v: number[], t: number): number {
  const u = 1 - t;
  const [p0, p1, p2, p3] = v as [number, number, number, number];
  return v.length === 3 ? u * u * p0 + 2 * u * t * p1 + t * t * p2 : u ** 3 * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t ** 3 * p3;
}

/** Extreme points of an SVG elliptical arc (endpoint form, no rotation), including both ends. */
function arcPoints(from: Point, [rx0, ry0, , large, sweep, x, y]: [number, number, number, number, number, number, number]): Point[] {
  const [x0, y0] = from;
  let rx = Math.abs(rx0);
  let ry = Math.abs(ry0);
  const dx = (x0 - x) / 2;
  const dy = (y0 - y) / 2;
  const lambda = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx;
  const den = rx * rx * dy * dy + ry * ry * dx * dx;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx = k * ((rx * dy) / ry) + (x0 + x) / 2;
  const cy = k * (-(ry * dx) / rx) + (y0 + y) / 2;
  const a0 = Math.atan2((y0 - cy) / ry, (x0 - cx) / rx);
  let delta = Math.atan2((y - cy) / ry, (x - cx) / rx) - a0;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  const points: Point[] = [from, [x, y]];
  for (let q = -6; q <= 6; q++) {
    const a = (q * Math.PI) / 2;
    const t = (a - a0) / delta;
    if (t > 0 && t < 1) points.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return points;
}

/** Exact bounding box of absolute `M`, `L`, `Q`, `C` and `A` path data (the only commands the marks use). Returns [minX, minY, maxX, maxY]. */
export function pathBBox(d: string): Box {
  const tokens = d.match(/[MLQCA]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const points: Point[] = [];
  let cmd = "";
  let cur: Point = [0, 0];
  const argc: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, A: 7 };
  for (let i = 0; i < tokens.length; ) {
    if (/[A-Z]/.test(tokens[i]!)) cmd = tokens[i++]!;
    const n = argc[cmd];
    if (!n) throw new Error(`Unsupported path command: ${cmd}`);
    const a = tokens.slice(i, i + n).map(Number);
    i += n;
    const end: Point = [a[n - 2]!, a[n - 1]!];
    if (cmd === "Q" || cmd === "C") {
      const xs = [cur[0], ...a.filter((_, j) => j % 2 === 0)];
      const ys = [cur[1], ...a.filter((_, j) => j % 2 === 1)];
      for (const t of new Set([...bezierExtrema(xs), ...bezierExtrema(ys)])) points.push([bezierAt(xs, t), bezierAt(ys, t)]);
    } else if (cmd === "A") {
      points.push(...arcPoints(cur, a as Parameters<typeof arcPoints>[1]));
    }
    points.push(end);
    cur = end;
  }
  return [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1])), Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))];
}

/** Tight box of a mark: union of its paths, grown by half the stroke width for stroke marks. Returns [minX, minY, maxX, maxY]. */
export function markBBox(app: AppName): Box {
  const { kind, paths } = APP_MARKS[app];
  const boxes = paths.map(pathBBox);
  const pad = kind === "stroke" ? markStrokeWidth(app) / 2 : 0;
  return [Math.min(...boxes.map((b) => b[0])) - pad, Math.min(...boxes.map((b) => b[1])) - pad, Math.max(...boxes.map((b) => b[2])) + pad, Math.max(...boxes.map((b) => b[3])) + pad];
}


/**
 * Shared crop for the five app glyphs (`vibot`, `vhub`, `vmem`, `verve`, `velth`) in the plain logo (`variant="mark"`,
 * `appMarkSvg`, `Icon*`): the union of their `markBBox` results on the 1024 tile grid (x 186 to 789, y 259.96 to 761.7),
 * centred in a square of side max(width, height) x 1.04 (about 4% padding), then rounded outward to whole units.
 * `projectv` is left out so its wide brand mark does not shrink the app glyphs. Not the full tile. Checked in tests.
 */
export const APP_MARK_CROP_VIEWBOX = "173 197 629 629";

/**
 * Own tight square for `projectv` (a brand mark, not an app): `markBBox("projectv")` (x 172 to 858, y 377 to 672),
 * centred on the shorter axis and rounded outward to whole units, with no extra padding.
 */
export const PROJECTV_MARK_VIEWBOX = "172 181 687 687";

/** Plain-mark viewBox per app: the shared crop for the five apps, a tight square for `projectv`. Always square. */
export const APP_MARK_VIEWBOX: Record<AppName, string> = {
  projectv: PROJECTV_MARK_VIEWBOX,
  vibot: APP_MARK_CROP_VIEWBOX,
  vhub: APP_MARK_CROP_VIEWBOX,
  vmem: APP_MARK_CROP_VIEWBOX,
  verve: APP_MARK_CROP_VIEWBOX,
  velth: APP_MARK_CROP_VIEWBOX,
};

/** Width over height of a mark's viewBox. Always about 1, because the viewBoxes are square. Kept for API stability; do not use it for sizing. */
export function markAspect(app: AppName): number {
  const [, , w = 1, h = 1] = APP_MARK_VIEWBOX[app].split(" ").map(Number);
  return w / h;
}

const NS = 'xmlns="http://www.w3.org/2000/svg"';

/** Attributes that paint the glyph in `color`. */
export function markPaintAttrs(app: AppName, color: string): string {
  return APP_MARKS[app].kind === "fill" ? `fill="${color}"` : `fill="none" stroke="${color}" stroke-width="${markStrokeWidth(app)}" stroke-linecap="${markLinecap(app)}" stroke-linejoin="round"`;
}

function pathElements(app: AppName): string {
  return APP_MARKS[app].paths.map((d) => `<path d="${d}"/>`).join("");
}

/** Glyph only on its equalised square viewBox, painted with `color` (default `currentColor`). */
export function appMarkSvg(app: AppName, color = "currentColor"): string {
  return `<svg ${NS} viewBox="${APP_MARK_VIEWBOX[app]}" ${markPaintAttrs(app, color)}>${pathElements(app)}</svg>\n`;
}

/** Tile with a glyph. `radius` 0 gives a full-bleed square (apple-touch, maskable). */
export function appTileSvg(app: AppName, tone: "dark" | "light" = "dark", radius = TILE_RADIUS): string {
  const [bg, fg] = tone === "dark" ? ["#000", "#fff"] : ["#fff", "#000"];
  const rx = radius > 0 ? ` rx="${radius}"` : "";
  return `<svg ${NS} viewBox="${MARK_VIEWBOX}"><rect width="1024" height="1024"${rx} fill="${bg}"/><g ${markPaintAttrs(app, fg)}>${pathElements(app)}</g></svg>\n`;
}

/** Android adaptive-icon layer: 432 canvas, glyph scaled into the 288 inner square. */
export function appAdaptiveSvg(app: AppName, color: string): string {
  const scale = 288 / 1024;
  return `<svg ${NS} viewBox="0 0 432 432"><g transform="translate(216 216) scale(${scale}) translate(-512 -512)" ${markPaintAttrs(app, color)}>${pathElements(app)}</g></svg>\n`;
}

/** Chrome extension 128px icon: 96px tile plus 16px transparent padding. */
export function appExtension128Svg(app: AppName): string {
  const inner = appTileSvg(app).replace(`<svg ${NS} viewBox="${MARK_VIEWBOX}">`, `<svg ${NS} x="16" y="16" width="96" height="96" viewBox="${MARK_VIEWBOX}">`);
  return `<svg ${NS} viewBox="0 0 128 128">${inner.trim()}</svg>\n`;
}

export const APP_MARK_SVG = Object.fromEntries(APP_NAMES.map((app) => [app, appMarkSvg(app)])) as Record<AppName, string>;
export const APP_TILE_SVG = Object.fromEntries(APP_NAMES.map((app) => [app, appTileSvg(app)])) as Record<AppName, string>;
export const APP_TILE_LIGHT_SVG = Object.fromEntries(APP_NAMES.map((app) => [app, appTileSvg(app, "light")])) as Record<AppName, string>;

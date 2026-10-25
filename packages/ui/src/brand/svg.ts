// Geometry and raw SVG strings for the family app marks. No imports, so the
// asset script can load this file directly with Node.

export const APP_NAMES = ["projectv", "vibot", "vhub", "vmem", "verve", "velth"] as const;

export type AppName = (typeof APP_NAMES)[number];

/** `mark`: glyph only, follows `currentColor`. `tile`: white glyph on a black tile. `tile-light`: black glyph on a white tile. */
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

const NS = 'xmlns="http://www.w3.org/2000/svg"';

/** Attributes that paint the glyph in `color`. */
export function markPaintAttrs(app: AppName, color: string): string {
  return APP_MARKS[app].kind === "fill" ? `fill="${color}"` : `fill="none" stroke="${color}" stroke-width="${markStrokeWidth(app)}" stroke-linecap="${markLinecap(app)}" stroke-linejoin="round"`;
}

function pathElements(app: AppName): string {
  return APP_MARKS[app].paths.map((d) => `<path d="${d}"/>`).join("");
}

/** Glyph only, painted with `color` (default `currentColor`). */
export function appMarkSvg(app: AppName, color = "currentColor"): string {
  return `<svg ${NS} viewBox="${MARK_VIEWBOX}" ${markPaintAttrs(app, color)}>${pathElements(app)}</svg>\n`;
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

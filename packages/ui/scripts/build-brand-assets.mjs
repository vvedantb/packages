// Writes the favicon, PWA, extension and Android icon sets for the family apps.
//
//   node scripts/build-brand-assets.mjs --out <dir> [--app <name>] [--no-png] [--dry-run]
//
// SVGs are always written. PNGs and favicon.ico need `rsvg-convert`; without it they are skipped
// with a message. Layout: <dir>/<app>/{mark,icon,favicon,icon-light}.svg, PNGs, extension/, android/.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_NAMES, appAdaptiveSvg, appExtension128Svg, appMarkSvg, appTileSvg } from "../src/brand/svg.ts";

/** Whether `rsvg-convert` can be run. */
export function hasRsvg() {
  return spawnSync("rsvg-convert", ["--version"], { stdio: "ignore" }).status === 0;
}

/** Renders `svg` to a square PNG buffer of `px` pixels. */
export function renderPng(svg, px) {
  const result = spawnSync("rsvg-convert", ["-w", String(px), "-h", String(px), "-f", "png"], { input: svg, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`rsvg-convert failed: ${String(result.stderr)}`);
  return result.stdout;
}

/** An ICO file that embeds each PNG (sizes in pixels, same order). */
export function icoFromPngs(pngs, sizes) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach((png, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(sizes[i] % 256, at);
    header.writeUInt8(sizes[i] % 256, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs]);
}

/** SVG files for one app, as `[relative path, content]`. */
export function svgFiles(app) {
  const tile = appTileSvg(app);
  return [
    ["mark.svg", appMarkSvg(app)],
    ["icon.svg", tile],
    ["favicon.svg", tile],
    ["icon-light.svg", appTileSvg(app, "light")],
    ["android/adaptive-foreground.svg", appAdaptiveSvg(app, "#fff")],
  ];
}

/** PNG files for one app, as `[relative path, svg source, pixels]`. */
export function pngSpecs(app) {
  const tile = appTileSvg(app);
  const square = appTileSvg(app, "dark", 0);
  return [
    ["favicon-16.png", tile, 16],
    ["favicon-32.png", tile, 32],
    ["apple-touch-icon.png", square, 180],
    ["icon-192.png", tile, 192],
    ["icon-512.png", tile, 512],
    ["icon-1024.png", tile, 1024],
    ["icon-light.png", appTileSvg(app, "light"), 512],
    ["maskable-512.png", square, 512],
    ["extension/icon-16.png", tile, 16],
    ["extension/icon-32.png", tile, 32],
    ["extension/icon-48.png", tile, 48],
    ["extension/icon-128.png", appExtension128Svg(app), 128],
    ["android/adaptive-foreground-432.png", appAdaptiveSvg(app, "#fff"), 432],
    ["android/adaptive-monochrome-432.png", appAdaptiveSvg(app, "#000"), 432],
  ];
}

/** Writes (or, with `dryRun`, lists) the set for each app. Returns the relative file paths per app and any skip notes. */
export function buildBrandAssets({ out, apps = APP_NAMES, png = true, dryRun = false }) {
  const written = [];
  const notes = [];
  const withPng = png && hasRsvg();
  if (png && !withPng) notes.push("rsvg-convert not found: PNGs and favicon.ico skipped (SVGs written).");
  const put = (file, data) => {
    written.push(file);
    if (dryRun) return;
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), data);
  };
  for (const app of apps) {
    for (const [name, svg] of svgFiles(app)) put(join(app, name), svg);
    if (!withPng) continue;
    for (const [name, svg, px] of pngSpecs(app)) put(join(app, name), dryRun ? "" : renderPng(svg, px));
    const sizes = [16, 32, 48];
    const tile = appTileSvg(app);
    put(join(app, "favicon.ico"), dryRun ? "" : icoFromPngs(sizes.map((px) => renderPng(tile, px)), sizes));
  }
  return { written, notes };
}

function parseArgs(argv) {
  const args = { out: "", app: "", png: true, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") args.out = argv[++i] ?? "";
    else if (arg === "--app") args.app = argv[++i] ?? "";
    else if (arg === "--no-png") args.png = false;
    else if (arg === "--dry-run") args.dryRun = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.out) throw new Error("--out <dir> is required");
  if (args.app && !APP_NAMES.includes(args.app)) throw new Error(`--app must be one of ${APP_NAMES.join(", ")}`);
  return args;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const { written, notes } = buildBrandAssets({ out: args.out, apps: args.app ? [args.app] : APP_NAMES, png: args.png, dryRun: args.dryRun });
    for (const file of written) console.log(`${args.dryRun ? "would write" : "wrote"} ${join(args.out, file)}`);
    for (const note of notes) console.warn(note);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

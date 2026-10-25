// Regenerates brand/family-sheet.png: the six marks at 200px and 32px on #111, with lowercase labels.
//
//   node scripts/build-brand-sheet.mjs [output.png]
//
// Renders with `rsvg-convert` when present, otherwise headless Chrome (`google-chrome` or `chromium`).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_NAMES, appTileSvg } from "../src/brand/svg.ts";
import { hasRsvg } from "./build-brand-assets.mjs";

const PAD = 40;
const CELL = 240;
export const SHEET_WIDTH = PAD + CELL * APP_NAMES.length;
export const SHEET_HEIGHT = 380;

const nested = (app, x, y, size) =>
  appTileSvg(app).trim().replace(/^<svg [^>]*>/, `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 1024 1024">`);

/** The sheet as one SVG string. */
export function sheetSvg() {
  const parts = APP_NAMES.flatMap((app, i) => {
    const x = PAD + i * CELL;
    return [
      nested(app, x, 30, 200),
      `<text x="${x + 100}" y="262" fill="#ddd" font-family="sans-serif" font-size="20" text-anchor="middle">${app}</text>`,
      nested(app, x + 84, 292, 32),
      `<text x="${x + 100}" y="352" fill="#999" font-family="sans-serif" font-size="14" text-anchor="middle">${app}</text>`,
    ];
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_WIDTH}" height="${SHEET_HEIGHT}" viewBox="0 0 ${SHEET_WIDTH} ${SHEET_HEIGHT}"><rect width="100%" height="100%" fill="#111"/>${parts.join("")}</svg>\n`;
}

function renderWithChrome(svg, output) {
  const dir = mkdtempSync(join(tmpdir(), "brand-sheet-"));
  const page = join(dir, "sheet.html");
  writeFileSync(page, `<!doctype html><body style="margin:0;background:#111">${svg}</body>`);
  for (const bin of ["google-chrome", "chromium", "chromium-browser"]) {
    // Chrome can linger after it writes the screenshot, so the timeout is not an error on its own.
    spawnSync(bin, ["--headless", "--no-sandbox", "--hide-scrollbars", `--screenshot=${output}`, `--window-size=${SHEET_WIDTH},${SHEET_HEIGHT}`, `file://${page}`], { timeout: 30000, stdio: "ignore" });
    if (existsSync(output)) return;
  }
  throw new Error("Neither rsvg-convert nor headless Chrome could render the sheet.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "../brand/family-sheet.png"));
  const svg = sheetSvg();
  if (hasRsvg()) {
    const result = spawnSync("rsvg-convert", ["-f", "png"], { input: svg, maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(String(result.stderr));
    writeFileSync(output, result.stdout);
  } else renderWithChrome(svg, output);
  console.log(`wrote ${output}`);
}

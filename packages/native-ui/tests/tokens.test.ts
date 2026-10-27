import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { palette, withAlpha } from "../src/palette";
import { fontClass, WORDMARK } from "../src/typography";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const uiDir = join(root, "..", "ui");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/** oklch(L% C H) to sRGB hex, clipped to sRGB. */
function oklchToHex(lightness: number, chroma: number, hue: number): string {
  const l = lightness / 100;
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  return `#${linear
    .map((channel) => {
      const x = Math.min(1, Math.max(0, channel));
      const encoded = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
      return Math.round(encoded * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

/** A tokens.css colour (`oklch(...)` or `rgb(r g b / a)`) in the palette's notation. */
function cssColour(value: string): string {
  const oklch = value.match(/^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)$/);
  if (oklch) return oklchToHex(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]));
  const rgb = value.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${rgb[4]})`;
  throw new Error(`Unsupported colour ${value}`);
}

const PALETTE_VARS: Record<Exclude<keyof typeof palette, "destructive">, string> = {
  primary: "--accent",
  primaryForeground: "--accent-foreground",
  danger: "--danger",
  dangerForeground: "--danger-foreground",
  success: "--success",
  successForeground: "--success-foreground",
  warning: "--warning",
  warningForeground: "--warning-foreground",
  default: "--default",
  defaultForeground: "--default-foreground",
  overlay: "--overlay",
  overlayForeground: "--overlay-foreground",
  segment: "--segment",
  segmentForeground: "--segment-foreground",
  surfaceTertiary: "--surface-tertiary",
  fieldPlaceholder: "--field-placeholder",
  backdrop: "--backdrop",
};

describe("tokens", () => {
  it("keeps the same body as @vvedantb/ui tokens/src/native.ts (the ui package has the same check)", () => {
    const body = (path: string) => read(path).replace(/^\/\*\*[\s\S]*?\*\/\s*/, "");
    expect(body(join(root, "src/tokens.ts"))).toBe(
      body(join(uiDir, "tokens/src/native.ts")),
    );
  });
});

describe("palette", () => {
  const css = read(join(uiDir, "tokens/src/tokens.css"));
  const darkStart = css.indexOf('.dark,\n  [data-theme="dark"]');
  const blocks = { light: css.slice(0, darkStart), dark: css.slice(darkStart) };

  for (const [key, name] of Object.entries(PALETTE_VARS)) {
    it(`${key} matches ${name} in tokens.css`, () => {
      for (const scheme of ["light", "dark"] as const) {
        const match = blocks[scheme].match(new RegExp(`\\n\\s*${name}:\\s*([^;]+);`));
        expect(match, `${name} (${scheme})`).not.toBeNull();
        expect(palette[key as keyof typeof PALETTE_VARS][scheme], `${key}.${scheme}`).toBe(
          cssColour(match![1]!.trim()),
        );
      }
    });
  }

  it("destructive matches the web destructive Button fill", () => {
    const button = read(join(uiDir, "src/ui/button.tsx"));
    const match = button.match(/destructive:\s*"bg-\[oklch\(([\d.]+)%_([\d.]+)_([\d.]+)\)\]/);
    expect(match).not.toBeNull();
    expect(palette.destructive).toBe(
      oklchToHex(Number(match![1]), Number(match![2]), Number(match![3])),
    );
  });

  it("withAlpha turns #rrggbb into rgba()", () => {
    expect(withAlpha("#ff373c", 0.12)).toBe("rgba(255, 55, 60, 0.12)");
    expect(withAlpha("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
  });
});

describe("Instrument Sans wordmark", () => {
  it("matches the web AppWordmark and .landing-wordmark-text", () => {
    const landing = read(join(uiDir, "src/marketing/landing.css"));
    const rule = landing.match(/\.landing-wordmark-text\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(rule).toMatch(/font-weight:\s*500;/);
    expect(rule).toMatch(/letter-spacing:\s*-0\.02em;/);
    expect(WORDMARK.fontWeight).toBe(500);
    expect(WORDMARK.letterSpacingEm).toBe(-0.02);
    expect(WORDMARK.fontClass).toBe(fontClass.medium);

    const web = read(join(uiDir, "src/brand/AppWordmark.tsx"));
    expect(web).toMatch(new RegExp(`const ICON_SCALE = ${WORDMARK.iconScale};`));
    expect(web).toMatch(new RegExp(`gap: "${WORDMARK.gapEm}em"`));
  });
});

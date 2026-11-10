import { describe, expect, it } from "vitest";
import { buttonColors, checkboxColors, fieldStyle, fieldTextStyle, isCompactOverlay, sizeStyle, switchColors, switchSize, tabColors, tabTrackStyle, tabTriggerSize, textStyle, typeStyle, type ButtonVariant, type TabsVariant } from "../src/controlStyles";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

const schemes = ["light", "dark"] as const;

/** WCAG contrast ratio of two `#rrggbb` colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("buttonColors", () => {
  it("fills default and primary with the palette primary, as the web does", () => {
    for (const scheme of schemes) {
      for (const variant of ["default", "primary"] as const) {
        expect(buttonColors(variant, scheme)).toEqual({
          backgroundColor: palette.primary[scheme],
          borderColor: "transparent",
          color: palette.primaryForeground[scheme],
        });
      }
    }
  });

  it("uses the web neutral secondary and bordered outline", () => {
    for (const scheme of schemes) {
      expect(buttonColors("secondary", scheme)).toEqual({
        backgroundColor: palette.default[scheme],
        borderColor: "transparent",
        color: palette.defaultForeground[scheme],
      });
      expect(buttonColors("outline", scheme)).toEqual({
        backgroundColor: "transparent",
        borderColor: tokens.color.border[scheme],
        color: tokens.color.foreground[scheme],
      });
    }
  });

  it("keeps the destructive fill and draws ghost and link without one", () => {
    expect(buttonColors("destructive", "light")?.backgroundColor).toBe(palette.destructive);
    expect(buttonColors("ghost", "light")).toMatchObject({
      backgroundColor: "transparent",
      color: tokens.color.muted.light,
    });
    expect(buttonColors("link", "dark")).toMatchObject({
      backgroundColor: "transparent",
      color: palette.primary.dark,
    });
  });

  it("leaves only tinted to the pink NativeWind classes", () => {
    const variants: ButtonVariant[] = [
      "primary",
      "default",
      "secondary",
      "outline",
      "destructive",
      "ghost",
      "link",
    ];
    for (const variant of variants) expect(buttonColors(variant, "light"), variant).not.toBeNull();
    expect(buttonColors("tinted", "light")).toBeNull();
  });
});

describe("fields", () => {
  it("are white (dark: surface), bordered and use the web field radius (10)", () => {
    expect(tokens.radius.field).toBe(10);
    for (const scheme of schemes) {
      expect(fieldStyle(scheme)).toEqual({
        backgroundColor: tokens.color.surface[scheme],
        borderColor: tokens.color.border[scheme],
        borderRadius: tokens.radius.field,
      });
      expect(fieldTextStyle(scheme)).toEqual({ color: tokens.color.foreground[scheme] });
    }
  });
});

describe("textStyle", () => {
  it("gives the scheme's foreground, muted and dialog description colours", () => {
    for (const scheme of schemes) {
      expect(textStyle("foreground", scheme)).toEqual({ color: tokens.color.foreground[scheme] });
      expect(textStyle("muted", scheme)).toEqual({ color: tokens.color.muted[scheme] });
      expect(textStyle("overlayMuted", scheme)).toEqual({ color: palette.overlayMuted[scheme] });
    }
    expect(textStyle("foreground", "dark").color).not.toBe(textStyle("foreground", "light").color);
  });
});

describe("tabColors", () => {
  const variants: TabsVariant[] = ["pills", "segmented", "soft"];
  it("labels a selected tab in the neutral primary, not the accent", () => {
    for (const scheme of schemes) {
      for (const variant of ["pills", "segmented"] as const) {
        expect(tabColors(variant, true, scheme).color).toBe(palette.primary[scheme]);
      }
      for (const variant of variants) {
        for (const selected of [true, false]) {
          const { backgroundColor, color } = tabColors(variant, selected, scheme);
          // Neutral: channels within 2 of each other (dark surface-secondary
          // is #242323); the pink accent #db2777 spreads 180.
          for (const value of [backgroundColor, color].filter((c) => c !== "transparent")) {
            const channels = [1, 3, 5].map((i) => Number.parseInt(value.slice(i, i + 2), 16));
            const spread = Math.max(...channels) - Math.min(...channels);
            expect(spread, `${variant} ${selected} ${scheme} ${value}`).toBeLessThanOrEqual(2);
          }
        }
      }
    }
  });

  it("keeps labels readable on what is behind them: no light label on a light fill", () => {
    for (const scheme of schemes) {
      for (const variant of variants) {
        const on = tabColors(variant, true, scheme);
        expect(contrast(on.color, on.backgroundColor), `${variant} selected ${scheme}`).toBeGreaterThanOrEqual(4.5);
        // Unselected tabs have no fill: the label sits on the track or the page.
        // 4:1 is the web's own light value (--muted on --default is 4.04).
        const behind = variant === "segmented" ? tabTrackStyle(scheme).backgroundColor : tokens.color.background[scheme];
        const off = tabColors(variant, false, scheme);
        expect(contrast(off.color, behind), `${variant} unselected ${scheme}`).toBeGreaterThanOrEqual(4);
      }
    }
    // The 0.3.3 dark segment: a near-white label on `bg-surface`, which an app theme that nests `dark` resolves to white.
    expect(contrast(tokens.color.foreground.dark, tokens.color.white)).toBeLessThan(1.1);
  });
});

describe("placeholders", () => {
  it("are the web field placeholder colour, readable on the field (4.5:1)", () => {
    for (const scheme of schemes) {
      expect(palette.fieldPlaceholder[scheme]).toBe(tokens.color.muted[scheme]);
      expect(
        contrast(palette.fieldPlaceholder[scheme], fieldStyle(scheme).backgroundColor),
        scheme,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("checkboxColors", () => {
  it("fills a checked box with the palette primary, as the web does (not the accent)", () => {
    for (const scheme of schemes) {
      expect(checkboxColors(true, scheme)).toEqual({
        backgroundColor: palette.primary[scheme],
        borderColor: palette.primary[scheme],
        color: palette.primaryForeground[scheme],
      });
    }
  });

  it("draws an unchecked box as a field: surface fill, border edge", () => {
    for (const scheme of schemes) {
      expect(checkboxColors(false, scheme)).toMatchObject({
        backgroundColor: tokens.color.surface[scheme],
        borderColor: tokens.color.border[scheme],
      });
    }
  });
});

describe("switchColors", () => {
  it("fills the checked track with the palette primary", () => {
    for (const scheme of schemes) {
      expect(switchColors(true, scheme)).toEqual({
        track: { backgroundColor: palette.primary[scheme], borderColor: palette.primary[scheme] },
        thumb: { backgroundColor: palette.primaryForeground[scheme] },
      });
    }
  });

  it("gives the unchecked track a fill and border that differ from the thumb", () => {
    for (const scheme of schemes) {
      const { track, thumb } = switchColors(false, scheme);
      expect(track.backgroundColor).not.toBe(thumb.backgroundColor);
      expect(track.borderColor).not.toBe("transparent");
    }
  });
});

describe("typeStyle", () => {
  it("is the web font-medium (500) and font-semibold (600) as a numeric weight", () => {
    expect(typeStyle("medium")).toEqual({ fontWeight: "500" });
    expect(typeStyle("semibold")).toEqual({ fontWeight: "600" });
    expect(Number(typeStyle("medium").fontWeight)).toBe(500);
    expect(Number(typeStyle("semibold").fontWeight)).toBe(600);
  });
});

describe("sizeStyle", () => {
  it("is the Tailwind size and default line height, or leading-tight or leading-snug", () => {
    expect(sizeStyle("text-xs")).toEqual({ fontSize: 12, lineHeight: 16 });
    expect(sizeStyle("text-sm")).toEqual({ fontSize: 14, lineHeight: 20 });
    expect(sizeStyle("text-base")).toEqual({ fontSize: 16, lineHeight: 24 });
    expect(sizeStyle("text-lg")).toEqual({ fontSize: 18, lineHeight: 28 });
    expect(sizeStyle("text-xl")).toEqual({ fontSize: 20, lineHeight: 28 });
    expect(sizeStyle("text-2xl")).toEqual({ fontSize: 24, lineHeight: 32 });
    expect(sizeStyle("text-base", "tight")).toEqual({ fontSize: 16, lineHeight: 20 });
    expect(sizeStyle("text-2xl", "tight")).toEqual({ fontSize: 24, lineHeight: 30 });
    expect(sizeStyle("text-sm", "snug")).toEqual({ fontSize: 14, lineHeight: 19.25 });
  });
});

describe("isCompactOverlay", () => {
  it("is true for phones and short landscape windows, false for tablets and desktops", () => {
    expect(isCompactOverlay(390, 844)).toBe(true);
    expect(isCompactOverlay(844, 390)).toBe(true);
    expect(isCompactOverlay(639, 900)).toBe(true);
    expect(isCompactOverlay(640, 500)).toBe(true);
    expect(isCompactOverlay(640, 501)).toBe(false);
    expect(isCompactOverlay(768, 1024)).toBe(false);
    expect(isCompactOverlay(1280, 800)).toBe(false);
  });
});

describe("switchSize", () => {
  it("keeps the 0.3.4 size with larger text", () => {
    expect(switchSize(true)).toMatchObject({ track: "h-8 w-14", thumb: "h-7 w-7", on: "translate-x-6" });
  });
});

describe("tabTriggerSize", () => {
  const variants: TabsVariant[] = ["pills", "segmented", "soft"];

  it("keeps the larger-text sizes", () => {
    for (const variant of variants) {
      expect(tabTriggerSize(variant, "default", true)).toEqual({ minHeight: 56, className: "px-4 py-3", textClassName: "text-xl" });
      expect(tabTriggerSize(variant, "sm", true)).toEqual({ minHeight: 48, className: "px-4 py-2", textClassName: "text-lg" });
    }
  });
});

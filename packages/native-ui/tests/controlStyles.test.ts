import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buttonColors,
  fieldStyle,
  fieldTextStyle,
  switchColors,
  type ButtonVariant,
} from "../src/controlStyles";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, "src", file), "utf8");
const schemes = ["light", "dark"] as const;

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

describe("Button (source contract)", () => {
  const button = read("Button.tsx");

  it("applies buttonColors to the fill and the label", () => {
    expect(button).toMatch(/const colors = buttonColors\(variant, scheme\)/);
    expect(button).toMatch(/backgroundColor: colors\.backgroundColor/);
    expect(button).toMatch(/style=\{colors \? \{ color: colors\.color \} : undefined\}/);
  });

  it("does not hard-code a white label or the pink tint outside tinted", () => {
    expect(button).not.toMatch(/text-white/);
    expect(button).not.toMatch(/"#fff"/);
    const pinkLines = button.split("\n").filter((line) => /-pink-\d/.test(line));
    expect(pinkLines).toHaveLength(2);
    for (const line of pinkLines) expect(line.trim()).toMatch(/^tinted: "/);
  });
});

describe("fields", () => {
  it("are white (dark: surface), bordered and use the field radius", () => {
    for (const scheme of schemes) {
      expect(fieldStyle(scheme)).toEqual({
        backgroundColor: tokens.color.surface[scheme],
        borderColor: tokens.color.border[scheme],
        borderRadius: tokens.radius.field,
      });
      expect(fieldTextStyle(scheme)).toEqual({ color: tokens.color.foreground[scheme] });
    }
  });

  it("Input, Textarea and the Select trigger use fieldStyle, not the grey pill", () => {
    for (const file of ["Input.tsx", "Textarea.tsx", "Select.tsx"]) {
      const source = read(file);
      expect(source, file).toMatch(/fieldStyle\(scheme\)/);
      expect(source, file).toMatch(/fieldTextStyle\(scheme\)/);
      expect(source, file).not.toMatch(/bg-secondary|rounded-full/);
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

  it("is passed to the primitive, which no longer relies on bg-primary or bg-input alone", () => {
    expect(read("Switch.tsx")).toMatch(/: colors\.track/);
    expect(read("Switch.tsx")).toMatch(/thumbStyle=\{colors\.thumb\}/);
    expect(read("primitives/switch.tsx")).toMatch(/style=\{thumbStyle\}/);
  });

  it("keeps the 0.2 onColor and offColor props", () => {
    expect(read("Switch.tsx")).toMatch(/onColor\?: string;\s+offColor\?: string;/);
    expect(read("Switch.tsx")).toMatch(/const trackColor = resolvedValue \? onColor : offColor;/);
  });
});

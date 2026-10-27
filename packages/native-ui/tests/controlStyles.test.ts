import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buttonColors,
  checkboxColors,
  fieldStyle,
  fieldTextStyle,
  switchColors,
  textStyle,
  type ButtonVariant,
} from "../src/controlStyles";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, "src", file), "utf8");
const schemes = ["light", "dark"] as const;

/** The body of `function name(...) { ... }` up to the next top-level declaration. */
function fn(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  expect(start, name).toBeGreaterThanOrEqual(0);
  const next = source.slice(start + 1).search(/\n(?:export )?(?:function|const) /);
  return next < 0 ? source.slice(start) : source.slice(start, start + 1 + next);
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

describe("Button (source contract)", () => {
  const button = read("Button.tsx");
  const web = readFileSync(join(root, "..", "ui", "src/ui/button.tsx"), "utf8");
  const webSize = (size: string) =>
    web.match(new RegExp(`\\n\\s*"?${size}"?: "([^"]+)"`))?.[1] ?? "";
  const regular = button.match(/regular: \{\n([\s\S]*?)\n {2}\}/)?.[1] ?? "";
  const nativeSize = (size: string) => regular.match(new RegExp(`${size}: "([^"]+)"`))?.[1] ?? "";

  it("uses the web heights and padding without larger text", () => {
    const pairs = { small: "sm", medium: "default", large: "lg", icon: "icon" } as const;
    for (const [native, webName] of Object.entries(pairs)) {
      const classes = nativeSize(native).split(" ").filter((c) => c !== "px-0");
      expect(classes.length, native).toBeGreaterThan(0);
      for (const c of classes) expect(webSize(webName), `${native} ${c}`).toContain(c);
    }
    expect(button).toMatch(
      /regular: \{ small: "text-xs", medium: "text-sm", large: "text-sm", icon: "text-sm" \}/,
    );
    expect(button).toMatch(/"font-instrument-sans-medium",/);
  });

  it("has the web rounded-lg radius (tokens.radius.lg), not a pill", () => {
    expect(web).toMatch(/rounded-lg text-sm font-medium/);
    expect(button).toMatch(/const RADIUS = tokens\.radius\.lg;/);
    expect(button).toMatch(/\{ borderRadius: RADIUS \},/);
    expect(button).not.toMatch(/rounded-full/);
  });

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

  it("Input, Textarea and the Select trigger use fieldStyle, not the grey pill", () => {
    for (const file of ["Input.tsx", "Textarea.tsx", "Select.tsx"]) {
      const source = read(file);
      expect(source, file).toMatch(/fieldStyle\(scheme\)/);
      expect(source, file).toMatch(/fieldTextStyle\(scheme\)/);
      expect(source, file).not.toMatch(/bg-secondary|rounded-full/);
    }
  });
});

describe("field sizes (source contract)", () => {
  it("Input, Textarea and the Select trigger have the web height and padding without larger text", () => {
    expect(read("Input.tsx")).toMatch(/"min-h-10 border px-3\.5 py-2 text-base font-instrument-sans"/);
    expect(read("Textarea.tsx")).toMatch(
      /"min-h-20 border px-3\.5 py-2\.5 text-base font-instrument-sans"/,
    );
    expect(read("Select.tsx")).toMatch(/"h-10 w-full border px-3\.5 py-0 shadow-none"/);
  });

  it("Select shows its placeholder in the field placeholder colour", () => {
    expect(read("Select.tsx")).toMatch(
      /primitiveValue\s+\? fieldTextStyle\(scheme\)\s+: \{ color: palette\.fieldPlaceholder\[scheme\] \}/,
    );
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

  it("is what components use: no text-foreground or text-muted-foreground class outside the primitives", () => {
    const files = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" }).filter(
      (file) => /\.tsx$/.test(file) && !file.startsWith("primitives"),
    );
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      expect(read(file), file).not.toMatch(/["'\s]text-(?:muted-)?foreground(?=["'\s])/);
    }
  });

  it("colours the dialog, label, card, switch row, empty state and Select item text", () => {
    const uses: Record<string, string[]> = {
      "Dialog.tsx": ["DialogTitle", "DialogDescription"],
      "Label.tsx": ["Label"],
      "Card.tsx": ["Card", "CardTitle", "CardDescription"],
      "LabeledSwitchRow.tsx": ["LabeledSwitchRow"],
      "EmptyState.tsx": ["EmptyStateView", "Title", "Description"],
    };
    for (const [file, names] of Object.entries(uses)) {
      const source = read(file);
      for (const name of names) expect(fn(source, name), `${file} ${name}`).toMatch(/textStyle\(/);
    }
    expect(fn(read("Dialog.tsx"), "DialogDescription")).toMatch(/textStyle\("overlayMuted", scheme\)/);
    expect(read("primitives/select.tsx")).toMatch(/style=\{textStyle\("foreground", scheme\)\}/);
  });
});

describe("Dialog layout (source contract)", () => {
  const dialog = read("Dialog.tsx");

  it("DialogFooter is a row at the end, as the web footer from sm up", () => {
    const footer = fn(dialog, "DialogFooter");
    expect(footer).toMatch(/"flex-row flex-wrap items-center justify-end gap-2"/);
    expect(footer).not.toMatch(/flex-col/);
    const web = readFileSync(join(root, "..", "ui", "src/ui/dialog.tsx"), "utf8");
    expect(web).toMatch(/sm:flex-row sm:justify-end/);
  });

  it("AlertDialog shares the footer and its buttons are not full width", () => {
    const alert = read("AlertDialog.tsx");
    expect(alert).toMatch(/export const AlertDialogFooter = DialogFooter;/);
    expect(fn(alert, "AlertDialogAction")).toMatch(/fullWidth=\{false\}/);
    expect(fn(alert, "AlertDialogCancel")).toMatch(/fullWidth=\{false\}/);
  });

  it("SheetFooter keeps the stacked phone layout", () => {
    expect(fn(read("Sheet.tsx"), "SheetFooter")).toMatch(/"flex-col-reverse gap-2"/);
  });

  it("has the web padding (p-6) and title type (text-lg semibold)", () => {
    expect(dialog).toMatch(/className=\{cn\("gap-4 p-6", className\)\}/);
    expect(fn(dialog, "DialogTitle")).toMatch(/"font-instrument-sans-semibold",\s+largerText \? "text-2xl" : "text-lg"/);
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

  it("is what Checkbox uses, at the web size (16) with a 44 target", () => {
    const checkbox = read("Checkbox.tsx");
    expect(checkbox).toMatch(/checkboxColors\(on, scheme\)/);
    expect(checkbox).not.toMatch(/useAccentColor|accentColor|const accent/);
    expect(checkbox).toMatch(/largerText \? "h-6 w-6" : "h-4 w-4"/);
    expect(checkbox).toMatch(/hitSlop=\{14\}/);
    expect(16 + 2 * 14).toBeGreaterThanOrEqual(44);
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

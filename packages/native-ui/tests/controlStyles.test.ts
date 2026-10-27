import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COMPACT_OVERLAY,
  MIN_TOUCH_TARGET,
  buttonColors,
  cardStyle,
  checkboxColors,
  fieldStyle,
  fieldTextStyle,
  isCompactOverlay,
  sizeStyle,
  switchColors,
  switchSize,
  tabColors,
  tabTrackStyle,
  tabTriggerSize,
  textStyle,
  touchSlop,
  typeStyle,
  type ButtonVariant,
  type TabsVariant,
} from "../src/controlStyles";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, "src", file), "utf8");
const schemes = ["light", "dark"] as const;

/** Source without comments, so a comment can name a class the code must not use. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

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

  it("uses the web heights (as minimums) and padding without larger text", () => {
    const pairs = { small: "sm", medium: "default", large: "lg", icon: "icon" } as const;
    for (const [native, webName] of Object.entries(pairs)) {
      // `min-h-10` is the web `h-10` as a minimum; `h-auto` drops the primitive's `h-10`.
      const classes = nativeSize(native)
        .split(" ")
        .filter((c) => c !== "px-0" && c !== "h-auto")
        .map((c) => c.replace(/^min-h-/, "h-"));
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
    expect(button).toMatch(
      /style=\{\[\s+colors \? \{ color: colors\.color \} : null,\s+sizeStyle\(TEXT\[scale\]\[resolvedSize\]\),\s+typeStyle\("medium"\),\s+\]\}/,
    );
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
    expect(read("Select.tsx")).toMatch(/"h-auto min-h-10 w-full border px-3\.5 py-0 shadow-none"/);
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
    expect(read("primitives/select.tsx")).toMatch(
      /style=\{\{ \.\.\.textStyle\("foreground", scheme\), \.\.\.typeStyle\("medium"\) \}\}/,
    );
  });
});

describe("Dialog layout (source contract)", () => {
  const dialog = read("Dialog.tsx");

  const web = readFileSync(join(root, "..", "ui", "src/ui/dialog.tsx"), "utf8");
  const content = fn(dialog, "DialogContent");

  it("DialogFooter is a row at the end when not compact, as the web footer from sm up", () => {
    const footer = fn(dialog, "DialogFooter");
    const row = footer.slice(footer.lastIndexOf("return ("));
    expect(row).toMatch(/"flex-row flex-wrap items-center justify-end gap-2"/);
    expect(row).not.toMatch(/flex-col/);
    expect(web).toMatch(/sm:flex-row sm:justify-end/);
  });

  it("DialogFooter stacks full-width buttons in the compact sheet, last child on top", () => {
    const footer = fn(dialog, "DialogFooter");
    expect(footer).toMatch(/const \{ compact \} = useDialogLayout\(\);/);
    expect(footer).toMatch(
      /if \(compact\) \{\s+return \(\s+<DialogLayoutContext\.Provider value=\{STACKED\}>\s+<View className=\{cn\("flex-col-reverse gap-2 pt-2", className\)\}/,
    );
    expect(dialog).toMatch(/const STACKED: DialogLayout = \{ compact: true, stacked: true \};/);
    // The web footer: `flex-col-reverse gap-2 pt-2`, and every button `min-h-11` when compact.
    expect(web).toMatch(/"mt-auto flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"/);
    expect(web).toMatch(/data-\[compact=true\]:\[&_button\]:min-h-11/);
    // `Button` reads the layout: full width when stacked, 44 high when compact.
    const button = read("Button.tsx");
    expect(button).toMatch(/const dialog = useDialogLayout\(\);/);
    expect(button).toMatch(/\(fullWidth \|\| dialog\.stacked \? "w-full" : "self-start"\)/);
    expect(button).toMatch(
      /dialog\.compact && scale === "regular" && resolvedSize !== "icon" && "min-h-11",/,
    );
    // After the size class, so tailwind-merge drops `min-h-10`.
    expect(button.indexOf("HEIGHT[scale][resolvedSize],")).toBeLessThan(button.indexOf('"min-h-11",'));
  });

  it("DialogContent is a bottom sheet in a compact window, with viewportAware on by default", () => {
    expect(content).toMatch(/viewportAware = true,/);
    expect(content).toMatch(/const \{ width, height \} = useWindowDimensions\(\);/);
    expect(content).toMatch(/const compact = viewportAware && isCompactOverlay\(width, height\);/);
    expect(content).toMatch(/<DialogLayoutContext\.Provider value=\{compact \? COMPACT : CENTRED\}>/);
    expect(content).toMatch(/placement=\{compact \? "bottom" : "center"\}/);
    // Top corners at the web `rounded-t-2xl` (16); the bottom ones below the edge.
    expect(dialog).toMatch(/const SHEET_RADIUS = tokens\.radius\.lg;/);
    expect(tokens.radius.lg).toBe(16);
    expect(content).toMatch(/radius=\{compact \? SHEET_RADIUS : tokens\.radius\.card\}/);
    expect(dialog).toMatch(/const SHEET = \{ marginBottom: -SHEET_RADIUS \};/);
    expect(content).toMatch(/style=\{compact \? SHEET : PANEL\}/);
    // The web `pt-3`, `p-6` sides and `pb-[max(1.5rem,env(safe-area-inset-bottom))]`.
    expect(content).toMatch(/className=\{cn\(compact \? "gap-4 px-6 pt-3" : "gap-4 p-6", className\)\}/);
    expect(content).toMatch(
      /compact \? \{ paddingBottom: Math\.max\(24, insets\.bottom\) \+ SHEET_RADIUS \} : null,\s+style,/,
    );
    expect(content).toMatch(/\{compact \? <DialogHandle \/> : null\}\s+\{children\}/);
    expect(content).toMatch(/hideCloseButton \? null : <DialogCloseButton \/>/);
    expect(web).toMatch(/rounded-t-2xl rounded-b-none pt-3/);
    expect(web).toMatch(/pb-\[max\(1\.5rem,env\(safe-area-inset-bottom,0px\)\)\]/);
  });

  it("uses one tree for both layouts, so crossing the compact size keeps the content", () => {
    expect(content.match(/<OverlayModal\b/g)).toHaveLength(1);
    expect(content.match(/\{children\}/g)).toHaveLength(1);
    expect(content).not.toMatch(/if \(compact\)/);
  });

  it("the sheet slides up through NativeOnlyAnimatedView, so Reduce Motion turns it off", () => {
    expect(content).toMatch(
      /<NativeOnlyAnimatedView\s+entering=\{compact \? SlideInDown\.duration\(240\) : undefined\}/,
    );
    expect(read("primitives/native-only-animated-view.tsx")).toMatch(
      /entering=\{reduceMotion \? undefined : entering\}/,
    );
  });

  it("the handle is the web h-1 w-12 surface-tertiary pill in a 44 row, hidden from screen readers", () => {
    const handle = fn(dialog, "DialogHandle");
    expect(handle).toMatch(/className="mb-1 min-h-11 items-center justify-center"/);
    expect(handle).toMatch(/className="h-1 w-12 rounded-full"/);
    expect(handle).toMatch(/backgroundColor: palette\.surfaceTertiary\[scheme\]/);
    expect(handle).toMatch(/accessibilityElementsHidden/);
    expect(handle).toMatch(/importantForAccessibility="no-hide-descendants"/);
    expect(web).toMatch(/className="mx-auto mb-1 flex min-h-11 w-full shrink-0 items-center justify-center"/);
    expect(web).toMatch(/<span className="h-1 w-12 rounded-full bg-surface-tertiary" \/>/);
  });

  it("keeps the centred panel, card radius and padding 24 on larger windows", () => {
    expect(dialog).toMatch(/const PANEL = \{ width: "100%", maxWidth: 480, alignSelf: "center" \} as const;/);
    expect(dialog).toMatch(/const CENTRED: DialogLayout = \{ compact: false, stacked: false \};/);
    expect(tokens.radius.card).toBe(24);
    // No handle, no extra bottom padding and no slide when not compact.
    expect(content).toMatch(/compact \? <DialogHandle \/> : null/);
    expect(content).toMatch(/compact \? SlideInDown\.duration\(240\) : undefined/);
  });

  it("AlertDialogContent and ConfirmDialog get the same behaviour from DialogContent", () => {
    const alert = read("AlertDialog.tsx");
    expect(alert).toMatch(/export type AlertDialogContentProps = Omit<DialogContentProps, "dismissible">;/);
    expect(fn(alert, "AlertDialogContent")).toMatch(
      /<DialogContent hideCloseButton=\{hideCloseButton\} dismissible=\{false\} \{\.\.\.props\} \/>/,
    );
    const confirm = read("ConfirmDialog.tsx");
    expect(confirm).toMatch(/<AlertDialogContent testID=\{testID\}>/);
    expect(confirm).toMatch(/<AlertDialogFooter>/);
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
    expect(dialog).toMatch(/className=\{cn\(compact \? "gap-4 px-6 pt-3" : "gap-4 p-6", className\)\}/);
    expect(fn(dialog, "DialogTitle")).toMatch(/"font-instrument-sans-semibold",\s+largerText \? "text-2xl" : "text-lg"/);
  });
});

describe("tabColors", () => {
  const variants: TabsVariant[] = ["pills", "segmented", "soft"];
  const css = readFileSync(join(root, "..", "ui", "tokens/src/css/tabs-pills.css"), "utf8");
  /** The variable a `--tabs-*` colour points at, e.g. `--default`. */
  const tabVar = (name: string) => {
    const refs = [...css.matchAll(new RegExp(`${name}: var\\((--[a-z-]+)\\);`, "g"))].map((m) => m[1]);
    expect(refs, name).toHaveLength(2); // light and dark blocks
    expect(refs[0], name).toBe(refs[1]);
    return refs[0]!;
  };
  const native: Record<string, Record<"light" | "dark", string>> = {
    "--muted": tokens.color.muted,
    "--default": palette.default,
    "--segment": palette.segment,
    "--segment-foreground": palette.segmentForeground,
  };
  const web = (name: string) => native[tabVar(name)]!;

  it("uses the web tab variables (tabs-pills.css) for pills, segments and the track", () => {
    for (const scheme of schemes) {
      for (const variant of variants) {
        expect(tabColors(variant, false, scheme), `${variant} ${scheme}`).toEqual({
          backgroundColor: "transparent",
          color: web("--tabs-text-muted")[scheme],
        });
      }
      expect(tabColors("pills", true, scheme)).toEqual({
        backgroundColor: web("--tabs-pill-active-bg")[scheme],
        color: web("--tabs-text-active")[scheme],
      });
      expect(tabColors("segmented", true, scheme)).toEqual({
        backgroundColor: web("--tabs-pill-bg")[scheme],
        color: web("--tabs-text-active")[scheme],
      });
      expect(tabTrackStyle(scheme)).toEqual({ backgroundColor: web("--tabs-bar-bg")[scheme] });
    }
  });

  it("uses the web soft trigger colours", () => {
    const webTabs = readFileSync(join(root, "..", "ui", "src/ui/tabs.tsx"), "utf8");
    expect(webTabs).toMatch(
      /text-muted-foreground[^"]*data-\[state=active\]:bg-surface-secondary data-\[state=active\]:text-foreground/,
    );
    for (const scheme of schemes) {
      expect(tabColors("soft", true, scheme)).toEqual({
        backgroundColor: tokens.color.surfaceSecondary[scheme],
        color: tokens.color.foreground[scheme],
      });
    }
  });

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

describe("Tabs and PillTabs (source contract)", () => {
  const tabs = code(read("Tabs.tsx"));
  const pills = code(read("PillTabs.tsx"));

  it("take fill and label from tabColors as styles", () => {
    expect(fn(tabs, "TabsTrigger")).toMatch(/const colors = tabColors\(variant, selected, scheme\);/);
    expect(pills).toMatch(/const colors = tabColors\("pills", isSelected, scheme\);/);
    for (const [file, source] of [["Tabs.tsx", tabs], ["PillTabs.tsx", pills]] as const) {
      expect(source, file).toMatch(
        /style=\{\{ backgroundColor: colors\.backgroundColor, minHeight: trigger\.minHeight \}\}/,
      );
      expect(source, file).toMatch(/style=\{\[\{ color: colors\.color \}, /);
    }
    expect(fn(tabs, "TabsList")).toMatch(/variant === "segmented" \? \[tabTrackStyle\(scheme\), style\] : style/);
  });

  it("use no accent, pink or app theme fill classes for tabs", () => {
    for (const [file, source] of [["Tabs.tsx", tabs], ["PillTabs.tsx", pills]] as const) {
      expect(source, file).not.toMatch(/useAccentColor|accentColor|-pink-\d/);
      expect(source, file).not.toMatch(/\bbg-(?:secondary|surface|primary)\b/);
      expect(source, file).not.toMatch(/\btext-(?:white|black|pink)/);
    }
  });

  it("use no style function, which NativeWind drops when it merges class styles", () => {
    for (const [file, source] of [["Tabs.tsx", tabs], ["PillTabs.tsx", pills]] as const) {
      expect(source, file).not.toMatch(/style=\{\(\{ pressed \}\)/);
      expect(source, file).toMatch(/active:opacity-70/);
    }
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

  it("Input, Textarea and the input primitive pass placeholderTextColor from the palette", () => {
    for (const file of ["Input.tsx", "Textarea.tsx", "primitives/input.tsx"]) {
      expect(read(file), file).toMatch(
        /placeholderTextColor=\{placeholderTextColor \?\? palette\.fieldPlaceholder\[scheme\]\}/,
      );
    }
  });

  it("are never a placeholder: class, which on native beats placeholderTextColor", () => {
    const files = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" }).filter(
      (file) => /\.tsx$/.test(file),
    );
    for (const file of files) expect(code(read(file)), file).not.toMatch(/["'`\s]placeholder:[a-z]/);
  });

  it("SelectValue wraps the web Radix value in a Text, as Radix drops className and style", () => {
    const select = read("primitives/select.tsx");
    expect(select).toMatch(
      /if \(Platform\.OS === "web"\) \{[\s\S]*?<Text className=\{classes\} style=\{style\}>\s*<SelectPrimitive\.Value ref=\{ref\} \{\.\.\.props\} \/>\s*<\/Text>/,
    );
    expect(select).toMatch(/<SelectPrimitive\.Value ref=\{ref\} className=\{classes\} style=\{style\} \{\.\.\.props\} \/>/);
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
    expect(checkbox).toMatch(/const box = largerText \? 24 : 16;/);
    expect(checkbox).toMatch(/hitSlop=\{touchSlop\(box\)\}/);
    expect(touchSlop(16)).toEqual({ top: 14, bottom: 14, left: 14, right: 14 });
    expect(touchSlop(24).top).toBe(10);
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

describe("typeStyle", () => {
  it("is the web font-medium (500) and font-semibold (600) as a numeric weight", () => {
    expect(typeStyle("medium")).toEqual({ fontWeight: "500" });
    expect(typeStyle("semibold")).toEqual({ fontWeight: "600" });
    expect(Number(typeStyle("medium").fontWeight)).toBe(500);
    expect(Number(typeStyle("semibold").fontWeight)).toBe(600);
  });
});

describe("sizeStyle", () => {
  it("is the Tailwind size and default line height, or leading-tight", () => {
    expect(sizeStyle("text-xs")).toEqual({ fontSize: 12, lineHeight: 16 });
    expect(sizeStyle("text-sm")).toEqual({ fontSize: 14, lineHeight: 20 });
    expect(sizeStyle("text-base")).toEqual({ fontSize: 16, lineHeight: 24 });
    expect(sizeStyle("text-lg")).toEqual({ fontSize: 18, lineHeight: 28 });
    expect(sizeStyle("text-xl")).toEqual({ fontSize: 20, lineHeight: 28 });
    expect(sizeStyle("text-2xl")).toEqual({ fontSize: 24, lineHeight: 32 });
    expect(sizeStyle("text-base", "tight")).toEqual({ fontSize: 16, lineHeight: 20 });
    expect(sizeStyle("text-2xl", "tight")).toEqual({ fontSize: 24, lineHeight: 30 });
  });
});

describe("isCompactOverlay", () => {
  it("is the web COMPACT_OVERLAY_QUERY", () => {
    const web = readFileSync(join(root, "..", "ui", "src/ui/overlay-a11y.ts"), "utf8");
    const query = web.match(/COMPACT_OVERLAY_QUERY = "\(max-width: (\d+)px\), \(max-height: (\d+)px\)"/);
    expect(query).not.toBeNull();
    expect(COMPACT_OVERLAY).toEqual({ maxWidth: Number(query![1]), maxHeight: Number(query![2]) });
  });

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

describe("type sizes (source contract)", () => {
  const webUi = (file: string) => readFileSync(join(root, "..", "ui", "src/ui", file), "utf8");

  it("Button labels are the web text-sm medium: 14 / 20, weight 500", () => {
    const button = read("Button.tsx");
    expect(webUi("button.tsx")).toMatch(/rounded-lg text-sm font-medium/);
    const regular = button.match(/regular: \{ small: "(text-\w+)", medium: "(text-\w+)"/);
    expect(regular?.[2]).toBe("text-sm");
    expect(sizeStyle(regular![2] as "text-sm")).toEqual({ fontSize: 14, lineHeight: 20 });
    expect(sizeStyle(regular![1] as "text-xs").fontSize).toBe(12);
    expect(Number(typeStyle("medium").fontWeight)).toBe(500);
    // Larger text keeps its step-up.
    expect(button).toMatch(
      /larger: \{ small: "text-base", medium: "text-xl", large: "text-2xl", icon: "text-base" \}/,
    );
  });

  it("Label is the web text-sm font-medium: 14, weight 500", () => {
    expect(webUi("label.tsx")).toMatch(/"text-sm font-medium /);
    const label = fn(read("Label.tsx"), "Label");
    expect(label).toMatch(/const size = largerText \? "text-lg" : "text-sm";/);
    expect(label).toMatch(/"font-instrument-sans-medium", size,/);
    expect(label).toMatch(
      /style=\{\[textStyle\("foreground", scheme\), sizeStyle\(size\), typeStyle\("medium"\), style\]\}/,
    );
    expect(label).not.toMatch(/semibold|text-base/);
    expect(sizeStyle("text-sm").fontSize).toBe(14);
  });

  it("card titles are the web 16 semibold with a tight line height", () => {
    // The web title has no size class, so it is the inherited 16.
    expect(webUi("card.tsx")).toMatch(/"title", "font-semibold leading-none tracking-\[-0\.02em\]"/);
    const card = read("Card.tsx");
    const title = fn(card, "CardTitle");
    expect(title).toMatch(/const size = largerText \? "text-2xl" : "text-base";/);
    expect(title).toMatch(/sizeStyle\(size, "tight"\),\s+typeStyle\("semibold"\),/);
    expect(fn(card, "Card")).toMatch(/const titleSize = largerText \? "text-2xl" : "text-base";/);
    expect(fn(card, "Card")).toMatch(/sizeStyle\(titleSize, "tight"\),\s+typeStyle\("semibold"\),/);
    expect(card).not.toMatch(/text-xl/);
    expect(sizeStyle("text-base", "tight")).toEqual({ fontSize: 16, lineHeight: 20 });
    expect(Number(typeStyle("semibold").fontWeight)).toBe(600);
  });

  it("CardDescription is the web text-sm", () => {
    expect(webUi("card.tsx")).toMatch(/"description", "text-sm text-muted-foreground"/);
    const description = fn(read("Card.tsx"), "CardDescription");
    expect(description).toMatch(/const size = largerText \? "text-lg" : "text-sm";/);
    expect(description).toMatch(/sizeStyle\(size\)/);
  });

  it("pairs every size style with the same class, so the two cannot disagree", () => {
    for (const file of ["Button.tsx", "Label.tsx", "Card.tsx"]) {
      const source = code(read(file));
      for (const call of source.matchAll(/sizeStyle\((\w+)/g)) {
        expect(source, `${file} ${call[1]}`).toMatch(new RegExp(`cn\\([^;]*\\b${call[1]}\\b`));
      }
    }
  });
});

describe("type weights (source contract)", () => {
  const files = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" }).filter(
    (file) => /\.tsx$/.test(file),
  );

  it("sets 600 on titles and tab bar labels, and 500 on button, label, badge and tab labels", () => {
    const semibold: [string, string][] = [
      ["Card.tsx", "Card"],
      ["Card.tsx", "CardTitle"],
      ["Dialog.tsx", "DialogTitle"],
      ["settings/SettingsSection.tsx", "SettingsSection"],
      ["examples/ParityGallery.tsx", "Section"],
      ["FloatingTabBar.tsx", "FloatingTabBar"],
    ];
    for (const [file, name] of semibold) {
      expect(fn(read(file), name), `${file} ${name}`).toMatch(/typeStyle\("semibold"\)/);
    }
    const medium: [string, string][] = [
      ["Button.tsx", "Button"],
      ["Label.tsx", "Label"],
      ["Badge.tsx", "Badge"],
      ["Tabs.tsx", "TabsTrigger"],
    ];
    for (const [file, name] of medium) {
      expect(fn(read(file), name), `${file} ${name}`).toMatch(/typeStyle\("medium"\)/);
    }
    // `PillTabs` is generic (`function PillTabs<T …>(`) and the only component in its file.
    expect(read("PillTabs.tsx")).toMatch(/style=\{\[\{ color: colors\.color \}, typeStyle\("medium"\)\]\}/);
    // `SheetTitle` and `AlertDialogTitle` are `DialogTitle`.
    expect(read("Sheet.tsx")).toMatch(/export const SheetTitle = DialogTitle;/);
    expect(read("AlertDialog.tsx")).toMatch(/export const AlertDialogTitle = DialogTitle;/);
  });

  it("pairs every weighted font class with the same typeStyle, so it is not drawn Regular", () => {
    for (const file of files) {
      const source = code(read(file));
      for (const weight of ["semibold", "medium"] as const) {
        const classes = source.match(new RegExp(`font-instrument-sans-${weight}\\b`, "g"))?.length ?? 0;
        const styles = source.split(`typeStyle("${weight}")`).length - 1;
        expect(styles, `${file} ${weight}`).toBeGreaterThanOrEqual(classes);
      }
    }
  });

  it("uses no bold class: the web titles are semibold", () => {
    for (const file of files) {
      expect(code(read(file)), file).not.toMatch(/font-instrument-sans-bold/);
    }
  });
});

describe("cards (source contract)", () => {
  it("cardStyle is the web card: surfaceCard fill at radius lg (16)", () => {
    const web = readFileSync(join(root, "..", "ui", "src/ui/card.tsx"), "utf8");
    expect(web).toMatch(/"rounded-lg bg-surface-card text-surface-foreground"/);
    expect(tokens.radius.lg).toBe(16);
    for (const scheme of schemes) {
      expect(cardStyle(scheme)).toEqual({
        backgroundColor: tokens.color.surfaceCard[scheme],
        borderRadius: tokens.radius.lg,
      });
    }
    // Light: a muted fill a shade off the page and the white field.
    expect(cardStyle("light").backgroundColor).not.toBe(tokens.color.background.light);
    expect(cardStyle("light").backgroundColor).not.toBe(tokens.color.surface.light);
  });

  it("Card, SettingsSection and CardSkeleton are flat: cardStyle, no FloatingSurface, no shadow", () => {
    for (const file of ["Card.tsx", "settings/SettingsSection.tsx", "Skeleton.tsx"]) {
      const source = code(read(file));
      expect(source, file).toMatch(/cardStyle\(scheme\)/);
      expect(source, file).not.toMatch(/FloatingSurface|LiquidGlass|floatingShadow|shadow[A-Z]|boxShadow/);
      expect(source, file).not.toMatch(/\bshadow-(?!none)/);
    }
    expect(fn(read("Card.tsx"), "Card")).toMatch(/style=\{cardStyle\(scheme\)\}/);
  });

  it("Button has no shadow unless asked, as the web button has none", () => {
    const button = read("Button.tsx");
    expect(button).toMatch(/shadowType = "flat",/);
    expect(button).toMatch(/const elevate =\s+shadowType === "shadow"/);
  });
});

describe("switchSize", () => {
  const web = readFileSync(join(root, "..", "ui", "src/ui/switch.tsx"), "utf8");

  it("is the web Switch without larger text: h-5 w-9 track, size-4 thumb, translate-x-4", () => {
    expect(web).toMatch(/inline-flex h-5 w-9 shrink-0/);
    expect(web).toMatch(/block size-4 rounded-full/);
    expect(web).toMatch(/data-\[state=checked\]:translate-x-4/);
    expect(switchSize(false)).toEqual({
      track: "h-5 w-9",
      thumb: "h-4 w-4",
      on: "translate-x-4",
      width: 36,
      height: 20,
    });
  });

  it("keeps the 0.3.4 size with larger text", () => {
    expect(switchSize(true)).toMatchObject({ track: "h-8 w-14", thumb: "h-7 w-7", on: "translate-x-6" });
  });

  it("is what Switch draws, centring the thumb", () => {
    const source = read("Switch.tsx");
    expect(source).toMatch(/const size = switchSize\(useLargerText\(\)\);/);
    expect(source).toMatch(/className=\{cn\(size\.track, "justify-center"\)\}/);
    expect(source).toMatch(/thumbClassName=\{cn\(size\.thumb, resolvedValue \? size\.on : "translate-x-0"\)\}/);
    expect(source).not.toMatch(/"h-8 w-14"/);
  });
});

describe("tabTriggerSize", () => {
  const css = readFileSync(join(root, "..", "ui", "tokens/src/css/tabs.css"), "utf8");
  const pillsCss = readFileSync(join(root, "..", "ui", "tokens/src/css/tabs-pills.css"), "utf8");
  const webTabs = readFileSync(join(root, "..", "ui", "src/ui/tabs.tsx"), "utf8");
  const variants: TabsVariant[] = ["pills", "segmented", "soft"];

  it("is the web .t-tab for pills and segmented: 30 high, px-3 py-1, text-sm", () => {
    expect(css).toMatch(/\.t-tab \{[^}]*height: 30px;\s+padding: 4px 12px;/);
    expect(webTabs).toMatch(/"t-tab inline-flex [^"]*text-sm font-medium/);
    for (const variant of ["pills", "segmented"] as const) {
      expect(tabTriggerSize(variant, "default", false)).toEqual({
        minHeight: 30,
        className: "px-3 py-1",
        textClassName: "text-sm",
      });
    }
  });

  it("is the web soft trigger and the web sm list", () => {
    expect(webTabs).toMatch(/rounded-full px-4 py-2 text-sm text-muted-foreground/);
    expect(webTabs).toMatch(/sm: "\[&_\.t-tab\]:px-2\.5 \[&_\.t-tab\]:py-1 \[&_\.t-tab\]:text-xs"/);
    expect(tabTriggerSize("soft", "default", false)).toMatchObject({ className: "px-4 py-2", textClassName: "text-sm" });
    for (const variant of variants) {
      expect(tabTriggerSize(variant, "sm", false)).toMatchObject({ className: "px-2.5 py-1", textClassName: "text-xs" });
    }
  });

  it("keeps the larger-text sizes", () => {
    for (const variant of variants) {
      expect(tabTriggerSize(variant, "default", true)).toEqual({ minHeight: 56, className: "px-4 py-3", textClassName: "text-xl" });
      expect(tabTriggerSize(variant, "sm", true)).toEqual({ minHeight: 48, className: "px-4 py-2", textClassName: "text-lg" });
    }
  });

  it("lays tabs out like the web lists: content-sized at the start, no flex-1 or w-full", () => {
    expect(pillsCss).toMatch(/\.t-tabs--segmented \{\s+gap: 3px;\s+padding: 3px;/);
    expect(pillsCss).toMatch(/\.t-tabs--pills \{\s+gap: 6px;/);
    const tabs = code(read("Tabs.tsx"));
    const pills = code(read("PillTabs.tsx"));
    for (const [file, source] of [["Tabs.tsx", tabs], ["PillTabs.tsx", pills]] as const) {
      expect(source, file).not.toMatch(/(?<![\w-])(?:flex-1|w-full)(?![\w-])/);
      expect(source, file).toMatch(/self-start/);
    }
    const list = fn(tabs, "TabsList");
    expect(list).toMatch(/"max-w-full gap-\[3px\] self-start rounded-full p-\[3px\]"/);
    expect(list).toMatch(/"max-w-full flex-wrap gap-1\.5 self-start"/);
    expect(list).toMatch(/"flex-wrap items-center justify-center gap-1\.5"/);
    expect(fn(tabs, "TabsTrigger")).toMatch(/const trigger = tabTriggerSize\(variant, size, largerText\);/);
    expect(pills).toMatch(/const trigger = tabTriggerSize\("pills", "default", largerText\);/);
    expect(pills).toMatch(/"max-w-full flex-row flex-wrap gap-1\.5 self-start"/);
  });

  it("labels pills and segments in the web medium weight, soft tabs in regular", () => {
    const trigger = fn(code(read("Tabs.tsx")), "TabsTrigger");
    expect(trigger).toMatch(/const medium = variant !== "soft";/);
    expect(trigger).toMatch(/medium \? "font-instrument-sans-medium" : "font-instrument-sans"/);
    expect(trigger).toMatch(/medium \? typeStyle\("medium"\) : null/);
    expect(trigger).not.toMatch(/semibold/);
  });

  it("gives every trigger a 44 target with the hit slop", () => {
    for (const variant of variants) {
      for (const size of ["default", "sm"] as const) {
        for (const largerText of [false, true]) {
          const { minHeight } = tabTriggerSize(variant, size, largerText);
          const slop = touchSlop(MIN_TOUCH_TARGET, minHeight);
          expect(minHeight + slop.top + slop.bottom, `${variant} ${size} ${largerText}`).toBeGreaterThanOrEqual(44);
        }
      }
    }
    expect(touchSlop(MIN_TOUCH_TARGET, 30)).toEqual({ top: 7, bottom: 7, left: 0, right: 0 });
    for (const file of ["Tabs.tsx", "PillTabs.tsx"]) {
      expect(read(file), file).toMatch(/hitSlop=\{touchSlop\(MIN_TOUCH_TARGET, trigger\.minHeight\)\}/);
    }
  });
});

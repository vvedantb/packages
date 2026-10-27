import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MIN_TOUCH_TARGET, searchInputSize, switchSize, touchSlop } from "../src/controlStyles";

// Phone behaviour that needs React Native to render: these checks read the
// source instead. Touch targets, accessibility roles and states, Reduce
// Motion, safe-area insets, the keyboard and Dynamic Type.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, "src", file), "utf8");
const files = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" }).filter((file) =>
  /\.tsx?$/.test(file),
);

/** Source without comments, so a comment can name what the code must not do. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Points for a Tailwind size class: `h-10` and `min-h-10` are 40, `min-h-[72px]` is 72. */
function points(classes: string, axis: "h" | "w"): number {
  const scale = classes.match(new RegExp(`(?:^|\\s)(?:min-)?${axis}-(\\d+)(?=\\s|$)`));
  if (scale) return Number(scale[1]) * 4;
  const arbitrary = classes.match(new RegExp(`(?:^|\\s)(?:min-)?${axis}-\\[(\\d+)px\\]`));
  if (arbitrary) return Number(arbitrary[1]);
  throw new Error(`no ${axis} size in "${classes}"`);
}

describe("touchSlop", () => {
  it("brings any size to the 44 pt target with the least slop", () => {
    expect(MIN_TOUCH_TARGET).toBe(44);
    for (const size of [0, 16, 20, 24, 30, 31, 32, 36, 40, 43, 44, 48, 64]) {
      const { top, bottom, left, right } = touchSlop(size);
      expect(top).toBe(bottom);
      expect(left).toBe(right);
      expect(size + top + bottom, `${size}`).toBeGreaterThanOrEqual(44);
      if (top > 0) expect(size + 2 * (top - 1), `${size}`).toBeLessThan(44);
    }
    expect(touchSlop(48)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(touchSlop(36, 20)).toEqual({ top: 12, bottom: 12, left: 4, right: 4 });
  });
});

describe("Button (phone)", () => {
  const button = read("Button.tsx");
  const block = (name: string) => button.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`))?.[1] ?? "";
  const heights = block("HEIGHT");
  const slops = block("HIT_SLOP");
  const sizeClass = (scale: string, size: string) =>
    heights.match(new RegExp(`${scale}: \\{[\\s\\S]*?${size}: "([^"]+)"`))?.[1] ?? "";
  const slop = (scale: string, size: string) => {
    const value = slops.match(new RegExp(`${scale}: \\{[^}]*\\b${size}: (\\d+|undefined)`))?.[1];
    expect(value, `${scale} ${size}`).toBeDefined();
    return value === "undefined" ? 0 : Number(value);
  };

  it("gives every size a target of at least 44 with its hit slop, without painting it larger", () => {
    for (const scale of ["regular", "larger"]) {
      for (const size of ["small", "medium", "large", "icon"]) {
        const classes = sizeClass(scale, size);
        const extra = 2 * slop(scale, size);
        expect(points(classes, "h") + extra, `${scale} ${size} height`).toBeGreaterThanOrEqual(44);
        if (size === "icon") {
          expect(points(classes, "w") + extra, `${scale} icon width`).toBeGreaterThanOrEqual(44);
        }
      }
    }
    // The web `sm` (32), `default` (40) and `icon` (40) stay that size on screen.
    expect(points(sizeClass("regular", "small"), "h")).toBe(32);
    expect(points(sizeClass("regular", "medium"), "h")).toBe(40);
    expect(button).toMatch(/hitSlop=\{HIT_SLOP\[scale\]\[resolvedSize\]\}/);
  });

  it("grows labelled sizes with Dynamic Type: minimum heights, not fixed ones", () => {
    for (const scale of ["regular", "larger"]) {
      for (const size of ["small", "medium", "large"]) {
        const classes = sizeClass(scale, size);
        expect(classes, `${scale} ${size}`).toMatch(/^h-auto min-h-/);
      }
    }
  });

  it("is a button with disabled and busy state", () => {
    expect(button).toMatch(/accessibilityRole="button"/);
    expect(button).toMatch(
      /accessibilityState=\{\{\s+\.\.\.props\.accessibilityState,\s+disabled: Boolean\(loading \|\| props\.disabled\),\s+busy: Boolean\(loading\),\s+\}\}/,
    );
  });

  it("shows the 16 web ring while loading and keeps the label, as the web does", () => {
    const web = readFileSync(join(root, "..", "ui", "src/ui/button.tsx"), "utf8");
    expect(web).toMatch(/\{loading \? <Spinner variant="ring" \/> : startContent\}\s+\{children\}/);
    expect(button).toMatch(/const start = loading \? \(\s+<Spinner size="sm" color=\{contentColor\} decorative \/>/);
    expect(button).toMatch(/\{start\}\s+\{typeof children === "string"/);
    expect(button).not.toMatch(/ActivityIndicator/);
    const spinner = read("Spinner.tsx");
    expect(spinner).toMatch(/const SM = 16;/);
    expect(spinner).toMatch(/width: SM, height: SM/);
    const webSpinner = readFileSync(join(root, "..", "ui", "src/ui/spinner.tsx"), "utf8");
    expect(webSpinner).toMatch(/sm: "size-4"/);
  });
});

describe("UpgradeToProCard (phone)", () => {
  const card = read("marketing/UpgradeToProCard.tsx");

  it("keeps the web 32 pill on screen and reaches 44 with the web hit-target slop", () => {
    const utilities = readFileSync(join(root, "..", "ui", "tokens/src/css/utilities.css"), "utf8");
    expect(utilities).toMatch(/@utility hit-target \{[\s\S]*?inset: -8px;/);
    const slop = Number(card.match(/const HIT_SLOP = (\d+);/)?.[1]);
    expect(slop).toBe(8);
    expect(card).toMatch(/hitSlop=\{HIT_SLOP\}/);
    const heights = card.match(/largerText \? "(min-h-[^"]+)" : "(min-h-[^"]+)"/);
    expect(points(heights![2]!, "h")).toBe(32);
    expect(points(heights![1]!, "h")).toBe(48);
    for (const classes of [heights![1]!, heights![2]!]) {
      expect(points(classes, "h") + 2 * slop, classes).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });
});

describe("accessibility roles and states", () => {
  it("Checkbox is a checkbox with checked (mixed) and disabled state", () => {
    const checkbox = read("Checkbox.tsx");
    expect(checkbox).toMatch(/accessibilityRole="checkbox"/);
    expect(checkbox).toMatch(/checked: checked === "indeterminate" \? "mixed" : checked,/);
    expect(checkbox).toMatch(/disabled: Boolean\(disabled\),/);
  });

  it("Switch is a switch with checked and disabled state, and a 44 target", () => {
    const source = read("Switch.tsx");
    expect(source).toMatch(/accessibilityRole="switch"/);
    expect(source).toMatch(
      /accessibilityState=\{\{\s+\.\.\.props\.accessibilityState,\s+checked: resolvedValue,\s+disabled: Boolean\(props\.disabled\),\s+\}\}/,
    );
    // After `{...props}`, so a caller's state cannot drop `checked`.
    expect(source.indexOf("{...props}")).toBeLessThan(source.indexOf("accessibilityState={{"));
    expect(source).toMatch(/hitSlop=\{touchSlop\(size\.width, size\.height\)\}/);
    for (const largerText of [false, true]) {
      const { width, height } = switchSize(largerText);
      const slop = touchSlop(width, height);
      expect(width + slop.left + slop.right).toBeGreaterThanOrEqual(44);
      expect(height + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
    }
    // The painted switch stays the web 36 × 20.
    expect(switchSize(false)).toMatchObject({ width: 36, height: 20 });
  });

  it("Tabs are a tablist of tabs with selected and disabled state", () => {
    const tabs = read("Tabs.tsx");
    expect(tabs).toMatch(/accessibilityRole="tablist"/);
    expect(tabs).toMatch(/accessibilityRole="tab"/);
    expect(tabs).toMatch(/accessibilityState=\{\{ selected, disabled: Boolean\(disabled\) \}\}/);
    expect(tabs).toMatch(/accessibilityLabel \?\? \(typeof children === "string" \? children : undefined\)/);
    const pills = read("PillTabs.tsx");
    expect(pills).toMatch(/accessibilityRole="tablist"/);
    expect(pills).toMatch(/accessibilityRole="tab"/);
    expect(pills).toMatch(/accessibilityState=\{\{ selected: isSelected \}\}/);
    expect(pills).toMatch(/accessibilityLabel=\{tab\.label\}/);
  });

  it("the Select trigger is a labelled combobox with disabled state and a 44 target", () => {
    const select = read("Select.tsx");
    expect(select).toMatch(/accessibilityLabel\?: string;/);
    expect(select).toMatch(/accessibilityRole="combobox"/);
    expect(select).toMatch(/accessibilityLabel=\{accessibilityLabel\}/);
    expect(select).toMatch(/accessibilityState=\{\{ disabled: Boolean\(disabled\) \}\}/);
    expect(select).toMatch(/hitSlop=\{touchSlop\(MIN_TOUCH_TARGET, largerText \? 64 : 40\)\}/);
    const { top, bottom } = touchSlop(MIN_TOUCH_TARGET, 40);
    expect(40 + top + bottom).toBe(44);
  });

  it("the dialog close button is a 44 labelled button; Dialog and Sheet closes are buttons", () => {
    const dialog = read("Dialog.tsx");
    const close = dialog.slice(dialog.indexOf("function DialogCloseButton("));
    expect(close).toMatch(/accessibilityLabel="Close"/);
    expect(close).toMatch(/"absolute right-2 top-2 h-11 w-11 /);
    expect(points("h-11", "h")).toBe(44);
    // The web close is `h-11 w-11` too.
    const web = readFileSync(join(root, "..", "ui", "src/ui/dialog.tsx"), "utf8");
    expect(web).toMatch(/absolute right-2 top-2 inline-flex h-11 w-11/);
    const overlay = read("primitives/overlay.tsx");
    expect(overlay).toMatch(/<Component\s+accessibilityRole="button"\s+\{\.\.\.props\}/);
    expect(dialog).toMatch(/return <OverlayClose part="DialogClose" \{\.\.\.props\} \/>;/);
    expect(read("Sheet.tsx")).toMatch(/return <OverlayClose part="SheetClose" \{\.\.\.props\} \/>;/);
  });

  it("the SearchInput clear button is a labelled button, painted at the web 24 with a 44 target", () => {
    const search = read("SearchInput.tsx");
    expect(search).toMatch(
      /accessibilityRole="button"\s+accessibilityLabel=\{clearLabel\}\s+hitSlop=\{touchSlop\(metrics\.clear\)\}/,
    );
    expect(search).toMatch(/style=\{\{ width: metrics\.clear, height: metrics\.clear \}\}/);
    for (const largerText of [false, true]) {
      for (const size of ["sm", "md"] as const) {
        const { clear } = searchInputSize(size, largerText);
        const slop = touchSlop(clear);
        expect(clear + slop.left + slop.right, `${size} ${largerText}`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        expect(clear + slop.top + slop.bottom, `${size} ${largerText}`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      }
    }
    expect(searchInputSize("sm", false).clear).toBe(24);
  });

  it("pressable list rows and toast actions are labelled buttons", () => {
    const row = read("ListRow.tsx");
    expect(row).toMatch(/accessibilityRole="button"\s+accessibilityLabel=\{title\}/);
    const toast = read("Toast.tsx");
    expect(toast).toMatch(/accessibilityRole="button"\s+hitSlop=\{8\}/);
  });

  it("names section and sheet titles as headers", () => {
    expect(read("settings/SettingsSection.tsx")).toMatch(/accessibilityRole="header"/);
    expect(read("BottomSheetContainer.tsx")).toMatch(/accessibilityRole="header"/);
    expect(read("Dialog.tsx")).toMatch(/accessibilityRole="header"/);
  });
});

describe("Reduce Motion", () => {
  it("useReduceMotion starts from Reanimated's synchronous read and follows changes", () => {
    const hook = read("useReduceMotion.ts");
    expect(hook).toMatch(/const initial = useReducedMotion\(\);/);
    expect(hook).toMatch(/useState\(initial\)/);
    expect(hook).toMatch(/addEventListener\(\s+"reduceMotionChanged",\s+setEnabled,\s+\)/);
    expect(hook).toMatch(/return \(\) => subscription\.remove\(\);/);
  });

  it("is the only reader of the setting", () => {
    for (const file of files) {
      if (file === "useReduceMotion.ts") continue;
      expect(code(read(file)), file).not.toMatch(/useReducedMotion|isReduceMotionEnabled/);
    }
    for (const file of ["Progress.tsx", "Skeleton.tsx", "primitives/overlay.tsx", "marketing/PricingModal.tsx"]) {
      expect(read(file), file).toMatch(/const reduceMotion = useReduceMotion\(\);/);
    }
  });

  it("drops the layout animations of sheets, toasts and the Select popover", () => {
    const view = read("primitives/native-only-animated-view.tsx");
    for (const prop of ["entering", "exiting", "layout"]) {
      expect(view).toMatch(new RegExp(`${prop}=\\{reduceMotion \\? undefined : ${prop}\\}`));
    }
    // Every layout animation goes through that view.
    for (const file of files) {
      const source = code(read(file));
      if (!/\b(?:entering|exiting)=\{/.test(source) || file.endsWith("native-only-animated-view.tsx")) continue;
      expect(source, file).toMatch(/<NativeOnlyAnimatedView/);
      expect(source, file).not.toMatch(/<Animated\.View[^>]*\b(?:entering|exiting)=/);
    }
  });

  it("turns off the Modal animation of overlays and the pricing sheet", () => {
    expect(read("primitives/overlay.tsx")).toMatch(/animationType=\{reduceMotion \? "none" : "fade"\}/);
    expect(read("marketing/PricingModal.tsx")).toMatch(/animationType=\{reduceMotion \? "none" : "slide"\}/);
    for (const file of files) {
      const source = code(read(file));
      if (!/<Modal\b/.test(source)) continue;
      expect(source, file).toMatch(/animationType=\{reduceMotion \? "none" : /);
    }
  });
});

describe("safe area and keyboard", () => {
  const overlay = read("primitives/overlay.tsx");

  it("keeps dialogs inside the insets on every side and sheets below the top inset", () => {
    expect(overlay).toMatch(/const insets = useSafeAreaInsets\(\);/);
    expect(overlay).toMatch(
      /justifyContent: "flex-end",\s+paddingTop: insets\.top \+ 16,\s+paddingLeft: insets\.left,\s+paddingRight: insets\.right,/,
    );
    expect(overlay).toMatch(
      /justifyContent: "center",\s+paddingTop: insets\.top \+ 16,\s+paddingBottom: insets\.bottom \+ 16,\s+paddingLeft: insets\.left \+ 16,\s+paddingRight: insets\.right \+ 16,/,
    );
    // The sheet pads the home indicator itself (its bottom corners sit below the edge).
    expect(read("Sheet.tsx")).toMatch(/paddingBottom: insets\.bottom \+ 20 \+ SHEET_RADIUS/);
  });

  it("keeps toasts, the tab bar and the FAB clear of the notch and the home indicator", () => {
    const toast = read("Toast.tsx");
    expect(toast).toMatch(/top: insets\.top \+ offset,/);
    expect(toast).toMatch(/left: insets\.left \+ FLOATING_INSET,\s+right: insets\.right \+ FLOATING_INSET,/);
    const bar = read("FloatingTabBar.tsx");
    expect(bar).toMatch(/left: insets\.left \+ FLOATING_INSET,\s+right: insets\.right \+ FLOATING_INSET,/);
    expect(bar).toMatch(/bottom: FLOATING_INSET \+ Math\.max\(insets\.bottom, 8\),/);
    const fab = read("FloatingFAB.tsx");
    expect(fab).toMatch(/right: insets\.right \+ FLOATING_INSET,/);
    expect(fab).toMatch(/bottom: FLOATING_INSET \+ Math\.max\(insets\.bottom, 8\) \+ tabBar \+ 20,/);
  });

  it("lifts dialog and sheet fields above the keyboard on iOS and Android", () => {
    expect(overlay).toMatch(/<KeyboardAvoidingView behavior="padding" style=\{styles\.fill\}>/);
    expect(code(overlay)).not.toMatch(/Platform\.OS === "ios" \? "padding" : undefined/);
    expect(read("Dialog.tsx")).toMatch(/<OverlayModal\s+part="DialogContent"\s+placement=\{compact \? "bottom" : "center"\}/);
    expect(read("Sheet.tsx")).toMatch(/<OverlayModal part="SheetContent" placement="bottom"/);
    expect(read("Dialog.tsx")).toMatch(/keyboardShouldPersistTaps="handled"/);
  });

  it("closes on the VoiceOver escape gesture, as on Android back", () => {
    expect(overlay).toMatch(/onAccessibilityEscape=\{close\}/);
    expect(overlay).toMatch(/onRequestClose=\{close\}/);
  });
});

describe("Dynamic Type", () => {
  it("never turns font scaling off", () => {
    for (const file of files) {
      expect(code(read(file)), file).not.toMatch(/allowFontScaling=\{false\}/);
    }
  });

  it("caps scaling only in the fixed-height tab bar, where the label still fits", () => {
    for (const file of files) {
      if (file === "FloatingTabBar.tsx") continue;
      expect(code(read(file)), file).not.toMatch(/maxFontSizeMultiplier/);
    }
    const cap = Number(read("FloatingTabBar.tsx").match(/maxFontSizeMultiplier=\{([\d.]+)\}/)?.[1]);
    expect(cap).toBeGreaterThanOrEqual(1.5);
    // 64 bar: icon 24, gap 4, `text-sm` line 20 × cap. 72 bar: icon 28, `text-base` line 24.
    expect(24 + 4 + 20 * cap).toBeLessThanOrEqual(64);
    expect(28 + 4 + 24 * cap).toBeLessThanOrEqual(72);
  });

  it("uses minimum heights on labelled pressables", () => {
    expect(read("Select.tsx")).toMatch(/"h-auto min-h-10 w-full/);
    expect(read("Select.tsx")).toMatch(/largerText && "min-h-16 px-4"/);
    expect(read("marketing/UpgradeToProCard.tsx")).toMatch(/largerText \? "min-h-12 px-4" : "min-h-8 px-3"/);
    expect(read("DateTimeField.tsx")).toMatch(/largerText \? "min-h-16" : "min-h-14"/);
    expect(read("SearchInput.tsx")).toMatch(/minHeight: metrics\.minHeight,/);
  });
});

describe("ParityGallery (phone layout)", () => {
  const gallery = code(read("examples/ParityGallery.tsx"));

  it("shows only the One / Two / Three segmented Tabs, as the web gallery", () => {
    expect(gallery).not.toMatch(/PillTabs/);
    const tabs = gallery.slice(gallery.indexOf('<Section title="Tabs">'), gallery.indexOf('<Section title="Avatar'));
    expect(tabs).toMatch(/<TabsList variant="segmented">/);
    expect(tabs.match(/<TabsTrigger /g)).toHaveLength(3);
  });

  it("draws the button variants full width, as the web column", () => {
    const variants = gallery.slice(gallery.indexOf("BUTTON_VARIANTS.map("), gallery.indexOf("</Button>"));
    expect(variants).not.toMatch(/fullWidth/);
  });

  it("leaves room to scroll the last sections to the top of an 844-tall phone", () => {
    expect(gallery).toMatch(/const GALLERY_END_SPACE = 720;/);
    expect(gallery).toMatch(/contentContainerStyle=\{\{ paddingBottom: GALLERY_END_SPACE \}\}/);
    expect(gallery).toMatch(/contentContainerClassName="gap-8 px-4 pt-4"/);
  });

  it("shows an empty and a filled SearchInput in Fields, and lets the clear take the first tap", () => {
    const fields = gallery.slice(gallery.indexOf('<Section title="Fields">'), gallery.indexOf('<Section title="Tabs">'));
    expect(fields).toMatch(/<SearchInput value=\{emptySearch\} onChange=\{setEmptySearch\} \/>/);
    expect(fields).toMatch(/<SearchInput value=\{search\} onChange=\{setSearch\} size="md"/);
    expect(gallery).toMatch(/const \[emptySearch, setEmptySearch\] = useState\(""\);/);
    expect(gallery).toMatch(/const \[search, setSearch\] = useState\("Pink"\);/);
    expect(gallery).toMatch(/<ScrollView\s+keyboardShouldPersistTaps="handled"/);
  });

  it("lets the collapsed upgrade pill stretch in a column, as the web Button does", () => {
    const card = read("marketing/UpgradeToProCard.tsx");
    expect(card).toMatch(/<View testID=\{testID\} className=\{className\}>\s+\{pill\("Pro", title\)\}/);
    expect(code(card)).not.toMatch(/self-start/);
  });
});

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function readSrc(rel: string): string {
  return readFileSync(join(srcDir, rel), "utf8");
}

function listSrc(): string[] {
  return readdirSync(srcDir, { recursive: true, encoding: "utf8" }).filter((file) =>
    /\.tsx?$/.test(file),
  );
}

describe("Android floating shadow rules", () => {
  it("uses boxShadow and never elevation on floatingShadow", () => {
    const src = readSrc("floating.ts");
    expect(src).toMatch(/boxShadow:/);
    expect(src).not.toMatch(/elevation:/);
    expect(src).toMatch(/FLOATING_RADIUS = tokens\.radius\.card/);
    expect(src).toMatch(/FLOATING_ROW_RADIUS = tokens\.radius\.field/);
  });

  it("clips inside FloatingSurface and blurs on iOS and Android through expo-blur", () => {
    const src = readSrc("FloatingSurface.tsx");
    expect(src).toMatch(/styles\.clip/);
    expect(src).not.toMatch(/className=\{cn\("overflow-hidden"/);
    // The solid fill comes from `glassMode` (no expo-blur, blur off, Reduce
    // Transparency), not from the platform.
    expect(src).toMatch(/glassMode\(/);
    expect(src).toMatch(/mode === "solid" \? opaqueFill : translucentFill/);
    expect(src).not.toMatch(/Platform\.OS === "android" \|\|/);
    expect(src).not.toMatch(/=== "ios";/);
    expect(src).toMatch(/const BlurView = loadBlur\(\)\?\.BlurView/);
  });

  it("uses the dimezis blur on Android with the GlassBlurTarget", () => {
    const src = readSrc("FloatingSurface.tsx");
    expect(src).toMatch(
      /experimentalBlurMethod=\{\s*Platform\.OS === "android" \? "dimezisBlurView" : undefined\s*\}/,
    );
    expect(src).toMatch(/blurMethod="dimezisBlurView"/);
    expect(src).toMatch(/blurReductionFactor=\{3\}/);
    expect(src).toMatch(/intensity=\{70\}/);
    expect(src).toMatch(/tint=\{isDark \? "systemMaterialDark" : "systemMaterialLight"\}/);
    expect(src).toMatch(/blurTarget=\{blurTarget \?\? undefined\}/);

    const target = readSrc("glassBlur.tsx");
    expect(target).toMatch(/loadBlur\(\)\?\.BlurTargetView/);
    // Surfaces inside the target must not blur their own ancestor.
    expect(target).toMatch(/<GlassBlurContext\.Provider value=\{NO_TARGET\}>\{children\}/);
  });

  it("loads expo-blur and expo-haptics only through the optional-peer loaders", () => {
    for (const file of listSrc()) {
      expect(readSrc(file), file).not.toMatch(/^import (?!type )[^;]*from "expo-(?:blur|haptics)"/m);
    }
    expect(readSrc("blur.ts")).toMatch(/try \{\s*expoBlur = require\("expo-blur"\)/);
    expect(readSrc("haptics.ts")).toMatch(/try \{\s*expoHaptics = require\("expo-haptics"\)/);
    expect(readSrc("FloatingTabBar.tsx")).toMatch(/selectionHaptic\(\);/);
  });

  it("does not put NativeWind shadows on nested or translucent chrome", () => {
    const files = [
      "Button.tsx",
      "Chip.tsx",
      "PillTabs.tsx",
      "HeaderIconButton.tsx",
      "ListRow.tsx",
      "settings/SettingsSection.tsx",
      "Badge.tsx",
      "Checkbox.tsx",
      "Tabs.tsx",
      "Avatar.tsx",
      "Progress.tsx",
      "Dialog.tsx",
      "Sheet.tsx",
      "Toast.tsx",
      "marketing/UpgradeToProCard.tsx",
      "marketing/PricingModal.tsx",
    ];
    for (const file of files) {
      expect(readSrc(file), file).not.toMatch(/shadow-(?:sm|md|lg|xl|2xl)\b/);
    }
  });

  it("never uses elevation in any source file", () => {
    for (const file of listSrc()) {
      expect(readSrc(file), file).not.toMatch(/\belevation\s*[:=]/);
    }
  });

  it("raises overlays and toasts with FloatingSurface, opaque when nested in a Modal", () => {
    for (const file of ["Dialog.tsx", "Sheet.tsx"]) {
      expect(readSrc(file), file).toMatch(/<FloatingSurface blur=\{false\}/);
    }
    expect(readSrc("Toast.tsx")).toMatch(/<FloatingSurface/);
  });
});

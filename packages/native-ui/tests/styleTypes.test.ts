import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function readSrc(rel: string): string {
  return readFileSync(join(srcDir, rel), "utf8");
}

// React Native 0.88 types View `style` on its own; Expo SDK 58 widens
// `ViewStyle` (`position: "fixed"`, `backgroundImage`) through
// react-native-web. A `StyleProp<ViewStyle>` or `ViewStyle` prop handed to a
// View or Svg then fails `tsc` in the app. react-native-svg 15 types `G` props
// as `GProps`.
describe("style prop types for React Native 0.88 and react-native-svg 15", () => {
  for (const file of ["brand/AppIcons.tsx", "brand/AppMark.tsx", "brand/GoogleMark.tsx"]) {
    it(`${file} types style as ViewProps["style"]`, () => {
      const src = readSrc(file);
      expect(src).toMatch(/^\s+style\?: ViewProps\["style"\];$/m);
      expect(src).not.toMatch(/StyleProp<ViewStyle>/);
      expect(src).not.toMatch(/\bViewStyle\b/);
    });
  }

  for (const file of ["brand/AppIcons.tsx", "brand/AppMark.tsx"]) {
    it(`${file} types the glyph props as GProps`, () => {
      const src = readSrc(file);
      expect(src).toMatch(/import Svg, \{[^}]*\btype GProps\b[^}]*\} from "react-native-svg";/);
      expect(src).toMatch(/const glyphProps: GProps =/);
    });
  }

  it("floatingShadow is not typed as ViewStyle but keeps its shadow keys", () => {
    const src = readSrc("floating.ts");
    expect(src).not.toMatch(/type ViewStyle\b/);
    expect(src).not.toMatch(/floatingShadow: ViewStyle/);
    expect(src).toMatch(/export const floatingShadow: FloatingShadowStyle =/);
    for (const key of ["shadowColor", "shadowOffset", "shadowOpacity", "shadowRadius", "boxShadow"]) {
      expect(src).toMatch(new RegExp(`^\\s+${key}\\?: `, "m"));
    }
  });

  it("the Switch primitive types thumbStyle as ViewProps[\"style\"]", () => {
    const src = readSrc("primitives/switch.tsx");
    expect(src).toMatch(/thumbStyle\?: ViewProps\["style"\];/);
    expect(src).not.toMatch(/thumbStyle\?: ViewStyle;/);
  });
});

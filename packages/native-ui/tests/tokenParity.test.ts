import { describe, expect, it } from "vitest";
import { tokens as nativeTokens } from "../src/tokens";
import { palette } from "../src/palette";
import { PAGE_TITLE_CLASS, pageTitleStyle } from "../src/controlStyles";
import { fontClass } from "../src/typography";
// The web side of the same values: the copy that `@vvedantb/ui` re-exports as
// `tokens`, and the page title class that its `PageTitle` renders.
import { tokens as webTokens } from "../../ui/tokens/src/native";
import { pageTitleClass as webPageTitleClass } from "../../ui/src/ui/page-title";

// Native and web design token parity. Every value is imported and compared; no
// file is read. `tokens.ts` in native-ui is a copy of `ui/tokens/src/native.ts`.

describe("colour, radius and spacing tokens", () => {
  it("native-ui tokens equal the @vvedantb/ui native tokens", () => {
    expect(nativeTokens).toEqual(webTokens);
  });

  it("every colour key and radius key exists on both sides", () => {
    expect(Object.keys(nativeTokens.color).sort()).toEqual(Object.keys(webTokens.color).sort());
    expect(Object.keys(nativeTokens.radius).sort()).toEqual(Object.keys(webTokens.radius).sort());
  });

  it("radii and spacing are the web values (1rem = 16)", () => {
    expect(nativeTokens.radius).toEqual({ lg: 16, field: 10, md: 14, sm: 12, card: 24, pill: 999 });
    expect(nativeTokens.spacing.unit).toBe(16);
    expect(webTokens.spacing.unit).toBe(16);
  });
});

describe("palette against tokens", () => {
  // The palette repeats neutral colours that the tokens also hold. They must agree in both schemes.
  it.each([
    ["primary", "foreground"],
    ["defaultForeground", "foreground"],
    ["overlay", "surface"],
    ["overlayForeground", "foreground"],
    ["segmentForeground", "foreground"],
    ["fieldPlaceholder", "muted"],
  ] as const)("palette.%s equals tokens.color.%s", (paletteKey, tokenKey) => {
    expect(palette[paletteKey]).toEqual(webTokens.color[tokenKey]);
  });

  it("primaryForeground is the foreground pair swapped (text on the primary fill)", () => {
    expect(palette.primaryForeground).toEqual({
      light: webTokens.color.foreground.dark,
      dark: webTokens.color.foreground.light,
    });
  });
});

describe("typography: page title", () => {
  it("native class is the web page title class with the Instrument Sans semibold face", () => {
    const web = webPageTitleClass.replace("font-semibold", fontClass.semibold);
    expect(PAGE_TITLE_CLASS.split(" ").sort()).toEqual(web.split(" ").sort());
    expect(fontClass.semibold).toBe("font-instrument-sans-semibold");
  });

  it("native style is Instrument Sans 600 at 20px (line height 25, letter spacing -0.5)", () => {
    expect(PAGE_TITLE_CLASS).toContain("font-instrument-sans-semibold");
    expect(pageTitleStyle()).toEqual({ fontSize: 20, lineHeight: 25, fontWeight: "600", letterSpacing: -0.5 });
  });

  it("the web class sets the same size, weight, leading and tracking", () => {
    // Tailwind defaults: text-xl is 20px, font-semibold is 600, leading-tight is 1.25, tracking-tight is -0.025em.
    expect(webPageTitleClass.split(" ").sort()).toEqual(["font-semibold", "leading-tight", "text-xl", "tracking-tight"]);
    const style = pageTitleStyle();
    expect(style.lineHeight).toBe(style.fontSize * 1.25);
    expect(style.letterSpacing).toBe(style.fontSize * -0.025);
  });
});

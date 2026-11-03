import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

// `@vvedantb/native-ui/tailwind-preset` (0.7.0) is CommonJS for
// `tailwind.config.js`. NativeWind is not installed here, so the nested
// `nativewind/preset` and `hairlineWidth` fall back to none.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const file = join(root, "src/tailwind-preset.cjs");
const source = readFileSync(file, "utf8");
const preset = require(file) as typeof import("../src/tailwind-preset.cjs");

type Base = Record<string, Record<string, unknown>>;

function base(options: Parameters<typeof preset.nativeUiPreset>[0]): Base[] {
  const added: Base[] = [];
  for (const plugin of preset.nativeUiPreset(options).plugins) plugin({ addBase: (b) => added.push(b as Base) });
  return added;
}

const channels = (hex: string) => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

describe("tailwind preset API", () => {
  it("exports the preset, the content glob, the colour helpers and a default preset", () => {
    for (const name of ["nativeUiPreset", "nativeUiContent", "cssVar", "hslVar", "rgbAlpha"] as const) {
      expect(typeof preset[name], name).toBe("function");
    }
    expect(preset.default.darkMode).toBe("class");
    expect(preset.cssVar("border")).toBe("var(--border)");
    expect(preset.hslVar("border")).toBe("hsl(var(--border))");
    expect(preset.rgbAlpha("border")).toBe("rgb(var(--border) / <alpha-value>)");
  });

  it("defaults to class dark mode and takes media", () => {
    expect(preset.nativeUiPreset().darkMode).toBe("class");
    expect(preset.nativeUiPreset({ darkMode: "media" }).darkMode).toBe("media");
  });

  it("nests nativewind/preset when it is installed, and does not crash without it", () => {
    expect(source).toMatch(/require\("nativewind\/preset"\)/);
    expect(Array.isArray(preset.nativeUiPreset().presets)).toBe(true);
    expect(source).toMatch(/require\("nativewind\/theme"\)/);
  });

  it("maps the Instrument Sans classes to the Expo Google Fonts faces", () => {
    expect(preset.nativeUiPreset().theme.extend.fontFamily).toEqual({
      sans: ["InstrumentSans_400Regular"],
      "instrument-sans": ["InstrumentSans_400Regular"],
      "instrument-sans-medium": ["InstrumentSans_500Medium"],
      "instrument-sans-semibold": ["InstrumentSans_600SemiBold"],
      "instrument-sans-bold": ["InstrumentSans_700Bold"],
    });
  });

  it("has the shared colour keys, through `color`", () => {
    const colors = preset.nativeUiPreset({ color: preset.hslVar }).theme.extend.colors as Record<string, any>;
    for (const key of ["background", "foreground", "border", "input", "ring", "separator"]) {
      expect(colors[key], key).toBe(`hsl(var(--${key}))`);
    }
    expect(colors.surface).toMatchObject({
      DEFAULT: "hsl(var(--surface))",
      secondary: "hsl(var(--surface-secondary))",
      tertiary: "hsl(var(--surface-tertiary))",
      card: "hsl(var(--surface-card))",
    });
    for (const key of [
      "primary",
      "secondary",
      "destructive",
      "muted",
      "accent",
      "popover",
      "card",
      "danger",
      "success",
      "warning",
      "default",
      "overlay",
    ]) {
      expect(colors[key], key).toEqual({
        DEFAULT: `hsl(var(--${key}))`,
        foreground: `hsl(var(--${key}-foreground))`,
      });
    }
    expect(colors.field.DEFAULT).toBe("hsl(var(--field))");
    expect(preset.nativeUiPreset().theme.extend.colors.background).toBe("var(--background)");
  });

  it("leaves out the app-local pieces", () => {
    const extend = preset.nativeUiPreset().theme.extend as Record<string, unknown>;
    expect(Object.keys(extend).sort()).toEqual(["borderRadius", "borderWidth", "colors", "fontFamily"]);
    expect(JSON.stringify(preset.nativeUiPreset({ injectCssVariables: true }))).not.toMatch(
      /michroma|geist|host-grotesk|feature|accordion|corePlugins/i,
    );
    expect(source).not.toMatch(/tailwindcss-animate|require\("tailwindcss/);
  });

  it("uses the --radius radii only when asked, or with the injected variables", () => {
    expect(preset.nativeUiPreset().theme.extend.borderRadius).toEqual({});
    const radii = { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" };
    expect(preset.nativeUiPreset({ radiusVariable: true }).theme.extend.borderRadius).toEqual(radii);
    expect(preset.nativeUiPreset({ injectCssVariables: true }).theme.extend.borderRadius).toEqual(radii);
  });
});

describe("nativeUiContent", () => {
  it("is an absolute glob of this package's src", () => {
    const glob = preset.nativeUiContent();
    expect(glob).toBe(`${join(root, "src").split("\\").join("/")}/**/*.{js,ts,tsx}`);
    expect(glob).toMatch(/native-ui\/src\/\*\*\/\*\.\{js,ts,tsx\}$/);
  });
});

describe("injectCssVariables", () => {
  it("adds no plugin by default", () => {
    expect(preset.nativeUiPreset().plugins).toEqual([]);
  });

  it("writes :root and .dark from tokens.ts and palette.ts as RGB channels, and defaults color to rgbAlpha", () => {
    const result = preset.nativeUiPreset({ injectCssVariables: true });
    expect(result.plugins).toHaveLength(1);
    expect(result.theme.extend.colors.background).toBe("rgb(var(--background) / <alpha-value>)");
    const [added] = base({ injectCssVariables: true });
    const light = added![":root"]!;
    const dark = added![".dark:root, .dark"]!;
    expect(light["--background"]).toBe(channels(tokens.color.background.light));
    expect(dark["--background"]).toBe(channels(tokens.color.background.dark));
    expect(light["--surface-secondary"]).toBe(channels(tokens.color.surfaceSecondary.light));
    expect(light["--primary"]).toBe(channels(palette.primary.light));
    expect(dark["--danger"]).toBe(channels(palette.danger.dark));
    expect(light["--radius"]).toBe(`${tokens.radius.lg}px`);
    // Every colour key the theme names has a variable.
    const named = JSON.stringify(result.theme.extend.colors).match(/--[\w-]+/g)!;
    for (const name of new Set(named)) expect(light[name], name).toMatch(/^\d+ \d+ \d+$/);
  });

  it("uses the prefers-color-scheme query with darkMode media", () => {
    const [added] = base({ injectCssVariables: true, darkMode: "media" });
    expect(Object.keys(added!)).toEqual([":root", "@media (prefers-color-scheme: dark)"]);
    const media = added!["@media (prefers-color-scheme: dark)"] as Record<string, Record<string, string>>;
    expect(media[":root"]!["--foreground"]).toBe(channels(tokens.color.foreground.dark));
  });

  it("reads the colours from tokens.ts and palette.ts, not a copy", () => {
    expect(source).toMatch(/readConst\("tokens\.ts", "tokens"\)/);
    expect(source).toMatch(/readConst\("palette\.ts", "palette"\)/);
    expect(source).not.toMatch(/#[0-9a-f]{6}/i);
  });
});

describe("tailwind preset copy", () => {
  it("names no auth provider or AI model", () => {
    expect(source).not.toMatch(/clerk/i);
    expect(source).not.toMatch(/\b(gpt|claude|gemini|llama|openai|anthropic)\b/i);
  });
});

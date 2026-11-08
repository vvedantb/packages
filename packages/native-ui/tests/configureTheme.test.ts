import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureTheme } from "../src/configureTheme";
import { floatingFill, floatingSolidFill } from "../src/floating";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

// `configureTheme` writes an app's colours into the shared `tokens.color` and
// `palette` objects. The values below are Eva's web theme (`globals.css`,
// `--background`, `--card`, `--primary`), as hex.

vi.mock("react-native", () => ({ Platform: { OS: "ios", select: () => ({}) } }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const original = { color: structuredClone(tokens.color), palette: structuredClone(palette) };

afterEach(() => configureTheme({ color: original.color, palette: original.palette }));

describe("configureTheme", () => {
  it("sets light and dark values for the given keys and leaves the others", () => {
    configureTheme({
      color: { background: { light: "#f4f5f6", dark: "#020202" }, surface: { light: "#ffffff", dark: "#101010" } },
      palette: { primary: { light: "#09090b", dark: "#fafafa" } },
    });
    expect(tokens.color.background).toEqual({ light: "#f4f5f6", dark: "#020202" });
    expect(tokens.color.surface.dark).toBe("#101010");
    expect(palette.primary).toEqual({ light: "#09090b", dark: "#fafafa" });
    expect(tokens.color.foreground).toEqual(original.color.foreground);
    expect(tokens.color.white).toBe("#ffffff");
    expect(palette.danger).toEqual(original.palette.danger);
    expect(palette.destructive).toBe(original.palette.destructive);
    expect(tokens.radius.lg).toBe(16);
  });

  it("writes into the existing pairs, so the floating fills follow", () => {
    const surface = tokens.color.surface;
    configureTheme({
      color: { surface: { light: "#fefefe", dark: "#111111" }, fill: { light: "rgba(1, 2, 3, 0.5)", dark: "rgba(4, 5, 6, 0.5)" } },
    });
    expect(tokens.color.surface).toBe(surface);
    expect(floatingSolidFill).toEqual({ light: "#fefefe", dark: "#111111" });
    expect(floatingFill.dark).toBe("rgba(4, 5, 6, 0.5)");
  });

  it("sets single-value keys and skips undefined ones", () => {
    configureTheme({ color: { black: "#020202", muted: undefined }, palette: { destructive: "#b91c1c" } });
    expect(tokens.color.black).toBe("#020202");
    expect(tokens.color.muted).toEqual(original.color.muted);
    expect(palette.destructive).toBe("#b91c1c");
  });

  it("is exported from the root and /theme entries", () => {
    for (const file of ["src/index.ts", "src/entries/theme.ts"]) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source, file).toMatch(/export \{ configureTheme \} from "\.\.?\/configureTheme";/);
      expect(source, file).toMatch(/export type \{ ThemeConfig, ThemeColors, ThemePalette \}/);
    }
  });
});

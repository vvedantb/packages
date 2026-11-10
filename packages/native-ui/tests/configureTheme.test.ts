import { afterEach, describe, expect, it, vi } from "vitest";
import { configureTheme } from "../src/configureTheme";
import { floatingFill, floatingSolidFill } from "../src/floating";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";
import { fontFamily } from "../src/typography";

// `configureTheme` writes an app's colours into the shared `tokens.color` and
// `palette` objects, and its fonts into `fontFamily`. The values below are Eva's web theme (`globals.css`,
// `--background`, `--card`, `--primary`), as hex.

vi.mock("react-native", () => ({ Platform: { OS: "ios", select: () => ({}) } }));
const original = { color: structuredClone(tokens.color), palette: structuredClone(palette), font: { ...fontFamily } };

afterEach(() => configureTheme(original));

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
});

describe("configureTheme font", () => {
  it("defaults to Instrument Sans", () => {
    expect(fontFamily).toEqual({
      regular: "InstrumentSans_400Regular",
      medium: "InstrumentSans_500Medium",
      semibold: "InstrumentSans_600SemiBold",
      bold: "InstrumentSans_700Bold",
    });
  });

  it("sets the given faces and leaves the others", () => {
    configureTheme({ font: { regular: "Inter_400Regular", semibold: "Inter_600SemiBold", bold: undefined } });
    expect(fontFamily).toEqual({ ...original.font, regular: "Inter_400Regular", semibold: "Inter_600SemiBold" });
  });
});

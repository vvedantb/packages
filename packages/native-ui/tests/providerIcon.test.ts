import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { ProviderIconProvider } from "../src/brand/ProviderIcon";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path", Rect: "Rect" }));
vi.mock("../src/useScheme", () => ({ useScheme: () => "light" }));

const { PROVIDER_MARKS, ProviderIcon, providerLabel, providerMark } = await import("../src/brand/ProviderIcon");
const ORDER: ReadonlyArray<ProviderIconProvider> = ["claude", "codex", "opencode", "cursor"];

describe("ProviderIcon parity with @vvedantb/ui", () => {
  it("has the four web marks in the web order", () => {
    expect(Object.keys(PROVIDER_MARKS)).toEqual([...ORDER]);
  });

  it("names each provider as the web getProviderLabel", () => {
    expect(providerLabel("gemini")).toBe("gemini");
  });

  it("draws the Claude mark for an unknown provider, as the web default", () => {
    expect(providerMark("gemini")).toBe(PROVIDER_MARKS.claude);
    expect(providerMark("cursor")).toBe(PROVIDER_MARKS.cursor);
  });

  it("renders a 14 Svg by default, decorative unless titled", () => {
    const svg = ProviderIcon({ provider: "codex" });
    expect(svg.type).toBe("Svg");
    expect(svg.props).toMatchObject({ width: 14, height: 14, viewBox: "0 0 256 260", "aria-hidden": true });
    expect(svg.props.children).toMatchObject([{ type: "Path", props: { fill: "#000" } }]);
    const titled = ProviderIcon({ provider: "opencode", size: 12, title: "Opus" });
    expect(titled.props).toMatchObject({ width: 12, role: "img", "aria-label": "Opus" });
    expect(titled.props.children).toMatchObject([{ type: "Rect" }, { type: "Path" }, { type: "Path" }]);
  });
});

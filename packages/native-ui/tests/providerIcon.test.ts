import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { ProviderIconProvider } from "../src/brand/ProviderIcon";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path", Rect: "Rect" }));
vi.mock("../src/useScheme", () => ({ useScheme: () => "light" }));

const { PROVIDER_MARKS, ProviderIcon, providerMark } = await import("../src/brand/ProviderIcon");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = readFileSync(join(root, "..", "ui/src/ai-elements/provider-icon.tsx"), "utf8");

/** Web mark function bodies in source order: ClaudeMark, OpenAIMark, OpencodeMark, CursorMark. */
const webMarks = [...web.matchAll(/function (\w+Mark)\([\s\S]*?\n}\n/g)].map(([body, name]) => ({ name, body }));
const ORDER: ReadonlyArray<ProviderIconProvider> = ["claude", "codex", "opencode", "cursor"];

describe("ProviderIcon parity with @vvedantb/ui", () => {
  it("has the four web marks in the web order", () => {
    expect(webMarks.map((mark) => mark.name)).toEqual(["ClaudeMark", "OpenAIMark", "OpencodeMark", "CursorMark"]);
    expect(Object.keys(PROVIDER_MARKS)).toEqual([...ORDER]);
  });

  for (const [index, provider] of ORDER.entries()) {
    it(`${provider} uses the web viewBox, path data and fills`, () => {
      const body = webMarks[index]?.body ?? "";
      const mark = PROVIDER_MARKS[provider];
      expect(mark.viewBox).toBe(/viewBox="([^"]+)"/.exec(body)?.[1]);
      const paths = mark.layers.flatMap((layer) => ("d" in layer ? [layer.d] : []));
      expect(paths).toEqual([...body.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]));
      // Literal fills on the web `<svg>`, `<rect>` and `<path>`, in order; `currentColor` marks take the class colours.
      const literal = [...body.matchAll(/fill="(#[0-9A-Fa-f]+)"/g)].map((match) => match[1]);
      const fills = mark.layers.map((layer) => layer.fill);
      if (body.includes('fill="currentColor"')) {
        const [, light, dark] = /text-(?:\[(#\w+)\]|black) dark:text-(?:\[(#\w+)\]|white)/.exec(body) ?? [];
        expect(fills).toEqual([{ light: light ?? "#000", dark: dark ?? "#fff" }]);
      } else {
        expect(fills).toEqual(literal);
      }
      expect(mark.layers.some((layer) => "d" in layer && layer.evenOdd)).toBe(body.includes('fillRule="evenodd"'));
      expect(mark.layers.some((layer) => "square" in layer)).toBe(/<rect width="512" height="512"/.test(body));
    });
  }

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

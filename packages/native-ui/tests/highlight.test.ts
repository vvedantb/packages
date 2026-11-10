import Module from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GITHUB_CODE_COLORS, codeTokenColor } from "../src/highlight";

// `CodeBlock` highlighting with the optional peer `prism-react-renderer`. It
// is not installed here, so the loader hits the missing-peer path for real;
// the present-peer cases hand `require` a stub `Highlight` through Node's
// module loader, as `tests/optionalPeers.test.ts` does.

const scheme = vi.hoisted(() => ({ colorScheme: "light" }));
vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default },
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
}));
vi.mock("nativewind", () => ({ useColorScheme: () => scheme }));
vi.mock("@tabler/icons-react-native", () => ({ IconCheck: "IconCheck", IconCopy: "IconCopy" }));
vi.mock("../src/theme", () => ({ useLargerText: () => false }));
vi.mock("../src/ai/icon-button", () => ({ ChatIconButton: "ChatIconButton" }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };
type Token = { types: string[]; content: string };

type Load = (this: unknown, request: string, ...rest: unknown[]) => unknown;
const nodeModule = Module as unknown as { _load: Load };
const realLoad = nodeModule._load;

function providePeer(name: string, exports: unknown) {
  nodeModule._load = function (request, ...rest) {
    return request === name ? exports : realLoad.call(this, request, ...rest);
  };
}

afterEach(() => {
  nodeModule._load = realLoad;
  scheme.colorScheme = "light";
  vi.resetModules();
});

const elements = (node: unknown): Element[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
};

/** The child of the selectable code `Text` in a `CodeBlock`. */
async function codeChild(props: { code: string; language?: string; highlight?: boolean }) {
  const { CodeBlock } = await import("../src/ai/code-block");
  const tree = CodeBlock(props) as unknown as Element;
  const code = elements(tree).find((element) => element.type === "Text" && element.props.selectable === true);
  return code?.props.children;
}

/** Renders the `HighlightedCode` child once, as React would. */
function renderHighlighted(child: unknown) {
  const element = child as Element;
  return (element.type as (props: Record<string, unknown>) => unknown)(element.props);
}

describe("codeTokenColor", () => {
  it("maps Prism types to the shiki github-light and github-dark colours", () => {
    expect(codeTokenColor(["keyword"], "light")).toBe("#d73a49");
    expect(codeTokenColor(["keyword"], "dark")).toBe("#f97583");
    expect(codeTokenColor(["string"], "light")).toBe("#032f62");
    expect(codeTokenColor(["comment"], "dark")).toBe("#6a737d");
    expect(codeTokenColor(["function"], "light")).toBe("#6f42c1");
    expect(codeTokenColor(["number"], "dark")).toBe("#79b8ff");
    expect(codeTokenColor(["plain"], "light")).toBe(GITHUB_CODE_COLORS.light.plain);
    expect(codeTokenColor(["unknown-type"], "dark")).toBe(GITHUB_CODE_COLORS.dark.plain);
  });

  it("lets the later type win, so tag brackets are plain", () => {
    expect(codeTokenColor(["tag"], "light")).toBe("#22863a");
    expect(codeTokenColor(["tag", "punctuation"], "light")).toBe(GITHUB_CODE_COLORS.light.plain);
  });
});

describe("CodeBlock highlighting", () => {
  it("returns null from the loader and draws plain code without prism-react-renderer", async () => {
    const { loadPrismReactRenderer } = await import("../src/highlight");
    expect(loadPrismReactRenderer()).toBeNull();
    const child = await codeChild({ code: "const a = 1;", language: "ts" });
    expect(renderHighlighted(child)).toBe("const a = 1;");
  });

  it("keeps plain code with no language or highlight off", async () => {
    expect(await codeChild({ code: "x" })).toBe("x");
    expect(await codeChild({ code: "x", language: "ts", highlight: false })).toBe("x");
  });

  it("draws one coloured Text span per token, lines joined by newlines, in both schemes", async () => {
    const tokens: Token[][] = [
      [
        { types: ["keyword"], content: "const" },
        { types: ["plain"], content: " a = " },
        { types: ["number"], content: "1" },
      ],
      [{ types: ["comment"], content: "// done" }],
    ];
    const Highlight = vi.fn((props: { children: (render: { tokens: Token[][] }) => unknown }) =>
      props.children({ tokens }),
    );
    providePeer("prism-react-renderer", { Highlight, themes: {} });
    for (const name of ["light", "dark"] as const) {
      scheme.colorScheme = name;
      vi.resetModules();
      const child = await codeChild({ code: "const a = 1;\n// done\n", language: "TSX" });
      const highlight = renderHighlighted(child) as Element;
      expect(highlight.type).toBe(Highlight);
      expect(highlight.props).toMatchObject({ code: "const a = 1;\n// done", language: "tsx" });
      const lines = (highlight.props.children as (render: { tokens: Token[][] }) => unknown)({ tokens });
      const spans = elements(lines).filter((element) => element.type === "Text");
      expect(spans.map((span) => span.props.children)).toEqual(["const", " a = ", "1", "// done"]);
      expect(spans.map((span) => (span.props.style as { color: string }).color)).toEqual([
        GITHUB_CODE_COLORS[name].keyword,
        GITHUB_CODE_COLORS[name].plain,
        GITHUB_CODE_COLORS[name].constant,
        GITHUB_CODE_COLORS[name].comment,
      ]);
      const newlines = elements(lines).flatMap((element) =>
        Array.isArray(element.props.children) ? element.props.children.filter((part) => part === "\n") : [],
      );
      expect(newlines).toHaveLength(1);
    }
  });
});

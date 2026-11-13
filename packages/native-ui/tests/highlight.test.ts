import { createRequire } from "node:module";
import Module from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GITHUB_CODE_COLORS, codeTokenColor, scriptTokens, shellTokens, type CodeToken } from "../src/highlight";

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
// Parts run as plain functions here, outside a renderer: `useScheme` reads the
// theme version context (`ThemeVersionContext`), so `useContext` gives its default, 0.
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), useContext: () => 0 }));
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
    // The workspace now installs the peer for the gallery app, and pnpm puts its store on
    // NODE_PATH, so hide it here to test the missing-peer path whatever is installed.
    const nodeModule = createRequire(import.meta.url)("node:module") as { _load: (request: string, ...rest: unknown[]) => unknown };
    const load = nodeModule._load;
    nodeModule._load = (request, ...rest) => {
      if (request === "prism-react-renderer") throw Object.assign(new Error("Cannot find module"), { code: "MODULE_NOT_FOUND" });
      return load.call(nodeModule, request, ...rest);
    };
    try {
      const { loadPrismReactRenderer } = await import("../src/highlight");
      expect(loadPrismReactRenderer()).toBeNull();
      const child = await codeChild({ code: "const a = 1;", language: "ts" });
      expect(renderHighlighted(child)).toBe("const a = 1;");
    } finally {
      nodeModule._load = load;
    }
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
      // The JavaScript family draws through `CodeRuns`: render it once too.
      const lines = renderHighlighted((highlight.props.children as (render: { tokens: Token[][] }) => unknown)({ tokens }));
      const spans = elements(lines).filter((element) => element.type === "Text");
      // A `const` name takes the constant colour, as the web's Shiki draws it.
      expect(spans.map((span) => span.props.children)).toEqual(["const", " ", "a", " = ", "1", "// done"]);
      expect(spans.map((span) => (span.props.style as { color: string }).color)).toEqual([
        GITHUB_CODE_COLORS[name].keyword,
        GITHUB_CODE_COLORS[name].plain,
        GITHUB_CODE_COLORS[name].constant,
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

// Prism's TypeScript tokens for a snippet of mock chat A (`prism-react-renderer`
// `normalizeTokens`), and the roles the web's Shiki `github-light` gives them.
const PRISM_TS: [string, string][][] = [
  [["keyword", "type"], ["plain", " "], ["class-name", "Cell"], ["plain", " "], ["operator", "="], ["plain", " "], ["builtin", "string"], ["plain", " "], ["operator", "|"], ["plain", " Date "], ["operator", "|"], ["plain", " "], ["keyword", "null"], ["punctuation", ";"]],
  [["keyword", "function"], ["plain", " "], ["function", "escapeCell"], ["punctuation", "("], ["plain", "value"], ["operator", ":"], ["plain", " Cell"], ["punctuation", ")"], ["operator", ":"], ["plain", " "], ["builtin", "string"], ["plain", " "], ["punctuation", "{"]],
  [["plain", "  "], ["keyword", "const"], ["plain", " text "], ["operator", "="], ["plain", " "], ["template-string/template-punctuation/string", "`"], ["template-string/string", '"'], ["template-string/interpolation/interpolation-punctuation/punctuation", "${"], ["template-string/interpolation", "value"], ["template-string/interpolation/interpolation-punctuation/punctuation", "}"], ["template-string/string", '"'], ["template-string/template-punctuation/string", "`"], ["punctuation", ";"]],
  [["plain", "  "], ["keyword", "return"], ["plain", " "], ["regex/regex-delimiter", "/"], ["regex/regex-source/language-regex/char-class/char-class-punctuation/punctuation", "["], ["regex/regex-source/language-regex/char-class", '",'], ["regex/regex-source/language-regex/char-class/escape", "\\n"], ["regex/regex-source/language-regex/char-class/char-class-punctuation/punctuation", "]"], ["regex/regex-delimiter", "/"], ["punctuation", "."], ["function", "test"], ["punctuation", "("], ["plain", "text"], ["punctuation", ")"], ["plain", " "], ["operator", "?"], ["plain", " text "], ["operator", ":"], ["plain", " "], ["string", '"\\r\\n"'], ["punctuation", ";"]],
  [["plain", "rows"], ["punctuation", "."], ["function", "map"], ["punctuation", "("], ["punctuation", "("], ["plain", "row"], ["punctuation", ")"], ["plain", " "], ["operator", "=>"], ["plain", " "], ["keyword", "new"], ["plain", " "], ["class-name", "Map"], ["class-name/operator", "<"], ["class-name/builtin", "string"], ["class-name/punctuation", ","], ["class-name", " Cell"], ["class-name/operator", ">"], ["punctuation", "("], ["punctuation", ")"], ["punctuation", ")"], ["punctuation", ";"]],
];

/**
 * The role `content` is drawn in on `line` (its `occurrence`-th match), or
 * "split" when it spans runs of different roles. Runs of one role merge, so
 * this reads the text, not the run boundaries.
 */
function roleOf(lines: CodeToken[][], line: number, content: string, occurrence = 0) {
  const runs = lines[line] ?? [];
  let start = -1;
  for (let count = 0; count <= occurrence; count += 1) start = runs.map((run) => run.content).join("").indexOf(content, start + 1);
  let offset = 0;
  for (const run of runs) {
    const end = offset + run.content.length;
    if (start >= offset && start < end) return start + content.length <= end ? run.role : "split";
    offset = end;
  }
  return undefined;
}

describe("web colours for TypeScript", () => {
  const lines = scriptTokens(PRISM_TS.map((line) => line.map(([types, content]) => ({ types: types.split("/"), content }))));

  it("draws null, type names and const names as Shiki does", () => {
    expect(roleOf(lines, 0, "null")).toBe("constant");
    expect(roleOf(lines, 0, "Date")).toBe("function");
    expect(roleOf(lines, 1, "Cell")).toBe("function");
    expect(roleOf(lines, 2, "text")).toBe("constant");
  });

  it("draws parameters in the variable colour, and only parameters", () => {
    expect(roleOf(lines, 1, "value")).toBe("variable");
    expect(roleOf(lines, 4, "row", 1)).toBe("variable");
    expect(roleOf(lines, 3, "(text)")).toBe("plain");
    expect(roleOf(lines, 4, "rows")).toBe("plain");
  });

  it("splits escapes out of strings, and draws a regex class and ${} as Shiki does", () => {
    expect(roleOf(lines, 3, '[",\\n]')).toBe("constant");
    expect(roleOf(lines, 3, "\\r\\n")).toBe("constant");
    expect(roleOf(lines, 3, '"', 1)).toBe("string");
    expect(roleOf(lines, 2, "${")).toBe("string");
    expect(roleOf(lines, 2, "value")).toBe("plain");
  });

  it("draws type-argument brackets plain", () => {
    expect(roleOf(lines, 4, "<")).toBe("plain");
    expect(roleOf(lines, 4, ">", 1)).toBe("plain");
    expect(roleOf(lines, 4, "=>")).toBe("keyword");
  });
});

describe("web colours for shell", () => {
  const roles = (code: string) => shellTokens(code).map((line) => line.filter((token) => token.content.trim() !== "").map((token) => `${token.content.trim()}:${token.role}`));

  it("draws commands, arguments, options and operators as Shiki's bash grammar does", () => {
    expect(roles("pnpm tsc --noEmit")).toEqual([["pnpm:function", "tsc:string", "--noEmit:constant"]]);
    expect(roles("cd web && npm i -D zod | tee log")).toEqual([
      ["cd:constant", "web:string", "&&:plain", "npm:function", "i:string", "-D:constant", "zod:string", "|:keyword", "tee:function", "log:string"],
    ]);
  });

  it("draws keywords, comments, quoted strings and their variables", () => {
    expect(roles('for i in $(seq 20); do echo "$i done"; done # loop')).toEqual([
      ["for:keyword", "i:plain", "in:keyword", "$(:plain", "seq:function", "20:constant", ");:plain", "do:keyword", "echo:constant", '":string', "$i:plain", 'done":string', ";:plain", "done:keyword", "# loop:comment"],
    ]);
  });
});

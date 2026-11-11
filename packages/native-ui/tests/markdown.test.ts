import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { palette, withAlpha } from "../src/palette";
import { tokens } from "../src/tokens";

// `@vvedantb/native-ui/markdown`. `react-native-marked` is an optional peer and
// not installed here, so it is stubbed; the checks read the style map against
// the web `markdown.css` and the renderer source.

vi.mock("react-native", () => ({ Platform: { select: (o: { default: string }) => o.default }, Text: "Text", View: "View" }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("react-native-marked", () => ({ Renderer: class {}, useMarkdown: () => [] }));
vi.mock("../src/ai/code-block", () => ({ CodeBlock: "CodeBlock" }));
vi.mock("../src/ai/response-text", () => ({ ChatTextColorContext: {} }));
vi.mock("../src/theme", () => ({ useLargerText: () => false }));
vi.mock("../src/markdown/MarkdownTable", () => ({ MarkdownTable: "MarkdownTable", MARKDOWN_TABLE: { fontScale: 0.93, lineHeight: 1.5 } }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webCss = readFileSync(join(root, "..", "ui", "tokens", "src", "css", "markdown.css"), "utf8");
const source = readFileSync(join(root, "src", "markdown", "Markdown.tsx"), "utf8");
const body = { fontSize: 16, lineHeight: 24 };

/** `font-size` of a `.markdown <selector>` rule in the web CSS, in em. */
function webEm(selector: string): number {
  const rule = webCss.match(new RegExp(`\\.markdown ${selector} \\{[^}]*font-size: ([\\d.]+)em`));
  if (!rule?.[1]) throw new Error(`no font-size for ${selector}`);
  return Number(rule[1]);
}

describe("Markdown", () => {
  it("uses the web markdown.css heading and inline-code scale", async () => {
    const { MARKDOWN_SCALE } = await import("../src/markdown/Markdown");
    expect(MARKDOWN_SCALE.h1).toBe(webEm("h1"));
    expect(MARKDOWN_SCALE.h2).toBe(webEm("h2"));
    expect(MARKDOWN_SCALE.h3).toBe(webEm("h3"));
    expect(webCss).toMatch(/\.markdown :is\(h4, h5, h6\) \{\s*font-size: 1em/);
    expect(webCss).toMatch(/\.markdown-inline-code \{[^}]*font-size: 0\.86em/);
    expect(MARKDOWN_SCALE.inlineCode).toBe(0.86);
    expect(webCss).toMatch(/line-height: 1\.3;/);
  });

  it("styles headings in the semibold face at the scale, and h6 muted", async () => {
    const { markdownStyles } = await import("../src/markdown/Markdown");
    const styles = markdownStyles("light", body, "#111111");
    expect(styles.h1).toMatchObject({ fontFamily: "InstrumentSans_600SemiBold", fontWeight: "600", fontSize: 23, color: "#111111" });
    expect(styles.h2?.fontSize).toBe(21);
    expect(styles.h3?.fontSize).toBe(18);
    expect(styles.h4?.fontSize).toBe(16);
    expect(styles.h6?.color).toBe(tokens.color.muted.light);
    expect(styles.text).toMatchObject({ fontFamily: "InstrumentSans_400Regular", fontSize: 16, lineHeight: 24, color: "#111111" });
    // Inline styles restate the body size: the library starts them at its own 16 / 24.
    expect(markdownStyles("light", { fontSize: 14, lineHeight: 22.75 }, "#111111").strong).toMatchObject({ fontSize: 14, lineHeight: 22.75 });
    // No rule under h1 and h2, and 16 between blocks (half above, half below).
    expect(styles.h2).toMatchObject({ borderBottomWidth: 0, paddingBottom: 0, marginVertical: 8 });
  });

  it("reads the faces from fontFamily at call time, so configureTheme({ font }) reaches them", async () => {
    const { markdownStyles } = await import("../src/markdown/Markdown");
    const { configureTheme } = await import("../src/configureTheme");
    const { fontFamily } = await import("../src/typography");
    const original = { ...fontFamily };
    configureTheme({ font: { regular: "Inter_400Regular", semibold: "Inter_600SemiBold" } });
    try {
      const styles = markdownStyles("light", body, "#111111");
      expect(styles.text?.fontFamily).toBe("Inter_400Regular");
      expect(styles.li?.fontFamily).toBe("Inter_400Regular");
      expect(styles.h1?.fontFamily).toBe("Inter_600SemiBold");
      expect(styles.strong?.fontFamily).toBe("Inter_600SemiBold");
    } finally {
      configureTheme({ font: original });
    }
  });

  it("underlines links in the primary colour at 30%, as the web .markdown-link", async () => {
    const { markdownStyles } = await import("../src/markdown/Markdown");
    expect(webCss).toMatch(/text-decoration-color: rgb\(var\(--primary\) \/ 0\.3\)/);
    for (const scheme of ["light", "dark"] as const) {
      expect(markdownStyles(scheme, body, "#000").link).toEqual({
        // The body size, so a link does not grow the line, and never the library's italic.
        fontSize: 16,
        lineHeight: 24,
        fontStyle: "normal",
        color: palette.primary[scheme],
        textDecorationLine: "underline",
        textDecorationColor: withAlpha(palette.primary[scheme], 0.3),
      });
    }
  });

  it("draws inline code on a 6% foreground wash at radius 6, never italic", async () => {
    const { inlineCodeStyle } = await import("../src/markdown/Markdown");
    expect(webCss).toMatch(/background: rgb\(var\(--foreground\) \/ 0\.06\)/);
    expect(inlineCodeStyle("dark", 16)).toMatchObject({
      fontStyle: "normal",
      fontSize: 14,
      backgroundColor: withAlpha(tokens.color.foreground.dark, 0.06),
      borderRadius: 6,
    });
  });

  it("renders fenced code as CodeBlock and inline code as a chip, through useMarkdown", () => {
    expect(source).toMatch(/class NativeUiMarkdownRenderer extends Renderer/);
    expect(source).toMatch(/override code\([^)]*\)[^{]*\{\s*return <CodeBlock /);
    expect(source).toMatch(/override codespan\(/);
    expect(source).toMatch(/\\u00A0\$\{text\}\\u00A0/);
    expect(source).toMatch(/useMarkdown\(children,/);
    // Text follows the enclosing MessageContent colour, as ResponseText does.
    expect(source).toMatch(/useContext\(ChatTextColorContext\)/);
  });

  it("draws lists as the web .markdown lists: 20 indent, 4 between items, muted markers", async () => {
    const { MARKDOWN_LIST } = await import("../src/markdown/Markdown");
    expect(webCss).toMatch(/\.markdown :is\(ul, ol\) \{\s*padding-left: 1\.25rem/);
    expect(webCss).toMatch(/\.markdown li \+ li \{\s*margin-top: 0\.25rem/);
    expect(webCss).toMatch(/li::marker \{\s*color: rgb\(var\(--muted-foreground\)\)/);
    expect(MARKDOWN_LIST).toEqual({ indent: 20, itemGap: 4, disc: 5 });
    expect(source).toMatch(/override list\(/);
    expect(source).toMatch(/const muted = tokens\.color\.muted\[this\.scheme\]/);
  });
});

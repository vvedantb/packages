import { readFileSync } from "node:fs";
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
const body = { fontSize: 16, lineHeight: 24 };

describe("Markdown", () => {
  it("uses the web markdown.css heading and inline-code scale", async () => {
    const { MARKDOWN_SCALE } = await import("../src/markdown/Markdown");
    expect(MARKDOWN_SCALE.inlineCode).toBe(0.86);
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

  it("demotes every heading to a muted uppercase label with headings: label", async () => {
    const { markdownStyles } = await import("../src/markdown/Markdown");
    const styles = markdownStyles("dark", body, "#111111", "label");
    for (const level of ["h1", "h2", "h3", "h4", "h5", "h6"] as const) {
      expect(styles[level]).toMatchObject({
        fontFamily: "InstrumentSans_500Medium",
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: expect.closeTo(0.3),
        textTransform: "uppercase",
        color: tokens.color.muted.dark,
        marginTop: 8,
        marginBottom: 0,
      });
    }
    // The default keeps the web scale.
    expect(markdownStyles("dark", body, "#111111").h3?.fontSize).toBe(18);
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
    expect(inlineCodeStyle("dark", 16)).toMatchObject({
      fontStyle: "normal",
      fontSize: 14,
      backgroundColor: withAlpha(tokens.color.foreground.dark, 0.06),
      borderRadius: 6,
    });
  });

  it("draws lists as the web .markdown lists: 20 indent, 4 between items, muted markers", async () => {
    const { MARKDOWN_LIST } = await import("../src/markdown/Markdown");
    expect(MARKDOWN_LIST).toEqual({ indent: 20, itemGap: 4, disc: 5 });
  });
});

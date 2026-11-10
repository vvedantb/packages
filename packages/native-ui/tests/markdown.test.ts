import { describe, expect, it, vi } from "vitest";
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
const body = { fontSize: 16, lineHeight: 24 };

describe("Markdown", () => {
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
});

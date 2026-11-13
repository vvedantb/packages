import { describe, expect, it, vi } from "vitest";
import { sizeStyle } from "../src/controlStyles";
import { palette } from "../src/palette";
import { tokens } from "../src/tokens";

// Chat defaults against the web chat in `@vvedantb/ui`. The web values are
// written here as numbers (Tailwind `text-sm` 14 / 20, `leading-relaxed`
// 1.625, the `markdown.css` scale, Streamdown `space-y-4`). The tests call the
// native exports and read what they return. No source or CSS file is read.

const role = vi.hoisted(() => ({ from: "user" as "user" | "assistant" }));
vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (o: { default: string; ios?: string }) => o.ios ?? o.default },
  Text: "Text",
  View: "View",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { flatten: (s: unknown) => s, create: (s: unknown) => s },
}));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("react-native-marked", () => ({ Renderer: class {}, useMarkdown: () => [] }));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  useAnimatedStyle: () => ({}),
  useSharedValue: (v: unknown) => ({ value: v }),
  withTiming: (v: unknown) => v,
  ReduceMotion: { System: "system", Never: "never", Always: "always" },
  Easing: { bezier: () => (t: number) => t, out: (f: unknown) => f, inOut: (f: unknown) => f, cubic: (t: number) => t, linear: (t: number) => t },
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock("@tabler/icons-react-native", () => {
  const icon = () => null;
  return Object.fromEntries(
    ["IconArrowBackUp", "IconCopy", "IconRefresh", "IconThumbDown", "IconThumbUp", "IconCheck", "IconTextWrap"].map((n) => [n, icon]),
  );
});
vi.mock("../src/ai/icon-button", () => ({ ChatIconButton: "ChatIconButton" }));
vi.mock("../src/Sheet", () => ({ Sheet: "Sheet", SheetBody: "SheetBody", SheetContent: "SheetContent", SheetHeader: "SheetHeader", SheetTitle: "SheetTitle" }));
vi.mock("../src/SheetRow", () => ({ SheetRow: "SheetRow" }));
vi.mock("../src/Button", () => ({ Button: "Button" }));
vi.mock("../src/Spinner", () => ({ Spinner: "Spinner" }));
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => false }));
vi.mock("../src/primitives/native-only-animated-view", () => ({ NativeOnlyAnimatedView: "NativeOnlyAnimatedView" }));
vi.mock("../src/ai/response-text", () => ({ ChatTextColorContext: { Provider: "Provider" }, ResponseText: "ResponseText" }));
vi.mock("../src/theme", () => ({ useLargerText: () => false }));
vi.mock("../src/cn", () => ({ cn: (...c: unknown[]) => c.filter(Boolean).join(" ") }));
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), useContext: () => role.from }));

type Element = { type: unknown; props: { className?: string; style?: unknown; children?: unknown } };

describe("chat text", () => {
  it("draws message text at the web MessageContent text-sm (14 / 20)", async () => {
    const { chatTextSize } = await import("../src/ai/chat-text");
    expect(chatTextSize("body", false)).toBe("text-sm");
    expect(sizeStyle(chatTextSize("body", false))).toEqual({ fontSize: 14, lineHeight: 20 });
  });

  it("pads a user bubble px-4 py-3 and an assistant message not at all", async () => {
    const { MessageContent } = await import("../src/ai/message");
    for (const bubble of ["primary", "tint"] as const) {
      role.from = "user";
      const tree = MessageContent({ children: "Hi", bubble }) as unknown as Element;
      const view = tree.props.children as Element;
      expect(view.props.className).toContain("px-4 py-3");
    }
    role.from = "assistant";
    const tree = MessageContent({ children: "Hi" }) as unknown as Element;
    expect((tree.props.children as Element).props.className).not.toContain("px-4");
  });

  it("fills the user bubble with the primary colour", async () => {
    const { userBubbleStyle } = await import("../src/ai/message");
    expect(userBubbleStyle("light")).toEqual({
      backgroundColor: palette.primary.light,
      borderRadius: tokens.radius.lg,
      borderBottomRightRadius: tokens.radius.md,
    });
  });

  it("has the relaxed (1.625) leading of the web .markdown, and relaxedSizeStyle uses it", async () => {
    const { relaxedSizeStyle } = await import("../src/settings/relaxedSizeStyle");
    expect(sizeStyle("text-sm", "relaxed")).toEqual({ fontSize: 14, lineHeight: 22.75 });
    expect(sizeStyle("text-xs", "relaxed")).toEqual({ fontSize: 12, lineHeight: 19.5 });
    expect(relaxedSizeStyle("text-sm")).toEqual({ fontSize: 14, lineHeight: 22.75 });
    expect(relaxedSizeStyle("text-xs")).toEqual(sizeStyle("text-xs", "relaxed"));
  });

  it("offers the web text-2xs token for the message clock", async () => {
    const { META_TEXT_STYLE } = await import("../src/ai/chat-text");
    // 0.6875rem, line height 1rem, tracking 0.01em (0.11 points).
    expect(META_TEXT_STYLE).toEqual({ fontSize: 11, lineHeight: 16, letterSpacing: 0.11 });
  });
});

describe("markdown", () => {
  it("puts 16 between blocks (8 either side), as the Streamdown space-y-4", async () => {
    const { MARKDOWN_SCALE, markdownStyles } = await import("../src/markdown/Markdown");
    expect(MARKDOWN_SCALE.blockGap).toBe(16);
    const styles = markdownStyles("light", { fontSize: 14, lineHeight: 22.75 }, "#111111");
    for (const key of ["paragraph", "h1", "h2", "h3", "h4", "blockquote", "hr"] as const) {
      expect(styles[key]).toMatchObject({ marginVertical: 8 });
    }
  });

  it("draws the heading scale at semibold with no rule underneath", async () => {
    const { MARKDOWN_SCALE, markdownStyles } = await import("../src/markdown/Markdown");
    expect([MARKDOWN_SCALE.h1, MARKDOWN_SCALE.h2, MARKDOWN_SCALE.h3, MARKDOWN_SCALE.h4]).toEqual([1.43, 1.29, 1.14, 1]);
    expect(MARKDOWN_SCALE.headingLineHeight).toBe(1.3);
    const styles = markdownStyles("light", { fontSize: 14, lineHeight: 22.75 }, "#111111");
    for (const key of ["h1", "h2", "h3", "h4", "h5", "h6"] as const) {
      expect(styles[key]).toMatchObject({ fontWeight: "600", borderBottomWidth: 0, paddingBottom: 0 });
    }
  });

  it("draws quotes with the border colour rule, inline code in the text colour and body size lines", async () => {
    const { markdownStyles, inlineCodeStyle } = await import("../src/markdown/Markdown");
    const styles = markdownStyles("light", { fontSize: 14, lineHeight: 22.75 }, "#111111");
    expect(styles.text).toMatchObject({ fontSize: 14, lineHeight: 22.75 });
    expect(styles.blockquote).toMatchObject({ borderLeftColor: tokens.color.border.light });
    expect(styles.codespan).toMatchObject({ fontSize: 12, color: "#111111", borderRadius: 6 });
    // Without a colour the chip leaves colour to the platform.
    expect(inlineCodeStyle("light", 14)).not.toHaveProperty("color");
  });

  it("sizes tables as markdown.css and the Streamdown table", async () => {
    const { MARKDOWN_TABLE } = await import("../src/markdown/MarkdownTable");
    expect(MARKDOWN_TABLE).toEqual({
      fontScale: 0.93,
      lineHeight: 1.5,
      cellPaddingX: 12,
      cellPaddingY: 7,
      panelPadding: { top: 4, x: 5, bottom: 6 },
      tableMargin: 10,
      actionsHeight: 27,
      actionsGap: 16,
    });
  });

  it("measures fenced code as the web MarkdownCodeBlock", async () => {
    const { CODE_BLOCK_METRICS } = await import("../src/ai/code-block");
    expect(CODE_BLOCK_METRICS.header).toEqual({ minHeight: 32, paddingTop: 4, paddingLeft: 14, paddingRight: 5 });
    expect(CODE_BLOCK_METRICS.code).toEqual({ paddingTop: 4, paddingHorizontal: 14, paddingBottom: 13 });
    expect(CODE_BLOCK_METRICS.text.fontSize).toBe(13);
    expect(CODE_BLOCK_METRICS.text.lineHeight).toBeCloseTo(20.15, 2);
  });
});

describe("question card", () => {
  it("steps caption text up with larger text", async () => {
    const { chatTextSize } = await import("../src/ai/chat-text");
    expect(sizeStyle(chatTextSize("caption", false), "relaxed")).toEqual({ fontSize: 12, lineHeight: 19.5 });
    expect(chatTextSize("caption", true)).toBe("text-base");
  });
});

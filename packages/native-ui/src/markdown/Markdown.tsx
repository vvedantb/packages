import { useContext, type ReactNode } from "react";
import { Text, View, type TextStyle, type ViewStyle } from "react-native";
import { Renderer, useMarkdown, type MarkedStyles } from "react-native-marked";
import { CodeBlock } from "../ai/code-block";
import { MONO_FONT, chatTextSize } from "../ai/chat-text";
import { ChatTextColorContext } from "../ai/response-text";
import { sizeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { fontFamily } from "../typography";
import { useScheme } from "../useScheme";

/**
 * Sizes from the web `markdown.css` (`@vvedantb/ui/tokens/css/markdown.css`),
 * in em of the body size: h1 1.43, h2 1.29, h3 1.14, h4-h6 1; inline code
 * 0.86. Headings line-height 1.3; blocks 0.65rem apart.
 */
export const MARKDOWN_SCALE = {
  h1: 1.43,
  h2: 1.29,
  h3: 1.14,
  h4: 1,
  inlineCode: 0.86,
  headingLineHeight: 1.3,
  blockGap: 10,
} as const;

export type MarkdownProps = {
  /** The markdown source. */
  children: string;
  /** With it, fenced code blocks get a copy button (native-ui adds no clipboard package). */
  onCopyCode?: (code: string) => void | Promise<void>;
};

/**
 * Markdown at chat size, styled as the web `.markdown` (Streamdown) block:
 * compact headings, primary links underlined at 30%, inline code on a 6%
 * foreground wash at radius 6, and fenced code as `CodeBlock` (the flat
 * `surface-secondary` panel with a language and copy header). Text takes the
 * enclosing `MessageContent` colour, like `ResponseText`.
 *
 * Needs the optional peer `react-native-marked` (it renders through
 * `useMarkdown`, so it nests in a `ScrollView` without a `FlatList`).
 */
export function Markdown({ children, onCopyCode }: MarkdownProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const inherited = useContext(ChatTextColorContext);
  const body = sizeStyle(chatTextSize("body", largerText));
  const color = inherited ?? tokens.color.foreground[scheme];
  const renderer = new NativeUiMarkdownRenderer(scheme, body.fontSize, onCopyCode);
  const elements = useMarkdown(children, {
    colorScheme: scheme,
    renderer,
    theme: {
      colors: {
        text: color,
        link: palette.primary[scheme],
        code: tokens.color.surfaceSecondary[scheme],
        border: tokens.color.border[scheme],
      },
    },
    styles: markdownStyles(scheme, body, color),
  });
  return <>{elements}</>;
}

/** The style map `useMarkdown` takes, from the web scale. Exported for tests. */
export function markdownStyles(
  scheme: "light" | "dark",
  body: { fontSize: number; lineHeight: number },
  color: string,
): MarkedStyles {
  const heading = (scale: number): TextStyle => ({
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
    fontSize: Math.round(body.fontSize * scale),
    lineHeight: Math.round(body.fontSize * scale * MARKDOWN_SCALE.headingLineHeight),
    letterSpacing: -0.01 * body.fontSize * scale,
    color,
    marginTop: 20,
    marginBottom: 8,
  });
  const gap = { marginVertical: MARKDOWN_SCALE.blockGap / 2 };
  return {
    text: { fontFamily: fontFamily.regular, fontSize: body.fontSize, lineHeight: body.lineHeight, color },
    paragraph: { ...gap, paddingVertical: 0 },
    strong: { fontFamily: fontFamily.semibold, fontWeight: "600" },
    em: { fontStyle: "italic" },
    link: {
      color: palette.primary[scheme],
      textDecorationLine: "underline",
      textDecorationColor: withAlpha(palette.primary[scheme], 0.3),
    },
    h1: heading(MARKDOWN_SCALE.h1),
    h2: heading(MARKDOWN_SCALE.h2),
    h3: heading(MARKDOWN_SCALE.h3),
    h4: heading(MARKDOWN_SCALE.h4),
    h5: heading(MARKDOWN_SCALE.h4),
    h6: { ...heading(MARKDOWN_SCALE.h4), color: tokens.color.muted[scheme] },
    li: { fontFamily: fontFamily.regular, fontSize: body.fontSize, lineHeight: body.lineHeight, color },
    blockquote: {
      ...gap,
      paddingLeft: 13,
      borderLeftWidth: 2,
      borderLeftColor: tokens.color.border[scheme],
      backgroundColor: "transparent",
    },
    hr: { marginVertical: 20, height: 1, backgroundColor: tokens.color.border[scheme] },
    codespan: inlineCodeStyle(scheme, body.fontSize),
  };
}

/** Web `.markdown-inline-code`: 0.86em mono on a 6% foreground wash, radius 6. */
export function inlineCodeStyle(scheme: "light" | "dark", fontSize: number): TextStyle {
  return {
    fontFamily: MONO_FONT,
    fontStyle: "normal",
    fontSize: Math.round(fontSize * MARKDOWN_SCALE.inlineCode),
    backgroundColor: withAlpha(tokens.color.foreground[scheme], 0.06),
    borderRadius: 6,
  };
}

/** Web `.markdown` lists: 1.25rem (20) indent, 0.25rem (4) between items, muted markers (a 5-wide disc). */
export const MARKDOWN_LIST = { indent: 20, itemGap: 4, disc: 5 } as const;

/**
 * `react-native-marked`'s renderer with native-ui code and lists: `CodeBlock`
 * panels, inline-code chips, and lists drawn as the web `.markdown` lists
 * (the library's own markers apply its marker style to every item).
 */
class NativeUiMarkdownRenderer extends Renderer {
  constructor(
    private readonly scheme: "light" | "dark",
    private readonly fontSize: number,
    private readonly onCopyCode: MarkdownProps["onCopyCode"],
  ) {
    super();
  }

  override code(text: string, language?: string): ReactNode {
    return <CodeBlock key={this.getKey()} code={text} language={language || undefined} onCopy={this.onCopyCode} />;
  }

  override codespan(text: string): ReactNode {
    // Text in Text takes no padding: no-break spaces pad the chip and keep it on one line.
    return (
      <Text key={this.getKey()} selectable style={inlineCodeStyle(this.scheme, this.fontSize)}>
        {`\u00A0${text}\u00A0`}
      </Text>
    );
  }

  override list(
    ordered: boolean,
    li: ReactNode[],
    _listStyle?: ViewStyle,
    textStyle?: TextStyle,
    startIndex = 1,
  ): ReactNode {
    const muted = tokens.color.muted[this.scheme];
    const lineHeight = typeof textStyle?.lineHeight === "number" ? textStyle.lineHeight : 24;
    // A drawn disc: the font's bullet glyph is far smaller than the web `disc` marker.
    const disc = MARKDOWN_LIST.disc;
    return (
      <View key={this.getKey()} style={{ marginVertical: MARKDOWN_SCALE.blockGap / 2, gap: MARKDOWN_LIST.itemGap }}>
        {li.map((item, index) => (
          <View key={index} style={{ flexDirection: "row" }}>
            {ordered ? (
              <Text style={[textStyle, { width: MARKDOWN_LIST.indent, color: muted, fontVariant: ["tabular-nums"] }]}>
                {`${startIndex + index}.`}
              </Text>
            ) : (
              <View style={{ width: MARKDOWN_LIST.indent, paddingTop: (lineHeight - disc) / 2 }}>
                <View style={{ width: disc, height: disc, borderRadius: disc / 2, backgroundColor: muted }} />
              </View>
            )}
            <View style={{ flex: 1 }}>{item}</View>
          </View>
        ))}
      </View>
    );
  }
}

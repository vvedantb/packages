import { Children, cloneElement, isValidElement, useContext, type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Renderer, useMarkdown, type MarkedStyles } from "react-native-marked";
import { CodeBlock } from "../ai/code-block";
import { MONO_FONT, chatTextSize } from "../ai/chat-text";
import { ChatTextColorContext } from "../ai/response-text";
import { sizeStyle, typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { fontFamily } from "../typography";
import { useScheme } from "../useScheme";

/**
 * Sizes from the web `markdown.css` (`@vvedantb/ui/tokens/css/markdown.css`),
 * in em of the body size: h1 1.43, h2 1.29, h3 1.14, h4-h6 1; inline code
 * 0.86. Headings line-height 1.3. Blocks, headings included, are 16 apart:
 * Streamdown's root `space-y-4` (a utility) wins over the `.markdown` block
 * margins (a component layer), so the web draws 1rem between every block.
 */
export const MARKDOWN_SCALE = {
  h1: 1.43,
  h2: 1.29,
  h3: 1.14,
  h4: 1,
  inlineCode: 0.86,
  headingLineHeight: 1.3,
  blockGap: 16,
} as const;

/**
 * Web `.markdown table` and its Streamdown wrapper: text at 0.93em with
 * line-height 1.5, cells `0.45rem 0.75rem`, header cells semibold, rows split
 * by the border at 70% (the header's in the full border), the table 0.65rem
 * inside the code-block panel (padding `0.25rem 0.3rem 0.4rem`).
 */
export const MARKDOWN_TABLE = {
  fontScale: 0.93,
  lineHeight: 1.5,
  cellPaddingX: 12,
  cellPaddingY: 7,
  panelPadding: { top: 4, x: 5, bottom: 6 },
  tableMargin: 10,
} as const;

export type MarkdownProps = {
  /** The markdown source. */
  children: string;
  /** With it, fenced code blocks get a copy button (native-ui adds no clipboard package). */
  onCopyCode?: (code: string) => void | Promise<void>;
  /**
   * Body line height. Default `relaxed`, the web `.markdown` 1.625 (14 / 22.75).
   * `normal` is the text size's own (14 / 20), as a web `Markdown` with
   * `text-sm` on it: Eva's user bubbles.
   */
  leading?: "relaxed" | "normal";
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
export function Markdown({ children, onCopyCode, leading = "relaxed" }: MarkdownProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const inherited = useContext(ChatTextColorContext);
  const body = sizeStyle(chatTextSize("body", largerText), leading === "relaxed" ? "relaxed" : undefined);
  const color = inherited ?? tokens.color.foreground[scheme];
  const renderer = new NativeUiMarkdownRenderer(scheme, body.fontSize, color, onCopyCode);
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
  // Every block has half the gap above and below (React Native margins do not
  // collapse), so 16 between blocks; this takes the outer halves off, as the
  // web `first-child:mt-0` and `last-child:mb-0`.
  return <View style={{ marginVertical: -MARKDOWN_SCALE.blockGap / 2 }}>{elements}</View>;
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
    marginVertical: MARKDOWN_SCALE.blockGap / 2,
    // `react-native-marked` rules h1 and h2 off; the web has no rule.
    paddingBottom: 0,
    borderBottomWidth: 0,
  });
  const gap = { marginVertical: MARKDOWN_SCALE.blockGap / 2 };
  // The library's inline styles start from its own 16 / 24 text, so each one
  // restates the body size, or a bold or linked word grows the line.
  const inline = { fontSize: body.fontSize, lineHeight: body.lineHeight };
  return {
    text: { fontFamily: fontFamily.regular, ...inline, color },
    paragraph: { ...gap, paddingVertical: 0 },
    strong: { ...inline, fontFamily: fontFamily.semibold, fontWeight: "600" },
    em: { ...inline, fontStyle: "italic" },
    strikethrough: { ...inline, textDecorationLine: "line-through" },
    link: {
      ...inline,
      fontStyle: "normal",
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
      opacity: 1,
    },
    hr: { ...gap, height: 1, borderBottomWidth: 0, backgroundColor: tokens.color.border[scheme] },
    codespan: inlineCodeStyle(scheme, body.fontSize, color),
  };
}

/**
 * Web `.markdown-inline-code`: 0.86em mono on a 6% foreground wash, radius 6,
 * in the text colour (`color`, else the platform default).
 */
export function inlineCodeStyle(scheme: "light" | "dark", fontSize: number, color?: string): TextStyle {
  return {
    fontFamily: MONO_FONT,
    fontStyle: "normal",
    fontSize: Math.round(fontSize * MARKDOWN_SCALE.inlineCode),
    backgroundColor: withAlpha(tokens.color.foreground[scheme], 0.06),
    borderRadius: 6,
    ...(color ? { color } : null),
  };
}

type StyledNodeProps = { children?: ReactNode; style?: StyleProp<TextStyle>; accessibilityRole?: string };

/**
 * An inline-code chip (see `codespan`). A component of its own so
 * `restyleText` can find it: NativeWind's JSX swaps a `Text` made in this
 * file for its own wrapper, so the type no longer equals `Text`.
 */
function InlineCode({ style, children }: { style?: StyleProp<TextStyle>; children: string }) {
  return (
    <Text selectable style={style}>
      {children}
    </Text>
  );
}

/**
 * `node` with `map` applied to the style of every `Text` in it. The parser
 * bakes the text style into each `Text`, and React Native text takes no
 * style from a parent view, so a block that restyles its text (a quote, a
 * table) rewrites it here. Links keep their own style.
 */
function restyleText(node: ReactNode, map: (style: TextStyle) => TextStyle): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<StyledNodeProps>(child)) return child;
    if (child.props.accessibilityRole === "link") return child;
    const children = child.props.children === undefined ? undefined : restyleText(child.props.children, map);
    if (child.type === Text || child.type === InlineCode) {
      return cloneElement(child, { style: map(StyleSheet.flatten(child.props.style) ?? {}) }, children);
    }
    return children === undefined ? child : cloneElement(child, {}, children);
  });
}

/** Web `.markdown` lists: 1.25rem (20) indent, 0.25rem (4) between items, muted markers (a 5-wide disc). */
export const MARKDOWN_LIST = { indent: 20, itemGap: 4, disc: 5 } as const;

/**
 * `react-native-marked`'s renderer with native-ui code and lists: `CodeBlock`
 * panels, inline-code chips, and lists drawn as the web `.markdown` lists
 * (the library's own markers apply its marker style to every item). Links,
 * quotes and tables are drawn here too.
 */
class NativeUiMarkdownRenderer extends Renderer {
  constructor(
    private readonly scheme: "light" | "dark",
    private readonly fontSize: number,
    private readonly color: string,
    private readonly onCopyCode: MarkdownProps["onCopyCode"],
  ) {
    super();
  }

  /**
   * Web `.markdown-link`, medium weight. The parser gives a link the
   * paragraph's regular face, so the face is set here, on the link and the
   * text in it.
   */
  override link(children: string | ReactNode[], href: string, styles?: TextStyle, title?: string): ReactNode {
    const medium = (style: TextStyle): TextStyle => ({ ...style, fontFamily: fontFamily.medium, ...typeStyle("medium") });
    const content = typeof children === "string" ? children : Children.toArray(restyleText(children, medium));
    return super.link(content, href, medium(styles ?? {}), title);
  }

  /** Web `.markdown blockquote`: the left rule, and the text in the muted colour. */
  override blockquote(children: ReactNode[], styles?: ViewStyle): ReactNode {
    const muted = tokens.color.muted[this.scheme];
    // The inner blocks' outer margins come off, as web margins collapse into the quote's.
    return (
      <View key={this.getKey()} style={styles}>
        <View style={{ marginVertical: -MARKDOWN_SCALE.blockGap / 2 }}>
          {restyleText(children, (style) => ({ ...style, color: muted }))}
        </View>
      </View>
    );
  }

  /**
   * The web table on its panel (`MARKDOWN_TABLE`): header cells semibold,
   * rows split by a 70% border. The columns share the width equally and the
   * cells wrap (the web sizes columns to their words), so they line up.
   */
  override table(header: ReactNode[][], rows: ReactNode[][][]): ReactNode {
    const { fontScale, lineHeight, cellPaddingX, cellPaddingY, panelPadding } = MARKDOWN_TABLE;
    const small = (style: TextStyle): TextStyle => {
      const size = typeof style.fontSize === "number" ? style.fontSize * fontScale : this.fontSize * fontScale;
      // Body text takes the table line height; inline code keeps its own.
      return style.fontFamily === MONO_FONT
        ? { ...style, fontSize: size }
        : { ...style, fontSize: size, lineHeight: size * lineHeight };
    };
    const semibold = (style: TextStyle): TextStyle => ({ ...small(style), fontFamily: fontFamily.semibold, ...typeStyle("semibold") });
    // The header row is ruled off in the border colour, body rows at 70%.
    const rule = (index: number) =>
      index === 1 ? tokens.color.border[this.scheme] : withAlpha(tokens.color.border[this.scheme], 0.7);
    const row = (cells: ReactNode[][], map: (style: TextStyle) => TextStyle, index: number) => (
      <View key={index} style={{ flexDirection: "row", borderTopWidth: index > 0 ? 1 : 0, borderTopColor: rule(index) }}>
        {cells.map((cell, cellIndex) => (
          <View key={cellIndex} style={{ flex: 1, paddingHorizontal: cellPaddingX, paddingVertical: cellPaddingY }}>
            <Text style={{ color: this.color }}>{restyleText(cell, map)}</Text>
          </View>
        ))}
      </View>
    );
    return (
      <View
        key={this.getKey()}
        style={{
          marginVertical: MARKDOWN_SCALE.blockGap / 2,
          borderRadius: tokens.radius.lg,
          backgroundColor: tokens.color.surfaceSecondary[this.scheme],
          paddingTop: panelPadding.top,
          paddingHorizontal: panelPadding.x,
          paddingBottom: panelPadding.bottom,
        }}
      >
        {/* The table's own `margin-block: 0.65rem` inside the panel. The web also has a row of table actions above it. */}
        <View style={{ marginVertical: MARKDOWN_TABLE.tableMargin }}>
          {row(header, semibold, 0)}
          {rows.map((cells, index) => row(cells, small, index + 1))}
        </View>
      </View>
    );
  }

  override code(text: string, language?: string): ReactNode {
    return <CodeBlock key={this.getKey()} variant="markdown" code={text} language={language || undefined} onCopy={this.onCopyCode} />;
  }

  override codespan(text: string): ReactNode {
    // Text in Text takes no padding: no-break spaces pad the chip and keep it on one line.
    return (
      <InlineCode key={this.getKey()} style={inlineCodeStyle(this.scheme, this.fontSize, this.color)}>
        {`\u00A0${text}\u00A0`}
      </InlineCode>
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

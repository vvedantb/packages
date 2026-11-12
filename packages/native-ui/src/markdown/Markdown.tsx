import { Children, cloneElement, Fragment, isValidElement, useContext, type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Renderer, useMarkdown, type MarkedStyles } from "react-native-marked";
import { CodeBlock } from "../ai/code-block";
import { MONO_FONT, chatTextSize } from "../ai/chat-text";
import { ChatTextColorContext } from "../ai/response-text";
import { sizeStyle, trackingStyle, typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { fontFamily } from "../typography";
import { useScheme } from "../useScheme";
import { MARKDOWN_TABLE, MarkdownTable } from "./MarkdownTable";

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

export type MarkdownProps = {
  /** The markdown source. */
  children: string;
  /** With it, fenced code blocks get a copy button (native-ui adds no clipboard package). */
  onCopyCode?: (code: string) => void | Promise<void>;
  /** With it, tables get the web Copy table button: the table as Markdown, CSV or TSV. */
  onCopyTable?: (text: string) => void | Promise<void>;
  /**
   * Body line height. Default `relaxed`, the web `.markdown` 1.625 (14 / 22.75).
   * `normal` is the text size's own (14 / 20), as a web `Markdown` with
   * `text-sm` on it: Eva's user bubbles.
   */
  leading?: "relaxed" | "normal";
  /**
   * Draws a link your way (an app's mention chip): called with the link's
   * href and plain text; return undefined to keep the default link.
   */
  renderLink?: (href: string, text: string) => ReactNode | undefined;
  /**
   * Heading look. Default `default`, the web `.markdown` scale. `label`
   * demotes every heading to a quiet section label (`text-xs` medium,
   * uppercase, `tracking-wide`, muted, 16 above and 8 below), as a digest
   * of short themed lists (Eva's standup cards) styles its `###` headings.
   */
  headings?: MarkdownHeadings;
};

export type MarkdownHeadings = "default" | "label";

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
export function Markdown({ children, onCopyCode, onCopyTable, leading = "relaxed", renderLink, headings = "default" }: MarkdownProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const inherited = useContext(ChatTextColorContext);
  const body = sizeStyle(chatTextSize("body", largerText), leading === "relaxed" ? "relaxed" : undefined);
  const color = inherited ?? tokens.color.foreground[scheme];
  const renderer = new NativeUiMarkdownRenderer(scheme, body.fontSize, color, onCopyCode, onCopyTable, renderLink);
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
    styles: markdownStyles(scheme, body, color, headings),
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
  headings: MarkdownHeadings = "default",
): MarkedStyles {
  const label: TextStyle = {
    fontFamily: fontFamily.medium,
    ...typeStyle("medium"),
    ...sizeStyle("text-xs"),
    ...trackingStyle(12, "wide"),
    textTransform: "uppercase",
    color: tokens.color.muted[scheme],
    // With the half gap each block keeps (margins do not collapse): 16 above,
    // the next block's 8 below (the web `mt-4 mb-1.5`, collapsed).
    marginTop: MARKDOWN_SCALE.blockGap / 2,
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  };
  const scaled = (scale: number): TextStyle => ({
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
  const heading = (scale: number): TextStyle => (headings === "label" ? label : scaled(scale));
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

/**
 * A paragraph block. A component of its own so `listItem` can find it in a
 * loose list (the parser's own paragraph is a plain `View`).
 */
function Paragraph({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return <View style={style}>{children}</View>;
}

type StyledNodeProps ={ children?: ReactNode; style?: StyleProp<TextStyle>; accessibilityRole?: string };

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

/** A link's text with its styling stripped: the strings in it, in order. */
function plainText(node: ReactNode): string {
  let out = "";
  Children.forEach(node, (child) => {
    if (typeof child === "string" || typeof child === "number") out += String(child);
    else if (isValidElement<StyledNodeProps>(child)) out += plainText(child.props.children);
  });
  return out;
}

/**
 * A cell's plain text, as the web reads a cell's `textContent` for Copy
 * table: inline code without the no-break spaces that pad its chip.
 */
function cellText(cell: ReactNode): string {
  return nodeText(cell).trim();
}

function nodeText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (!isValidElement<StyledNodeProps>(child)) return "";
      const text = nodeText(child.props.children);
      return child.type === InlineCode ? text.replace(/^\u00A0|\u00A0$/g, "") : text;
    })
    .join("");
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
    private readonly onCopyTable: MarkdownProps["onCopyTable"],
    private readonly renderLink: MarkdownProps["renderLink"],
  ) {
    super();
  }

  /**
   * Web `.markdown-link`, medium weight. The parser gives a link the
   * paragraph's regular face, so the face is set here, on the link and the
   * text in it.
   */
  override link(children: string | ReactNode[], href: string, styles?: TextStyle, title?: string): ReactNode {
    const custom = this.renderLink?.(href, plainText(children));
    if (custom !== undefined) return <Fragment key={this.getKey()}>{custom}</Fragment>;
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
   * The web table on its panel (`MarkdownTable`): header cells semibold,
   * rows split by a 70% border, and the table actions above it.
   */
  override table(header: ReactNode[][], rows: ReactNode[][][]): ReactNode {
    const { fontScale, lineHeight } = MARKDOWN_TABLE;
    const small = (style: TextStyle): TextStyle => {
      const size = typeof style.fontSize === "number" ? style.fontSize * fontScale : this.fontSize * fontScale;
      // Body text takes the table line height; inline code keeps its own.
      return style.fontFamily === MONO_FONT
        ? { ...style, fontSize: size }
        : { ...style, fontSize: size, lineHeight: size * lineHeight };
    };
    const semibold = (style: TextStyle): TextStyle => ({ ...small(style), fontFamily: fontFamily.semibold, ...typeStyle("semibold") });
    return (
      <View key={this.getKey()} style={{ marginVertical: MARKDOWN_SCALE.blockGap / 2 }}>
        <MarkdownTable
          header={header.map((cell) => restyleText(cell, semibold))}
          rows={rows.map((cells) => cells.map((cell) => restyleText(cell, small)))}
          data={{ headers: header.map(cellText), rows: rows.map((cells) => cells.map(cellText)) }}
          color={this.color}
          onCopy={this.onCopyTable}
        />
      </View>
    );
  }

  override paragraph(children: ReactNode[], styles?: ViewStyle): ReactNode {
    return (
      <Paragraph key={this.getKey()} style={styles}>
        {children}
      </Paragraph>
    );
  }

  /**
   * A loose list (items a blank line apart, as Eva's doc editor writes them)
   * puts each item's text in a paragraph. Its outer margins come off, as in
   * a quote, so the text sits on the marker's line, as the tight list.
   */
  override listItem(children: ReactNode[], styles?: ViewStyle): ReactNode {
    const loose = children.some((child) => isValidElement(child) && child.type === Paragraph);
    if (!loose) return super.listItem(children, styles);
    return (
      <View key={this.getKey()} style={styles}>
        <View style={{ marginVertical: -MARKDOWN_SCALE.blockGap / 2 }}>{children}</View>
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

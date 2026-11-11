import { Fragment, useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { IconCheck, IconCopy, IconTextWrap } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { sizeStyle, textStyle } from "../controlStyles";
import {
  GITHUB_CODE_COLORS,
  SCRIPT_LANGUAGES,
  SHELL_LANGUAGES,
  codeTokenColor,
  loadPrismReactRenderer,
  scriptTokens,
  shellTokens,
  type CodeToken,
} from "../highlight";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { MONO_FONT, chatTextSize } from "./chat-text";
import { ChatIconButton, type ChatIconButtonProps, type ChatIconButtonSize } from "./icon-button";

/**
 * `variant="markdown"`, the web `.markdown-code` (`MarkdownCodeBlock`): the header is `0.25rem 0.3rem 0 0.9rem` around a 28
 * line (32 high), the code `0.25rem 0.9rem 0.8rem` at 13 with line-height
 * 1.55, and the header actions are `icon-xs` (28) buttons.
 */
export const CODE_BLOCK_METRICS = {
  header: { minHeight: 32, paddingTop: 4, paddingLeft: 14, paddingRight: 5 },
  code: { paddingTop: 4, paddingHorizontal: 14, paddingBottom: 13 },
  text: { fontSize: 13, lineHeight: 13 * 1.55 },
} as const;

export type CodeBlockCopyButtonProps = {
  code: string;
  /**
   * Puts `code` on the clipboard. React Native's own `Clipboard` is
   * deprecated, and native-ui adds no clipboard package, so the app passes its
   * own (for example `expo-clipboard`'s `setStringAsync`). A rejected promise
   * leaves the copy icon.
   */
  onCopy: (code: string) => void | Promise<void>;
  /** Milliseconds the check shows after a copy. Default 2000, as on the web. */
  timeout?: number;
  /** Default "Copy code"; "Copied" while the check shows. */
  label?: string;
  /** Default `sm` (the web `CodeBlock` copy button); the markdown code block uses `xs`. */
  size?: ChatIconButtonSize;
  /** Default `"square"`. See `ChatIconButton`. */
  slop?: ChatIconButtonProps["slop"];
};

/** Ghost copy button: the copy icon, then a check for `timeout` after a copy. */
export function CodeBlockCopyButton({ code, onCopy, timeout = 2000, label = "Copy code", size, slop }: CodeBlockCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    // As the web: presses while the check shows do nothing.
    if (copied) return;
    try {
      await onCopy(code);
    } catch {
      return;
    }
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), timeout);
  };

  return (
    <ChatIconButton
      icon={copied ? IconCheck : IconCopy}
      label={copied ? "Copied" : label}
      size={size}
      slop={slop}
      onPress={() => void copy()}
    />
  );
}

export type CodeBlockProps = {
  code: string;
  /**
   * Shown in the header, and the Prism language for highlighting (`tsx`,
   * `python`, `json`…). An unknown language draws plain text.
   */
  language?: string;
  /**
   * Colour the code in the GitHub light and dark colours, as the web shiki
   * block. Default `true`. Needs the optional peer `prism-react-renderer` and a
   * `language`; without either the code is plain.
   */
  highlight?: boolean;
  /** With it, the header has a copy button. See `CodeBlockCopyButton`. */
  onCopy?: (code: string) => void | Promise<void>;
  /** Default `default`, the web `CodeBlock`. `markdown` is the web `MarkdownCodeBlock` (see `CodeBlock`). */
  variant?: "default" | "markdown";
  className?: string;
};

/**
 * Code on the flat panel at radius 16, selectable, long lines scrolling
 * sideways. With `prism-react-renderer` installed and a `language`, tokens
 * take the GitHub colours of the scheme.
 *
 * `default` is the web `CodeBlock` (`ai-elements/code-block.tsx`): `text-sm`
 * code in `p-4`, and a `px-3` header with the language and a copy button when
 * either is given. `markdown` is the web `MarkdownCodeBlock`, which `Markdown`
 * draws for fenced code: 13 / 20.15 code, a 32 header with `icon-xs` actions,
 * a wrap toggle ("Wrap long lines", foreground while on) and then copy.
 */
export function CodeBlock({ code, language, highlight = true, onCopy, variant = "default", className }: CodeBlockProps) {
  const parts = useCodeParts(code, language, highlight, variant === "markdown");
  if (variant === "markdown") {
    return <MarkdownCodeBlock code={code} language={language} onCopy={onCopy} className={className} parts={parts} />;
  }
  const header = Boolean(language || onCopy);
  return (
    <View className={cn("w-full overflow-hidden", className)} style={parts.panel}>
      {header ? (
        <View className="min-h-11 flex-row items-center justify-between pl-3 pr-1.5">
          {parts.label}
          {onCopy ? <CodeBlockCopyButton code={code} onCopy={onCopy} /> : null}
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName={header ? "px-4 pb-4" : "p-4"}>
        {parts.text}
      </ScrollView>
    </View>
  );
}

/** The web `MarkdownCodeBlock`: `CodeBlock` with `variant="markdown"`. A component of its own for the wrap state. */
function MarkdownCodeBlock({
  code,
  language,
  onCopy,
  className,
  parts,
}: Pick<CodeBlockProps, "code" | "language" | "onCopy" | "className"> & { parts: ReturnType<typeof useCodeParts> }) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const [wrap, setWrap] = useState(false);
  const header = Boolean(language || onCopy);
  const { header: headerBox, code: codeBox } = CODE_BLOCK_METRICS;
  const padding = header ? codeBox : { ...codeBox, paddingTop: codeBox.paddingBottom };
  return (
    <View className={cn("w-full overflow-hidden", className)} style={parts.panel}>
      {header ? (
        <View
          className={cn("flex-row items-center justify-between gap-2", largerText && "min-h-11")}
          style={largerText ? { paddingLeft: headerBox.paddingLeft, paddingRight: headerBox.paddingRight } : headerBox}
        >
          {parts.label}
          {/* Web `.markdown-code-actions`: `gap-0.5`. The two sit 2 apart, so
              each slops only above and below and on its outer side. */}
          <View className="flex-row items-center gap-0.5">
            <ChatIconButton
              icon={IconTextWrap}
              label={wrap ? "Scroll long lines" : "Wrap long lines"}
              size="xs"
              iconColor={wrap ? tokens.color.foreground[scheme] : tokens.color.muted[scheme]}
              accessibilityState={{ selected: wrap }}
              slop={{ left: 8, right: 0 }}
              onPress={() => setWrap(!wrap)}
            />
            {onCopy ? <CodeBlockCopyButton code={code} onCopy={onCopy} size="xs" slop={{ left: 0, right: 5 }} /> : null}
          </View>
        </View>
      ) : null}
      {wrap ? (
        <View style={padding}>{parts.text}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={padding}>
          {parts.text}
        </ScrollView>
      )}
    </View>
  );
}

/** The panel style, the language label and the code text both code blocks draw. */
function useCodeParts(code: string, language: string | undefined, highlight: boolean, markdown: boolean) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("small", largerText);
  const caption = chatTextSize("caption", largerText);
  const text = (
    <Text
      selectable
      className={size}
      style={[
        markdown && !largerText ? CODE_BLOCK_METRICS.text : sizeStyle(size),
        textStyle("foreground", scheme),
        { fontFamily: MONO_FONT },
      ]}
    >
      {highlight && language ? <HighlightedCode code={code} language={language} scheme={scheme} /> : code}
    </Text>
  );
  return {
    text,
    label: (
      <Text className={caption} style={[sizeStyle(caption), textStyle("muted", scheme), { fontFamily: MONO_FONT }]}>
        {language ?? ""}
      </Text>
    ),
    panel: { borderRadius: tokens.radius.lg, backgroundColor: tokens.color.surfaceSecondary[scheme] },
  };
}

/**
 * Coloured runs as nested `Text` spans, lines joined by newlines. They
 * inherit the size and font of the code `Text` around them.
 */
function CodeRuns({ lines, scheme }: { lines: CodeToken[][]; scheme: "light" | "dark" }) {
  return (
    <>
      {lines.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 ? "\n" : null}
          {line.map((token, tokenIndex) => (
            <Text key={tokenIndex} style={{ color: GITHUB_CODE_COLORS[scheme][token.role] }}>
              {token.content}
            </Text>
          ))}
        </Fragment>
      ))}
    </>
  );
}

/**
 * The code in the web's Shiki colours: shell blocks through `shellTokens`
 * (no peer needed), other languages through Prism, the JavaScript family
 * recoloured where Prism and Shiki disagree (`scriptTokens`). Without
 * `prism-react-renderer` a non-shell block is the plain code.
 */
function HighlightedCode({ code, language, scheme }: { code: string; language: string; scheme: "light" | "dark" }) {
  const lang = language.toLowerCase();
  const source = code.replace(/\n$/, "");
  if (SHELL_LANGUAGES.has(lang)) return <CodeRuns lines={shellTokens(source)} scheme={scheme} />;
  const Highlight = loadPrismReactRenderer()?.Highlight;
  if (!Highlight) return code;
  return (
    <Highlight code={source} language={lang} theme={{ plain: { color: GITHUB_CODE_COLORS[scheme].plain }, styles: [] }}>
      {({ tokens }) =>
        SCRIPT_LANGUAGES.has(lang) ? (
          <CodeRuns lines={scriptTokens(tokens)} scheme={scheme} />
        ) : (
          <>
            {tokens.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? "\n" : null}
                {/* An empty line is one `empty` token whose content is "\n": the join above already breaks it. */}
                {line.map((token, tokenIndex) =>
                  token.empty ? null : (
                    <Text key={tokenIndex} style={{ color: codeTokenColor(token.types, scheme) }}>
                      {token.content}
                    </Text>
                  ),
                )}
              </Fragment>
            ))}
          </>
        )
      }
    </Highlight>
  );
}

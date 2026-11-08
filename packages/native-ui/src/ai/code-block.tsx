import { Fragment, useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { IconCheck, IconCopy } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { sizeStyle, textStyle } from "../controlStyles";
import { GITHUB_CODE_COLORS, codeTokenColor, loadPrismReactRenderer } from "../highlight";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { MONO_FONT, chatTextSize } from "./chat-text";
import { ChatIconButton } from "./icon-button";

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
};

/** Ghost copy button: the copy icon, then a check for `timeout` after a copy. */
export function CodeBlockCopyButton({ code, onCopy, timeout = 2000, label = "Copy code" }: CodeBlockCopyButtonProps) {
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
  className?: string;
};

/**
 * Code on the flat panel (web `flatPanelSubtle`: `bg-surface-secondary`, no
 * border or shadow) at radius 16. A header with the language and a copy
 * button when either is given. Long lines scroll sideways; the code is
 * selectable. With `prism-react-renderer` installed and a `language`, tokens
 * take the GitHub colours of the scheme.
 */
export function CodeBlock({ code, language, highlight = true, onCopy, className }: CodeBlockProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("small", largerText);
  const caption = chatTextSize("caption", largerText);
  const header = Boolean(language || onCopy);
  return (
    <View
      className={cn("w-full overflow-hidden", className)}
      style={{ borderRadius: tokens.radius.lg, backgroundColor: tokens.color.surfaceSecondary[scheme] }}
    >
      {header ? (
        <View className="min-h-11 flex-row items-center justify-between pl-3 pr-1.5">
          <Text className={caption} style={[sizeStyle(caption), textStyle("muted", scheme), { fontFamily: MONO_FONT }]}>
            {language ?? ""}
          </Text>
          {onCopy ? <CodeBlockCopyButton code={code} onCopy={onCopy} /> : null}
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={header ? "px-4 pb-4" : "p-4"}
      >
        <Text
          selectable
          className={size}
          style={[sizeStyle(size), textStyle("foreground", scheme), { fontFamily: MONO_FONT }]}
        >
          {highlight && language ? <HighlightedCode code={code} language={language} scheme={scheme} /> : code}
        </Text>
      </ScrollView>
    </View>
  );
}

/**
 * Prism tokens as nested `Text` spans, one colour each, lines joined by
 * newlines. They inherit the size and font of the code `Text` around them.
 * Without `prism-react-renderer` it is the plain code.
 */
function HighlightedCode({ code, language, scheme }: { code: string; language: string; scheme: "light" | "dark" }) {
  const Highlight = loadPrismReactRenderer()?.Highlight;
  if (!Highlight) return code;
  return (
    <Highlight
      code={code.replace(/\n$/, "")}
      language={language.toLowerCase()}
      theme={{ plain: { color: GITHUB_CODE_COLORS[scheme].plain }, styles: [] }}
    >
      {({ tokens }) => (
        <>
          {tokens.map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {lineIndex > 0 ? "\n" : null}
              {line.map((token, tokenIndex) => (
                <Text key={tokenIndex} style={{ color: codeTokenColor(token.types, scheme) }}>
                  {token.content}
                </Text>
              ))}
            </Fragment>
          ))}
        </>
      )}
    </Highlight>
  );
}

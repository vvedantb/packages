"use client";
import type { ComponentProps, CSSProperties, HTMLAttributes } from "react";
import type {
  BundledLanguage,
  BundledTheme,
  HighlighterGeneric,
  ThemedToken,
} from "shiki";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/radix-select";
import { cn } from "../utils/cn";
import { flatPanelSubtleClass } from "../ui/surface-classes";
import { useCn, useUiConfig } from "../ui/ui-config";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { bundledLanguages, createHighlighter } from "shiki";
const isBundledLanguage = (lang: string): lang is BundledLanguage =>
  lang in bundledLanguages;
// Shiki uses bitflags for font styles: 1=italic, 2=bold, 4=underline
// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check
// eslint-disable-next-line no-bitwise -- shiki bitflag check
const isItalic = (fontStyle: number | undefined) => fontStyle && fontStyle & 1;
// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check
// eslint-disable-next-line no-bitwise -- shiki bitflag check
// oxlint-disable-next-line eslint(no-bitwise)
const isBold = (fontStyle: number | undefined) => fontStyle && fontStyle & 2;
const isUnderline = (fontStyle: number | undefined) =>
  // biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check
  // oxlint-disable-next-line eslint(no-bitwise)
  fontStyle && fontStyle & 4;
// Transform tokens to include pre-computed keys to avoid noArrayIndexKey lint
interface KeyedToken {
  token: ThemedToken;
  key: string;
}
interface KeyedLine {
  tokens: KeyedToken[];
  key: string;
}
const addKeysToTokens = (lines: ThemedToken[][]): KeyedLine[] =>
  lines.map((line, lineIdx) => ({
    key: `line-${lineIdx}`,
    tokens: line.map((token, tokenIdx) => ({
      key: `line-${lineIdx}-${tokenIdx}`,
      token,
    })),
  }));
// Token rendering component
const TokenSpan = ({ token }: { token: ThemedToken }) => (
  <span
    className="dark:bg-(--shiki-dark-bg)! dark:text-(--shiki-dark)!"
    style={
      {
        backgroundColor: token.bgColor,
        color: token.color,
        fontStyle: isItalic(token.fontStyle) ? "italic" : undefined,
        fontWeight: isBold(token.fontStyle) ? "bold" : undefined,
        textDecoration: isUnderline(token.fontStyle) ? "underline" : undefined,
        ...token.htmlStyle,
      } as CSSProperties
    }
  >
    {token.content}
  </span>
);
// Line rendering component
const LineSpan = ({
  keyedLine,
  showLineNumbers,
}: {
  keyedLine: KeyedLine;
  showLineNumbers: boolean;
}) => (
  <span className={showLineNumbers ? LINE_NUMBER_CLASSES : "block"}>
    {keyedLine.tokens.length === 0
      ? "\n"
      : keyedLine.tokens.map(({ token, key }) => (
          <TokenSpan key={key} token={token} />
        ))}
  </span>
);
// Types
type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  /** Shiki language id. Without it the code renders unhighlighted. */
  language?: string;
  showLineNumbers?: boolean;
  /**
   * Plain text, no shiki: a `pre` with the code. `children`, when given,
   * replace that `pre` (and carry their own copy button) instead of sitting
   * above the highlighted body.
   */
  plain?: boolean;
};
/**
 * `UiConfig.CodeBlock`: `plain` default, and classes that replace the
 * container, the plain-mode `pre`, the copy button and its icon. A
 * `copyLabel` adds a screen-reader label to the copy button.
 */
export interface CodeBlockConfig {
  plain?: boolean;
  copyButtonSize?: ComponentProps<typeof Button>["size"];
  copyLabel?: string;
  classes?: {
    container?: string;
    pre?: string;
    copyButton?: string;
    /** Replaces the icon's `size={14}` with a class. */
    copyIcon?: string;
  };
}
const containerClasses =
  "relative w-full overflow-hidden rounded-lg bg-surface-secondary/60 text-foreground";
interface TokenizedCode {
  tokens: ThemedToken[][];
  fg: string;
  bg: string;
}
interface CodeBlockContextType {
  code: string;
}
// Context
const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});
// Highlighter cache (singleton per language)
const highlighterCache = new Map<
  string,
  Promise<HighlighterGeneric<BundledLanguage, BundledTheme>>
>();
// Token cache
const tokensCache = new Map<string, TokenizedCode>();
// Subscribers for async token updates
const subscribers = new Map<string, Set<(result: TokenizedCode) => void>>();
const getTokensCacheKey = (code: string, language: BundledLanguage) => {
  const start = code.slice(0, 100);
  const end = code.length > 100 ? code.slice(-100) : "";
  return `${language}:${code.length}:${start}:${end}`;
};
const getHighlighter = (
  language: BundledLanguage,
): Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> => {
  const cached = highlighterCache.get(language);
  if (cached) {
    return cached;
  }
  const highlighterPromise = createHighlighter({
    langs: [language],
    themes: ["github-light", "github-dark"],
  });
  highlighterCache.set(language, highlighterPromise);
  return highlighterPromise;
};
// Create raw tokens for immediate display while highlighting loads
const createRawTokens = (code: string): TokenizedCode => ({
  bg: "transparent",
  fg: "inherit",
  tokens: code.split("\n").map((line) =>
    line === ""
      ? []
      : [
          {
            color: "inherit",
            content: line,
          } as ThemedToken,
        ],
  ),
});
// Synchronous highlight with callback for async results
export const highlightCode = (
  code: string,
  language: string,
  // oxlint-disable-next-line eslint-plugin-promise(prefer-await-to-callbacks)
  callback?: (result: TokenizedCode) => void,
): TokenizedCode | null => {
  if (!isBundledLanguage(language)) return null;
  const tokensCacheKey = getTokensCacheKey(code, language);
  // Return cached result if available
  const cached = tokensCache.get(tokensCacheKey);
  if (cached) {
    return cached;
  }
  // Subscribe callback if provided
  if (callback) {
    if (!subscribers.has(tokensCacheKey)) {
      subscribers.set(tokensCacheKey, new Set());
    }
    subscribers.get(tokensCacheKey)?.add(callback);
  }
  // Start highlighting in background - fire-and-forget async pattern
  getHighlighter(language)
    // oxlint-disable-next-line eslint-plugin-promise(prefer-await-to-then)
    .then((highlighter) => {
      const availableLangs = highlighter.getLoadedLanguages();
      const langToUse = availableLangs.includes(language) ? language : "text";
      const result = highlighter.codeToTokens(code, {
        lang: langToUse,
        themes: {
          dark: "github-dark",
          light: "github-light",
        },
      });
      const tokenized: TokenizedCode = {
        bg: result.bg ?? "transparent",
        fg: result.fg ?? "inherit",
        tokens: result.tokens,
      };
      // Cache the result
      tokensCache.set(tokensCacheKey, tokenized);
      // Notify all subscribers
      const subs = subscribers.get(tokensCacheKey);
      if (subs) {
        for (const sub of subs) {
          sub(tokenized);
        }
        subscribers.delete(tokensCacheKey);
      }
    })
    // oxlint-disable-next-line eslint-plugin-promise(prefer-await-to-then), eslint-plugin-promise(prefer-await-to-callbacks)
    .catch((error) => {
      console.error("Failed to highlight code:", error);
      subscribers.delete(tokensCacheKey);
    });
  return null;
};
// Line number styles using CSS counters
const LINE_NUMBER_CLASSES = cn(
  "block",
  "before:content-[counter(line)]",
  "before:inline-block",
  "before:[counter-increment:line]",
  "before:w-8",
  "before:mr-4",
  "before:text-right",
  "before:text-muted-foreground/50",
  "before:font-mono",
  "before:select-none",
);
function CodeBlockBody({
  tokenized,
  showLineNumbers,
  className,
}: {
  tokenized: TokenizedCode;
  showLineNumbers: boolean;
  className?: string;
}) {
  const preStyle = {
    backgroundColor: tokenized.bg,
    color: tokenized.fg,
  };
  const keyedLines = addKeysToTokens(tokenized.tokens);
  return (
    <pre
      className={cn(
        "dark:bg-(--shiki-dark-bg)! dark:text-(--shiki-dark)! m-0 p-4 text-sm",
        className,
      )}
      style={preStyle}
    >
      <code
        className={cn(
          "font-mono text-sm",
          showLineNumbers && "[counter-increment:line_0] [counter-reset:line]",
        )}
      >
        {keyedLines.map((keyedLine) => (
          <LineSpan
            key={keyedLine.key}
            keyedLine={keyedLine}
            showLineNumbers={showLineNumbers}
          />
        ))}
      </code>
    </pre>
  );
}
export const CodeBlockContainer = ({
  className,
  language,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  language: string;
}) => {
  const container = useUiConfig("CodeBlock")?.classes?.container;
  const merge = useCn();
  return (
    <div
      className={merge(container ?? containerClasses, className)}
      data-language={language}
      style={{
        containIntrinsicSize: "auto 200px",
        contentVisibility: "auto",
        ...style,
      }}
      {...props}
    />
  );
};
export const CodeBlockHeader = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      cn(
        flatPanelSubtleClass,
        "flex items-center justify-between px-3 py-2 text-muted-foreground text-xs",
      ),
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
export const CodeBlockTitle = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);
export const CodeBlockFilename = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("font-mono", className)} {...props}>
    {children}
  </span>
);
export const CodeBlockActions = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("-my-1 -mr-1 flex items-center gap-2", className)}
    {...props}
  >
    {children}
  </div>
);
export const CodeBlockContent = ({
  code,
  language,
  showLineNumbers = false,
}: {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}) => {
  // Memoized raw tokens for immediate display
  const rawTokens = createRawTokens(code);
  // Try to get cached result synchronously, otherwise use raw tokens
  const [tokenized, setTokenized] = useState<TokenizedCode>(
    () => highlightCode(code, language) ?? rawTokens,
  );
  useEffect(() => {
    let cancelled = false;
    // Reset to raw tokens when code changes (shows current code, not stale tokens)
    setTokenized(highlightCode(code, language) ?? rawTokens);
    // Subscribe to async highlighting result
    highlightCode(code, language, (result) => {
      if (!cancelled) {
        setTokenized(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, language, rawTokens]);
  return (
    <div className="relative overflow-auto">
      <CodeBlockBody showLineNumbers={showLineNumbers} tokenized={tokenized} />
    </div>
  );
};
export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  plain,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const config = useUiConfig("CodeBlock");
  const merge = useCn();
  const contextValue = { code };
  if (plain ?? config?.plain) {
    return (
      <CodeBlockContext.Provider value={contextValue}>
        <div
          className={merge(config?.classes?.container ?? containerClasses, className)}
          {...props}
        >
          {children ?? (
            <pre className={config?.classes?.pre ?? "m-0 overflow-x-auto p-4 text-sm"}>
              <code data-language={language}>{code}</code>
            </pre>
          )}
        </div>
      </CodeBlockContext.Provider>
    );
  }
  return (
    <CodeBlockContext.Provider value={contextValue}>
      <CodeBlockContainer className={className} language={language ?? "text"} {...props}>
        {children}
        <CodeBlockContent
          code={code}
          language={language ?? "text"}
          showLineNumbers={showLineNumbers}
        />
      </CodeBlockContainer>
    </CodeBlockContext.Provider>
  );
};
export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};
export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number>(0);
  const { code } = useContext(CodeBlockContext);
  const config = useUiConfig("CodeBlock");
  const merge = useCn();
  const iconClass = config?.classes?.copyIcon;
  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }
    try {
      if (!isCopied) {
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        onCopy?.();
        timeoutRef.current = window.setTimeout(
          () => setIsCopied(false),
          timeout,
        );
      }
    } catch (error) {
      onError?.(error as Error);
    }
  };
  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    [],
  );
  const Icon = isCopied ? IconCheck : IconCopy;
  return (
    <Button
      className={merge(config?.classes?.copyButton ?? "shrink-0", className)}
      onClick={copyToClipboard}
      size={config?.copyButtonSize ?? "icon"}
      variant="ghost"
      {...props}
    >
      {children ?? (iconClass === undefined ? <Icon size={14} /> : <Icon className={iconClass} />)}
      {config?.copyLabel ? <span className="sr-only">{config.copyLabel}</span> : null}
    </Button>
  );
};
export type CodeBlockLanguageSelectorProps = ComponentProps<typeof Select>;
export const CodeBlockLanguageSelector = (
  props: CodeBlockLanguageSelectorProps,
) => <Select {...props} />;
export type CodeBlockLanguageSelectorTriggerProps = ComponentProps<
  typeof SelectTrigger
>;
export const CodeBlockLanguageSelectorTrigger = ({
  className,
  ...props
}: CodeBlockLanguageSelectorTriggerProps) => (
  <SelectTrigger
    className={cn(
      "h-7 border-none bg-transparent px-2 text-xs shadow-none",
      className,
    )}
    size="sm"
    {...props}
  />
);
export type CodeBlockLanguageSelectorValueProps = ComponentProps<
  typeof SelectValue
>;
export const CodeBlockLanguageSelectorValue = (
  props: CodeBlockLanguageSelectorValueProps,
) => <SelectValue {...props} />;
export type CodeBlockLanguageSelectorContentProps = ComponentProps<
  typeof SelectContent
>;
export const CodeBlockLanguageSelectorContent = ({
  align = "end",
  ...props
}: CodeBlockLanguageSelectorContentProps) => (
  <SelectContent align={align} {...props} />
);
export type CodeBlockLanguageSelectorItemProps = ComponentProps<
  typeof SelectItem
>;
export const CodeBlockLanguageSelectorItem = (
  props: CodeBlockLanguageSelectorItemProps,
) => <SelectItem {...props} />;

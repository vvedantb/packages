"use client";

import type { ComponentProps } from "react";
import { memo } from "react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import type { Components } from "streamdown";
import {
  Streamdown,
  defaultRehypePlugins,
  defaultRemarkPlugins,
} from "streamdown";

import { useCn } from "../ui/ui-config";
import { parseMarkdownIntoBlocksIncremental } from "./incrementalBlocks";
import { MarkdownBlockquote } from "./MarkdownBlockquote";
import { MarkdownPre } from "./MarkdownCodeBlock";
import { MarkdownInlineCode } from "./MarkdownInlineCode";
import { MarkdownLink } from "./MarkdownLink";
import { mermaidPlugin } from "./mermaid";
import { copyMarkdownSelection } from "./markdownClipboard";
import { rehypeGithubAlerts } from "./rehypeGithubAlerts";
// The math plugin renders KaTeX markup but ships no stylesheet with it.
import "katex/dist/katex.min.css";
import { useSmoothText } from "./useSmoothText";

const PLUGINS = { cjk, code, math, mermaid: mermaidPlugin };

/**
 * `remarkPlugins` / `rehypePlugins` REPLACE Streamdown's defaults rather than
 * extending them, so the defaults (GFM + fence meta; raw HTML, sanitise,
 * harden) are spread back in first. Alerts run after the sanitiser, which
 * would otherwise strip the attribute they set.
 */
const REMARK_PLUGINS = Object.values(defaultRemarkPlugins);
const REHYPE_PLUGINS = [...Object.values(defaultRehypePlugins), rehypeGithubAlerts];

/**
 * Plain tags where Streamdown's defaults bake in Tailwind classes (text-3xl
 * headings, `list-inside` lists, a `span` for bold, padded table cells): the
 * `.markdown` stylesheet owns typography, so these render unstyled. `table`
 * itself stays Streamdown's, for its copy / download / fullscreen controls.
 */
const MARKDOWN_COMPONENTS: Components = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  ul: "ul",
  ol: "ol",
  li: "li",
  hr: "hr",
  strong: "strong",
  thead: "thead",
  tbody: "tbody",
  tr: "tr",
  th: "th",
  td: "td",
  a: MarkdownLink,
  blockquote: MarkdownBlockquote,
  pre: MarkdownPre,
  inlineCode: MarkdownInlineCode,
};

export type MarkdownProps = Omit<
  ComponentProps<typeof Streamdown>,
  "plugins" | "rehypePlugins" | "parseMarkdownIntoBlocksFn"
> & {
  children: string;
  /**
   * With `mode="streaming"`, ease text that arrives in bursts onto the screen
   * (`useSmoothText`). Default `true`; `false` shows each chunk as it lands.
   */
  smooth?: boolean;
};

/**
 * A markdown renderer for chat replies, reasoning, comments, PR bodies and
 * changelogs. Streamdown streams it block by block; this layer adds the code
 * blocks, callouts, links, typography and copy-as-markdown every surface
 * shares. Typography lives in `@vvedantb/ui/tokens/css/markdown.css`.
 * `components` and `remarkPlugins` extend the defaults, never replace them
 * (mention chips, line breaks).
 */
export const Markdown = memo(function Markdown({
  className,
  components,
  remarkPlugins,
  children,
  smooth = true,
  ...props
}: MarkdownProps) {
  const merge = useCn();
  const text = useSmoothText(children, smooth && props.mode === "streaming");
  return (
    <div className="contents" onCopy={copyMarkdownSelection}>
      <Streamdown
        className={merge("markdown", className)}
        plugins={PLUGINS}
        components={
          components ? { ...MARKDOWN_COMPONENTS, ...components } : MARKDOWN_COMPONENTS
        }
        remarkPlugins={
          remarkPlugins ? [...REMARK_PLUGINS, ...remarkPlugins] : REMARK_PLUGINS
        }
        rehypePlugins={REHYPE_PLUGINS}
        // Streamdown re-renders only the block still being written, but its
        // default split re-lexes the whole reply behind every token. This one
        // reuses the blocks a byte-identical prefix already produced.
        parseMarkdownIntoBlocksFn={parseMarkdownIntoBlocksIncremental}
        {...props}
      >
        {text}
      </Streamdown>
    </div>
  );
});

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

// Chat defaults against their web twins in `@vvedantb/ui` (`packages/ui`): the
// message body size, the user bubble padding, the `Markdown` look (the
// `markdown.css` scale and the Streamdown root that `Markdown.tsx` renders),
// both code blocks, the composer fields and send buttons, and the question
// card type. Every default kept here reads the `packages/ui` source; looks
// only Eva's web app has are opt-in props and are not checked here.

vi.mock("react-native", () => ({ Platform: { OS: "ios", select: (o: { default: string }) => o.default } }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ui = join(root, "..", "ui");
const read = (...parts: string[]) => readFileSync(join(...parts), "utf8");
const markdownCss = read(ui, "tokens", "src", "css", "markdown.css");
const typeScale = read(ui, "tokens", "src", "css", "type-scale.css");
const webMessage = read(ui, "src", "ai-elements", "message.tsx");
const webComposer = read(ui, "src", "composer", "Composer.tsx");
const webPromptInput = read(ui, "src", "ai-elements", "prompt-input.tsx");
const webTextarea = read(ui, "src", "ui", "textarea.tsx");
const webConversation = read(ui, "src", "ai-elements", "conversation.tsx");
const webCodeBlock = read(ui, "src", "ai-elements", "code-block.tsx");
const webMarkdownCode = read(ui, "src", "markdown", "MarkdownCodeBlock.tsx");
const webMarkdown = read(ui, "src", "markdown", "Markdown.tsx");
const webQuestion = read(ui, "src", "ai-elements", "activity-question.tsx");
// The Streamdown build `@vvedantb/ui` installs: its root and table classes.
const streamdownDist = join(ui, "node_modules", "streamdown", "dist");
const streamdown = readdirSync(streamdownDist)
  .filter((file) => file.endsWith(".js"))
  .map((file) => read(streamdownDist, file))
  .join("\n");
const native = (file: string) => read(root, "src", ...file.split("/"));

describe("chat text", () => {
  it("draws message text at the web MessageContent text-sm", async () => {
    const { chatTextSize } = await import("../src/ai/chat-text");
    expect(webMessage).toMatch(/"flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm"/);
    expect(chatTextSize("body", false)).toBe("text-sm");
  });

  it("pads every user bubble px-4 py-3, as the web MessageContent (tint included)", () => {
    expect(webMessage).toMatch(/group-\[\.is-user\]:px-4 group-\[\.is-user\]:py-3/);
    expect(native("ai/message.tsx")).toMatch(/user && "px-4 py-3"/);
  });

  it("has a relaxed (1.625) leading, the web .markdown line height, as the one source for relaxedSizeStyle", async () => {
    const { sizeStyle } = await import("../src/controlStyles");
    const { relaxedSizeStyle } = await import("../src/settings/relaxedSizeStyle");
    expect(markdownCss).toMatch(/\.markdown \{\s*line-height: 1\.625;/);
    expect(sizeStyle("text-sm", "relaxed")).toEqual({ fontSize: 14, lineHeight: 22.75 });
    expect(relaxedSizeStyle("text-xs")).toEqual(sizeStyle("text-xs", "relaxed"));
    expect(native("settings/relaxedSizeStyle.ts")).toMatch(/return sizeStyle\(size, "relaxed"\);/);
    expect(native("markdown/Markdown.tsx")).toMatch(/leading = "relaxed"/);
  });

  it("offers the web text-2xs token for the message clock, opt-in", async () => {
    const { META_TEXT_STYLE } = await import("../src/ai/chat-text");
    expect(typeScale).toMatch(/--text-2xs: 0\.6875rem;/);
    expect(typeScale).toMatch(/--text-2xs--line-height: 1rem;/);
    expect(typeScale).toMatch(/--text-2xs--letter-spacing: 0\.01em;/);
    expect(META_TEXT_STYLE).toEqual({ fontSize: 11, lineHeight: 16, letterSpacing: 0.11 });
    // The default stays the caption size.
    expect(native("ai/message.tsx")).toMatch(/size = "caption"/);
  });
});

describe("markdown", () => {
  it("puts 16 between blocks and none outside, as the Streamdown root Markdown.tsx renders", () => {
    // `@vvedantb/ui` `Markdown` hands its `markdown` class to Streamdown, whose
    // root adds `space-y-4`: a utility, so it wins over the `.markdown` margins.
    expect(webMarkdown).toMatch(/<Streamdown\s+className=\{merge\("markdown", className\)\}/);
    expect(streamdown).toMatch(/space-y-4 whitespace-normal \[&>\*:first-child\]:mt-0 \[&>\*:last-child\]:mb-0/);
    const source = native("markdown/Markdown.tsx");
    expect(source).toMatch(/blockGap: 16,/);
    expect(source).toMatch(/marginVertical: -MARKDOWN_SCALE\.blockGap \/ 2/);
  });

  it("draws no rule under headings, as markdown.css", () => {
    const headings = markdownCss.match(/\.markdown :is\(h1, h2, h3, h4, h5, h6\) \{[^}]*\}/)?.[0] ?? "";
    expect(headings).toMatch(/font-weight: 600;/);
    expect(headings).not.toMatch(/border/);
    expect(native("markdown/Markdown.tsx")).toMatch(/borderBottomWidth: 0,/);
  });

  it("draws links at medium weight, quotes muted and inline code in the text colour", () => {
    expect(markdownCss).toMatch(/\.markdown-link \{[^}]*font-weight: 500;/);
    expect(markdownCss).toMatch(/\.markdown blockquote \{[^}]*color: rgb\(var\(--muted-foreground\)\);/);
    expect(markdownCss.match(/\.markdown-inline-code \{[^}]*\}/)?.[0]).not.toMatch(/\scolor:/);
    const source = native("markdown/Markdown.tsx");
    expect(source).toMatch(/fontFamily: fontFamily\.medium, \.\.\.typeStyle\("medium"\)/);
    expect(source).toMatch(/restyleText\(children, \(style\) => \(\{ \.\.\.style, color: muted \}\)\)/);
    expect(source).toMatch(/codespan: inlineCodeStyle\(scheme, body\.fontSize, color\)/);
  });

  it("sizes tables as markdown.css and the Streamdown table", () => {
    expect(markdownCss).toMatch(/\.markdown table \{\s*font-size: 0\.93em;\s*overflow-wrap: normal;\s*line-height: 1\.5;/);
    expect(markdownCss).toMatch(/\.markdown :is\(th, td\) \{\s*padding: 0\.45rem 0\.75rem;/);
    expect(markdownCss).toMatch(/\.markdown th \{\s*font-weight: 600;/);
    expect(markdownCss).toMatch(/border-top: 1px solid rgb\(var\(--border\) \/ 0\.7\)/);
    expect(markdownCss).toMatch(/padding: 0\.25rem 0\.3rem 0\.4rem;/);
    expect(markdownCss).toMatch(/\.markdown :is\(p, ul, ol, blockquote, table,[^{]*\{\s*margin-block: 0\.65rem;/);
    // The header row: the table's `divide-y divide-border`.
    expect(streamdown).toMatch(/w-full divide-y divide-border/);
    const source = native("markdown/Markdown.tsx");
    expect(source).toMatch(/fontScale: 0\.93,\s*lineHeight: 1\.5,\s*cellPaddingX: 12,\s*cellPaddingY: 7,/);
    expect(source).toMatch(/panelPadding: \{ top: 4, x: 5, bottom: 6 \},\s*tableMargin: 10,/);
    expect(source).toMatch(/withAlpha\(tokens\.color\.border\[this\.scheme\], 0\.7\)/);
  });

  it("draws fenced code as the web MarkdownCodeBlock: header, pre, icon-xs wrap toggle and copy", () => {
    expect(markdownCss).toMatch(/\.markdown-code-header \{[^}]*padding: 0\.25rem 0\.3rem 0 0\.9rem;[^}]*line-height: 1\.75rem;/);
    expect(markdownCss).toMatch(/\.markdown-code pre \{[^}]*padding: 0\.25rem 0\.9rem 0\.8rem;[^}]*font-size: 0\.8125rem;\s*line-height: 1\.55;/);
    expect(markdownCss).toMatch(/\.markdown-code-actions \{[^}]*gap: 0\.125rem;/);
    expect(webMarkdownCode).toMatch(/tooltip=\{wrap \? "Scroll long lines" : "Wrap long lines"\}\s*size="icon-xs"/);
    expect(webMarkdownCode).toMatch(/className=\{wrap \? "text-foreground" : "text-muted-foreground"\}/);
    expect(webMarkdownCode).toMatch(/<IconTextWrap \/>[\s\S]*tooltip=\{copied \? "Copied" : "Copy code"\}/);
    const source = native("ai/code-block.tsx");
    expect(source).toMatch(/header: \{ minHeight: 32, paddingTop: 4, paddingLeft: 14, paddingRight: 5 \}/);
    expect(source).toMatch(/code: \{ paddingTop: 4, paddingHorizontal: 14, paddingBottom: 13 \}/);
    expect(source).toMatch(/text: \{ fontSize: 13, lineHeight: 13 \* 1\.55 \}/);
    expect(source).toMatch(/label=\{wrap \? "Scroll long lines" : "Wrap long lines"\}/);
    expect(source).toMatch(/onCopy=\{onCopy\} size="xs"/);
    expect(native("markdown/Markdown.tsx")).toMatch(/<CodeBlock key=\{this\.getKey\(\)\} variant="markdown"/);
  });

  it("keeps the standalone CodeBlock at the web CodeBlock: text-sm code in p-4, px-3 header", () => {
    expect(webCodeBlock).toMatch(/"m-0 overflow-x-auto p-4 text-sm"/);
    expect(webCodeBlock).toMatch(/flex items-center justify-between px-3 py-2 text-muted-foreground text-xs/);
    const source = native("ai/code-block.tsx");
    expect(source).toMatch(/variant = "default"/);
    expect(source).toMatch(/contentContainerClassName=\{header \? "px-4 pb-4" : "p-4"\}/);
    expect(source).toMatch(/className="min-h-11 flex-row items-center justify-between pl-3 pr-1\.5"/);
  });
});

describe("composer and scroll button", () => {
  it("sets the inline field as the web Composer and the stacked one as the web PromptInput Textarea", () => {
    expect(webComposer).toMatch(/const TEXT_METRICS_BASE = "block w-full text-sm leading-6/);
    // Below `sm` (phones) the Textarea is `text-base`.
    expect(webTextarea).toMatch(/text-base sm:text-sm/);
    expect(webPromptInput).toMatch(/<InputGroupTextarea/);
    const source = native("ai/prompt-input.tsx");
    expect(source).toMatch(/\? \{ fontSize: 14, lineHeight: pill \? 20 : 24 \}\s*: sizeStyle\("text-base"\)/);
    expect(source).toMatch(/const ONE_ROW = Platform\.OS === "web" \? 1 : undefined;/);
    expect(source.match(/numberOfLines=\{ONE_ROW\}/g)).toHaveLength(2);
  });

  it("keeps Send on the primary fill, faded when disabled, as both web send buttons", () => {
    expect(webComposer).toMatch(/variant="default"\s*aria-label="Send message"\s*data-slot="composer-send"\s*disabled=\{!canSend\}/);
    expect(webPromptInput).toMatch(/export const PromptInputSubmit = \(\{\s*className,\s*variant = "default",/);
    expect(native("ai/prompt-input.tsx")).toMatch(/icon=\{IconArrowUp\}\s*label="Send"\s*variant="primary"/);
  });

  it("drops the measured height when the field empties, so it is one line again", () => {
    expect(native("ai/prompt-input.tsx")).toMatch(/if \(next === ""\) setContentHeight\(0\);/);
  });

  it("can draw its label after the icon, as the web button with a label", () => {
    expect(webConversation).toMatch(/\{icon \?\? <IconArrowDown className="size-4" \/>\}\s*\{label\}/);
    expect(native("ai/conversation.tsx")).toMatch(/showLabel \? \(/);
  });
});

describe("question card", () => {
  it("draws option descriptions text-xs leading-relaxed and the topic text-3xs semibold, as the web question card", () => {
    expect(webQuestion).toMatch(/"mt-0\.5 text-xs leading-relaxed text-muted-foreground"/);
    expect(webQuestion).toMatch(/variant="secondary"\s*className="shrink-0 text-3xs font-semibold"/);
    const source = native("ai/choice-question.tsx");
    expect(source).toMatch(/sizeStyle\(chatTextSize\("caption", largerText\), "relaxed"\)/);
    expect(source).toMatch(/const fontSize = largerText \? 14 : 10;/);
  });
});

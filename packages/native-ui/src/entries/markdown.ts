// `@vvedantb/native-ui/markdown`: `Markdown`, chat markdown styled as the web
// `.markdown` block. Not on the root entry: it imports the optional peer
// `react-native-marked`, and Metro does not tree-shake.
export { Markdown, markdownStyles, inlineCodeStyle, MARKDOWN_SCALE, MARKDOWN_LIST } from "../markdown/Markdown";
export type { MarkdownHeadings, MarkdownProps } from "../markdown/Markdown";

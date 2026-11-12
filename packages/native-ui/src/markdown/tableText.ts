/**
 * A markdown table as text, for the table's copy actions: the formats and
 * escaping of the web table controls (Streamdown's Copy table: Markdown, CSV
 * and TSV), from each cell's plain text.
 */
export type MarkdownTableData = { headers: string[]; rows: string[][] };

export type MarkdownTableFormat = "markdown" | "csv" | "tsv";

/** CSV: a cell with a comma, quote or line break is quoted, its quotes doubled. Lines join with `\n`. */
function toCsv({ headers, rows }: MarkdownTableData): string {
  const cell = (text: string) => (/[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  return [...(headers.length > 0 ? [headers] : []), ...rows].map((row) => row.map(cell).join(",")).join("\n");
}

/** TSV: tabs and line breaks in a cell are written as `\t`, `\n` and `\r`. */
function toTsv({ headers, rows }: MarkdownTableData): string {
  const cell = (text: string) => text.replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  return [...(headers.length > 0 ? [headers] : []), ...rows].map((row) => row.map(cell).join("\t")).join("\n");
}

const MARKDOWN_ESCAPES: Record<string, string> = { "\\": "\\\\", "|": "\\|", "\n": "<br>", "&": "&amp;", "<": "&lt;", ">": "&gt;" };

/** GitHub markdown: pipes and backslashes escaped, line breaks as `<br>`, short rows padded to the header. */
function toMarkdown({ headers, rows }: MarkdownTableData): string {
  if (headers.length === 0) return "";
  const cell = (text: string) => text.replace(/[\\|\n&<>]/g, (char) => MARKDOWN_ESCAPES[char] ?? char);
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [
    line(headers.map(cell)),
    line(headers.map(() => "---")),
    ...rows.map((row) => line(row.length < headers.length ? headers.map((_, index) => cell(row[index] ?? "")) : row.map(cell))),
  ].join("\n");
}

/** The table in one of the copy formats. */
export function markdownTableText(data: MarkdownTableData, format: MarkdownTableFormat): string {
  if (format === "csv") return toCsv(data);
  if (format === "tsv") return toTsv(data);
  return toMarkdown(data);
}

/**
 * Column widths for the full-screen table, where columns size to their text
 * as the web table does: React Native has no table layout, so the longest
 * line in each column, at `charWidth` a character plus the cell padding,
 * clamped to `[min, max]`.
 */
export function markdownTableColumnWidths(
  data: MarkdownTableData,
  { charWidth, padding, min, max }: { charWidth: number; padding: number; min: number; max: number },
): number[] {
  return data.headers.map((header, column) => {
    const cells = [header, ...data.rows.map((row) => row[column] ?? "")];
    const longest = Math.max(...cells.flatMap((text) => text.split("\n").map((line) => line.length)));
    return Math.min(max, Math.max(min, Math.ceil(longest * charWidth + padding)));
  });
}

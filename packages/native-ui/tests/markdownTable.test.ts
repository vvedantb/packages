import { describe, expect, it } from "vitest";
import { markdownTableColumnWidths, markdownTableText } from "../src/markdown/tableText";

// The table copy formats of the web table controls (Streamdown's Copy table).
const table = {
  headers: ["Case", "Input", "Output"],
  rows: [
    ["Comma", "a,b", '"a,b"'],
    ["Pipe", "a|b", "x<y"],
    ["Short", "tab\there"],
  ],
};

describe("markdown table text", () => {
  it("copies as GitHub markdown, escaping pipes and HTML and padding short rows", () => {
    expect(markdownTableText(table, "markdown")).toBe(
      [
        "| Case | Input | Output |",
        "| --- | --- | --- |",
        '| Comma | a,b | "a,b" |',
        "| Pipe | a\\|b | x&lt;y |",
        "| Short | tab\there |  |",
      ].join("\n"),
    );
    expect(markdownTableText({ headers: [], rows: [["a"]] }, "markdown")).toBe("");
  });

  it("copies as CSV, quoting cells with commas or quotes", () => {
    expect(markdownTableText(table, "csv")).toBe(
      ["Case,Input,Output", 'Comma,"a,b","""a,b"""', "Pipe,a|b,x<y", "Short,tab\there"].join("\n"),
    );
  });

  it("copies as TSV, writing tabs and line breaks in a cell as escapes", () => {
    expect(markdownTableText({ headers: ["A"], rows: [["one\ttwo\nthree"]] }, "tsv")).toBe("A\none\\ttwo\\nthree");
  });

  it("sizes full-screen columns to their longest line, within the bounds", () => {
    const widths = markdownTableColumnWidths(
      { headers: ["Case", "Output"], rows: [["Line break", "x".repeat(100)]] },
      { charWidth: 7.5, padding: 24, min: 72, max: 320 },
    );
    expect(widths).toEqual([Math.ceil(10 * 7.5 + 24), 320]);
  });
});

import { Children, isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { palette, withAlpha } from "../src/palette";
import { tokens } from "../src/tokens";
import type { UnifiedDiffLine } from "../src/ai/unified-diff";

// `UnifiedDiff` and `DiffStat` (`/ai`): the web Code tab's unified diff and
// `PrDiffStat`, for a phone diff screen.

vi.mock("react-native", () => ({
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  Platform: { select: (options: { default: string }) => options.default },
}));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/theme", () => ({ useLargerText: () => false }));

type Style = Record<string, string | number | undefined>;
type Part = {
  style?: Style | ReadonlyArray<Style | ReadonlyArray<Style>>;
  children?: ReactNode;
  horizontal?: boolean;
  accessibilityLabel?: string;
};

function part(node: ReactNode) {
  if (!isValidElement<Part>(node)) throw new Error("not an element");
  return node;
}

function flatStyle(style: Part["style"]): Style {
  if (style === undefined) return {};
  if (!Array.isArray(style)) return { ...style };
  return Object.assign({}, ...style.map((entry) => flatStyle(entry)));
}

function text(node: ReactNode): string {
  return Children.toArray(part(node).props.children).join("");
}

const lines: UnifiedDiffLine[] = [
  { kind: "hunk", text: "@@ -9,2 +9,2 @@" },
  { kind: "context", text: "const a = 1;", oldLine: 9, newLine: 9 },
  { kind: "removed", text: "const b = 2;", oldLine: 10, newLine: null },
  { kind: "added", text: "const b = 3;", oldLine: null, newLine: 10 },
];

async function renderDiff() {
  const { UnifiedDiff } = await import("../src/ai/unified-diff");
  const tree = part(UnifiedDiff({ lines }));
  const rows = Children.toArray(part(tree.props.children).props.children).map(part);
  return { tree, rows };
}

describe("UnifiedDiff", () => {
  it("scrolls sideways and draws one row per line", async () => {
    const { tree, rows } = await renderDiff();
    expect(tree.type).toBe("ScrollView");
    expect(tree.props.horizontal).toBe(true);
    expect(rows).toHaveLength(4);
  });

  it("draws a hunk header as a muted row on the secondary surface", async () => {
    const { rows } = await renderDiff();
    expect(text(rows[0])).toBe("@@ -9,2 +9,2 @@");
    expect(flatStyle(rows[0]?.props.style)).toMatchObject({
      backgroundColor: tokens.color.surfaceSecondary.light,
      color: tokens.color.muted.light,
      fontSize: 14,
      lineHeight: 22,
    });
  });

  it("numbers a removed line by its old side and others by the new, with the marker and a 10% tint", async () => {
    const { rows } = await renderDiff();
    const cells = rows.slice(1).map((row) => Children.toArray(row.props.children).map(part));
    expect(cells.map(([gutter, line]) => [text(gutter), text(line)])).toEqual([
      ["9", "  const a = 1;"],
      ["10", "- const b = 2;"],
      ["10", "+ const b = 3;"],
    ]);
    expect(flatStyle(rows[1]?.props.style).backgroundColor).toBeUndefined();
    expect(flatStyle(rows[2]?.props.style).backgroundColor).toBe(withAlpha(palette.danger.light, 0.1));
    expect(flatStyle(rows[3]?.props.style).backgroundColor).toBe(withAlpha("#10b981", 0.1));
  });
});

describe("DiffStat", () => {
  it("reads +n and −m, and drops a zero side with hideZero", async () => {
    const { DiffStat } = await import("../src/ai/unified-diff");
    const both = part(DiffStat({ additions: 1200, deletions: 3 }));
    expect(both.props.accessibilityLabel).toBe("1200 additions, 3 deletions");
    expect(Children.toArray(both.props.children).map(text)).toEqual([`+${(1200).toLocaleString()}`, "−3"]);
    const added = part(DiffStat({ additions: 2, deletions: 0, hideZero: true }));
    expect(Children.toArray(added.props.children).map(text)).toEqual(["+2"]);
  });
});

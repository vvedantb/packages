import { ScrollView, Text, View, type TextStyle } from "react-native";
import { sizeStyle, textStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { tokens } from "../tokens";
import { useLargerText } from "../theme";
import { useScheme } from "../useScheme";
import { MONO_FONT, chatTextSize } from "./chat-text";

/** One row of a unified diff: a hunk separator, or a line with its old and new line numbers. */
export type UnifiedDiffLine =
  | { readonly kind: "hunk"; readonly text: string }
  | {
      readonly kind: "added" | "removed" | "context";
      /** The line's content, without its `+`/`-`/space marker. */
      readonly text: string;
      /** Null for an added line. */
      readonly oldLine: number | null;
      /** Null for a removed line. */
      readonly newLine: number | null;
    };

/**
 * The web Code tab type (`--diffs-font-size: 14px`, `--diffs-line-height: 22px`),
 * the gutter padding and the width of one gutter digit.
 */
export const UNIFIED_DIFF = { fontSize: 14, lineHeight: 22, gutterPadding: 8, digitWidth: 8.5 } as const;

/** Larger text steps the code up as `chatTextSize("small")` does (`text-lg`), keeping the 22/14 leading. */
const LARGER_FONT_SIZE = 18;

/** Web `bg-emerald-500/10` and `text-emerald-700` (dark `text-emerald-300`): edit and diff added lines. */
export const EMERALD = { fill: "#10b981", light: "#047857", dark: "#6ee7b7" } as const;

/** Web `text-emerald-600` (dark `text-emerald-400`), the `+n` of a diff stat. */
const ADDED_TEXT = { light: "#059669", dark: "#34d399" } as const;

const SIGN = { added: "+", removed: "-", context: " " } as const;

const TABULAR: TextStyle = { fontVariant: ["tabular-nums"] };

export type UnifiedDiffProps = {
  lines: ReadonlyArray<UnifiedDiffLine>;
  className?: string;
};

/**
 * One file's diff in one column, as the web Code tab draws it in unified view
 * (`@pierre/diffs`): a line number gutter (the old number on a removed line,
 * the new one otherwise), the `+`/`-` marker, and the line in mono 14 / 22.
 * Added lines tint green and removed lines red, each at 10%; a hunk header is
 * a muted row on the secondary surface. Long lines do not wrap: the whole
 * diff scrolls sideways, and every row spans the widest line.
 */
export function UnifiedDiff({ lines, className }: UnifiedDiffProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const fontSize = largerText ? LARGER_FONT_SIZE : UNIFIED_DIFF.fontSize;
  const widest = lines.reduce(
    (max, line) => (line.kind === "hunk" ? max : Math.max(max, line.oldLine ?? 0, line.newLine ?? 0)),
    0,
  );
  const scale = fontSize / UNIFIED_DIFF.fontSize;
  const gutter = String(widest).length * UNIFIED_DIFF.digitWidth * scale + UNIFIED_DIFF.gutterPadding * 2;
  const mono = { fontFamily: MONO_FONT, fontSize, lineHeight: UNIFIED_DIFF.lineHeight * scale };
  return (
    <ScrollView horizontal className={className} contentContainerStyle={{ minWidth: "100%" }}>
      <View style={{ flexGrow: 1 }}>
        {lines.map((line, index) => {
          if (line.kind === "hunk") {
            return (
              <Text
                key={index}
                numberOfLines={1}
                style={[
                  mono,
                  textStyle("muted", scheme),
                  { backgroundColor: tokens.color.surfaceSecondary[scheme], paddingHorizontal: UNIFIED_DIFF.gutterPadding },
                ]}
              >
                {line.text}
              </Text>
            );
          }
          const tint =
            line.kind === "added"
              ? withAlpha(EMERALD.fill, 0.1)
              : line.kind === "removed"
                ? withAlpha(palette.danger[scheme], 0.1)
                : undefined;
          const number = line.kind === "removed" ? line.oldLine : line.newLine;
          return (
            <View key={index} className="flex-row" style={{ backgroundColor: tint }}>
              <Text
                style={[
                  mono,
                  textStyle("muted", scheme),
                  TABULAR,
                  { width: gutter, paddingHorizontal: UNIFIED_DIFF.gutterPadding, textAlign: "right" },
                ]}
              >
                {number ?? ""}
              </Text>
              <Text selectable style={[mono, textStyle("foreground", scheme), { paddingRight: UNIFIED_DIFF.gutterPadding * 2 }]}>
                {`${SIGN[line.kind]} ${line.text}`}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export type DiffStatProps = {
  additions: number;
  deletions: number;
  /** Drop a side that is zero, so a pure addition reads `+2`, not `+2 −0`. */
  hideZero?: boolean;
  className?: string;
};

/** The web `PrDiffStat`: `+n` in emerald and `−m` in the destructive colour, tabular mono. */
export function DiffStat({ additions, deletions, hideZero = false, className }: DiffStatProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const stat = [sizeStyle(chatTextSize("small", largerText)), TABULAR, { fontFamily: MONO_FONT }];
  return (
    <View
      accessible
      accessibilityLabel={`${additions} additions, ${deletions} deletions`}
      className={className}
      style={{ flexDirection: "row", flexShrink: 0, gap: 4 }}
    >
      {hideZero && additions === 0 ? null : (
        <Text style={[stat, { color: ADDED_TEXT[scheme] }]}>{`+${additions.toLocaleString()}`}</Text>
      )}
      {hideZero && deletions === 0 ? null : (
        <Text style={[stat, { color: palette.danger[scheme] }]}>{`−${deletions.toLocaleString()}`}</Text>
      )}
    </View>
  );
}

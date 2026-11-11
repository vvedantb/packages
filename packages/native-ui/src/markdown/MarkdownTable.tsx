import { useState, type ReactNode } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconCopy, IconMaximize, IconX } from "@tabler/icons-react-native";
import { ChatIconButton } from "../ai/icon-button";
import { withAlpha } from "../palette";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "../Sheet";
import { SheetRow } from "../SheetRow";
import { tokens } from "../tokens";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import {
  markdownTableColumnWidths,
  markdownTableText,
  type MarkdownTableData,
  type MarkdownTableFormat,
} from "./tableText";

/**
 * Web `.markdown table` and its Streamdown wrapper: text at 0.93em with
 * line-height 1.5, cells `0.45rem 0.75rem`, header cells semibold, rows split
 * by the border at 70% (the header's in the full border), the table 0.65rem
 * inside the code-block panel (padding `0.25rem 0.3rem 0.4rem`), below the
 * row of table actions (`flex justify-end gap-1`, 24 buttons, then `gap-2`).
 */
export const MARKDOWN_TABLE = {
  fontScale: 0.93,
  lineHeight: 1.5,
  cellPaddingX: 12,
  cellPaddingY: 7,
  panelPadding: { top: 4, x: 5, bottom: 6 },
  tableMargin: 10,
  /** The web action row: 24 buttons in a 27 row. */
  actionsHeight: 27,
  /**
   * The web buttons sit 4 apart; here 16, so each slops to 44 without
   * taking its neighbour's taps.
   */
  actionsGap: 16,
} as const;

/**
 * The full-screen table sizes each column to its text, as the web table does
 * (`markdownTableColumnWidths`). 8.5 a character fits the 12 mono of inline
 * code with its chip padding, so a code cell does not wrap; body text is narrower.
 */
const FULL_SCREEN_COLUMN = { charWidth: 8.5, min: 72, max: 320 } as const;

/** The web Copy table menu, in its order. */
const COPY_FORMATS: ReadonlyArray<{ format: MarkdownTableFormat; title: string }> = [
  { format: "markdown", title: "Markdown" },
  { format: "csv", title: "CSV" },
  { format: "tsv", title: "TSV" },
];

export type MarkdownTableProps = {
  /** Header cells, already styled. */
  header: ReactNode[];
  /** Body rows of cells, already styled. */
  rows: ReactNode[][];
  /** The same cells as plain text, for copying and for the full-screen column widths. */
  data: MarkdownTableData;
  /** The cell text colour. */
  color: string;
  /** With it, a Copy table button: a sheet of the web formats (Markdown, CSV, TSV). */
  onCopy?: (text: string) => void | Promise<void>;
};

/**
 * The cells as rows. `widths` gives every column its own width (the
 * full-screen view, which scrolls sideways); without it the columns share the
 * width equally and the cells wrap, so they line up in a chat column.
 */
function TableRows({ header, rows, color, widths }: Pick<MarkdownTableProps, "header" | "rows" | "color"> & { widths?: number[] }) {
  const scheme = useScheme();
  const { cellPaddingX, cellPaddingY } = MARKDOWN_TABLE;
  // The header row is ruled off in the border colour, body rows at 70%.
  const rule = (index: number) => (index === 1 ? tokens.color.border[scheme] : withAlpha(tokens.color.border[scheme], 0.7));
  const row = (cells: ReactNode[], index: number) => (
    <View key={index} style={{ flexDirection: "row", borderTopWidth: index > 0 ? 1 : 0, borderTopColor: rule(index) }}>
      {cells.map((cell, cellIndex) => (
        <View
          key={cellIndex}
          style={[{ paddingHorizontal: cellPaddingX, paddingVertical: cellPaddingY }, widths ? { width: widths[cellIndex] } : { flex: 1 }]}
        >
          <Text style={{ color }}>{cell}</Text>
        </View>
      ))}
    </View>
  );
  return (
    <>
      {row(header, 0)}
      {rows.map((cells, index) => row(cells, index + 1))}
    </>
  );
}

/**
 * A markdown table on the web's panel, with the web table actions a phone
 * can use: Copy table (a sheet of Markdown, CSV and TSV, as the web menu)
 * and View fullscreen (the table at its own column widths, scrolling
 * sideways, for a table too wide for the chat). The web's Download table is
 * left out: a phone saves a file through a share sheet, which native-ui does
 * not bundle, and the copy formats carry the same text.
 */
export function MarkdownTable({ header, rows, data, color, onCopy }: MarkdownTableProps) {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [copyOpen, setCopyOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const { panelPadding, tableMargin, actionsHeight, actionsGap } = MARKDOWN_TABLE;
  const muted = tokens.color.muted[scheme];
  const panel = {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surfaceSecondary[scheme],
    paddingTop: panelPadding.top,
    paddingHorizontal: panelPadding.x,
    paddingBottom: panelPadding.bottom,
  };
  const copy = async (format: MarkdownTableFormat) => {
    setCopyOpen(false);
    await onCopy?.(markdownTableText(data, format));
  };
  const copyButton = onCopy ? (
    <ChatIconButton icon={IconCopy} label="Copy table" size="xs" iconColor={muted} onPress={() => setCopyOpen(true)} />
  ) : null;
  const widths = markdownTableColumnWidths(data, { ...FULL_SCREEN_COLUMN, padding: MARKDOWN_TABLE.cellPaddingX * 2 });
  return (
    <View style={panel}>
      <View className="flex-row items-center justify-end" style={{ height: actionsHeight, gap: actionsGap }}>
        {copyButton}
        <ChatIconButton icon={IconMaximize} label="View fullscreen" size="xs" iconColor={muted} onPress={() => setFullScreen(true)} />
      </View>
      <View style={{ marginTop: tableMargin, marginBottom: tableMargin }}>
        <TableRows header={header} rows={rows} color={color} />
      </View>
      {onCopy ? (
        <Sheet open={copyOpen} onOpenChange={setCopyOpen}>
          <SheetContent className="gap-3 px-3">
            <SheetHeader className="px-2">
              <SheetTitle>Copy table</SheetTitle>
            </SheetHeader>
            <SheetBody contentContainerClassName="gap-3">
              {COPY_FORMATS.map(({ format, title }) => (
                <SheetRow key={format} title={title} onPress={() => void copy(format)} />
              ))}
            </SheetBody>
          </SheetContent>
        </Sheet>
      ) : null}
      <Modal
        visible={fullScreen}
        animationType={reduceMotion ? "none" : "fade"}
        statusBarTranslucent
        onRequestClose={() => setFullScreen(false)}
      >
        <View
          className="flex-1"
          accessibilityViewIsModal
          style={{
            backgroundColor: tokens.color.background[scheme],
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        >
          {/* Web: the actions top right, Exit fullscreen last. */}
          <View className="flex-row items-center justify-end px-2 py-1.5" style={{ gap: actionsGap }}>
            {copyButton}
            <ChatIconButton icon={IconX} label="Exit fullscreen" iconColor={muted} onPress={() => setFullScreen(false)} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
              <View style={panel}>
                <View style={{ marginVertical: tableMargin }}>
                  <TableRows header={header} rows={rows} color={color} widths={widths} />
                </View>
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

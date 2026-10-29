import { Text, View } from "react-native";
import { cn } from "./cn";
import { cardStyle, sizeStyle, textStyle, typeStyle } from "./controlStyles";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export type StatGridItem = { label: string; value: string; testID?: string };

export type StatGridProps = {
  items: StatGridItem[];
  /** Tiles per row. Default 2. */
  columns?: 2 | 3;
  testID?: string;
};

/** `items` in rows of `columns`. The last row is padded with `null`, so every tile has the same width. */
export function statGridRows<T>(items: T[], columns: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let start = 0; start < items.length; start += columns) {
    const row: (T | null)[] = items.slice(start, start + columns);
    while (row.length < columns) row.push(null);
    rows.push(row);
  }
  return rows;
}

/**
 * Label and value tiles in rows of 2 or 3, each the flat web card
 * (`cardStyle`: `surfaceCard` fill, radius 16, no shadow) with the web
 * `Surface` padding (`p-4`). The label is muted `text-sm`; the value is
 * semibold `text-xl` in the foreground, with tabular figures. VoiceOver and
 * TalkBack read each tile as one element: "Steps, 8,432".
 */
export function StatGrid({ items, columns = 2, testID }: StatGridProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  if (items.length === 0) return null;
  const labelSize = largerText ? "text-base" : "text-sm";
  const valueSize = largerText ? "text-2xl" : "text-xl";
  return (
    <View testID={testID} className="gap-3">
      {statGridRows(items, columns).map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-3">
          {row.map((item, index) =>
            item ? (
              <View
                key={index}
                testID={item.testID}
                accessible
                accessibilityLabel={`${item.label}, ${item.value}`}
                className="min-w-0 flex-1 gap-1 p-4"
                style={cardStyle(scheme)}
              >
                <Text
                  className={cn("font-instrument-sans", labelSize)}
                  style={[textStyle("muted", scheme), sizeStyle(labelSize)]}
                >
                  {item.label}
                </Text>
                <Text
                  className={cn("font-instrument-sans-semibold", valueSize)}
                  style={[
                    textStyle("foreground", scheme),
                    sizeStyle(valueSize, "tight"),
                    typeStyle("semibold"),
                    { fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {item.value}
                </Text>
              </View>
            ) : (
              <View key={index} className="flex-1" />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

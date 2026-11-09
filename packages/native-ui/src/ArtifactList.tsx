import type { ReactNode } from "react";
import { View } from "react-native";
import { DividedList } from "./DividedList";
import { ListRow } from "./ListRow";

export type ArtifactRow = { id: string; title: string; description?: string };

export type ArtifactListProps = {
  rows: ArtifactRow[];
  /** Called with the `id` of the pressed row. */
  onOpen: (id: string) => void;
  /** Shown when `rows` is empty, such as an `EmptyState`. Nothing without it. */
  empty?: ReactNode;
  className?: string;
  testID?: string;
};

/**
 * Artifacts as pressable `ListRow`s under hairlines (`DividedList`): the title
 * and an optional description line. A row is a button named by its title.
 * `empty` stands in for an empty list.
 */
export function ArtifactList({ rows, onOpen, empty, className, testID }: ArtifactListProps) {
  if (rows.length === 0) return empty != null ? <View testID={testID}>{empty}</View> : null;
  return (
    <DividedList className={className} testID={testID}>
      {rows.map((row) => (
        <ListRow
          key={row.id}
          testID={`artifact-${row.id}`}
          title={row.title}
          meta={row.description}
          onPress={() => onOpen(row.id)}
        />
      ))}
    </DividedList>
  );
}

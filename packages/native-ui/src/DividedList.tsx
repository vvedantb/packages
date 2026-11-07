import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type DividedListProps = ViewProps & {
  children: ReactNode;
  /** Left inset of each divider, to start it under the row text. Default 0 (edge to edge). */
  inset?: number;
  className?: string;
};

/**
 * Flat rows with a hairline between each pair, as the web `divide-y
 * divide-border` lists (Eva's inbox rows). Rows keep their own padding; the
 * list draws no fill, radius or outer border. `null` children are skipped, so
 * no divider is left hanging.
 */
export function DividedList({ children, inset = 0, className, style, ...props }: DividedListProps) {
  const scheme = useScheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View className={className} style={style} {...props}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? (
            <View
              accessible={false}
              style={{ height: 1, marginLeft: inset, backgroundColor: tokens.color.border[scheme] }}
            />
          ) : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

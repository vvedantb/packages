import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { palette, withAlpha } from "./palette";
import { useScheme } from "./useScheme";

/** One round toggle: its key, its screen-reader label, its content (an emoji `Text` or an icon) and whether it is on. */
export type ReactionRowItem = {
  key: string;
  label: string;
  selected?: boolean;
  /** The content, given whether it is on, so an icon can switch to its filled form or colour. */
  render: (selected: boolean) => ReactNode;
};

export type ReactionRowProps = {
  items: readonly ReactionRowItem[];
  onPress: (key: string) => void;
  /**
   * How an item that is on looks. `"tint"` (default): the primary at 12%,
   * for emoji, which a dark fill would hide. `"solid"`: the primary fill,
   * for icons, whose colour the caller sets with `render`.
   */
  selectedStyle?: "tint" | "solid";
  /** `"spread"` (default) shares the width, as a reaction bar; `"start"` packs them at the start. */
  layout?: "spread" | "start";
  /** After the items: a round button with the same look, such as "More reactions". */
  trailing?: { label: string; icon: ReactNode; onPress: () => void };
};

/**
 * The quick reactions at the top of a hold menu (`MenuSheet`): round 44
 * toggles, each one on or off. Emoji reactions use the tint, a reply's
 * thumbs the solid fill.
 */
export function ReactionRow({ items, onPress, selectedStyle = "tint", layout = "spread", trailing }: ReactionRowProps) {
  const scheme = useScheme();
  const fill = (selected: boolean) =>
    !selected ? palette.default[scheme] : selectedStyle === "solid" ? palette.primary[scheme] : withAlpha(palette.primary[scheme], 0.12);
  return (
    <View className={layout === "spread" ? "flex-row justify-between px-2 pb-2" : "flex-row gap-3 px-4 py-2"}>
      {items.map((item) => {
        const selected = item.selected === true;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => onPress(item.key)}
            className="size-11 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: fill(selected) }}
          >
            {item.render(selected)}
          </Pressable>
        );
      })}
      {trailing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={trailing.label}
          onPress={trailing.onPress}
          className="size-11 items-center justify-center rounded-full active:opacity-70"
          style={{ backgroundColor: fill(false) }}
        >
          {trailing.icon}
        </Pressable>
      ) : null}
    </View>
  );
}

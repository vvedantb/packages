import { Pressable, View } from "react-native";
import { MIN_TOUCH_TARGET } from "./controlStyles";
import { palette, withAlpha } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type PageIndicatorProps = {
  count: number;
  /** The current page, from 0. */
  index: number;
  /** Makes each dot a button that calls this with its page. */
  onChange?: (index: number) => void;
  testID?: string;
};

/** Dot sizes: the web `CarouselDots` (`h-1.5`, active `w-4`, `gap-1.5`), a step up with larger text. */
export function pageDotSize(largerText: boolean) {
  return largerText
    ? { height: 8, active: 20, gap: 8 }
    : { height: 6, active: 16, gap: 6 };
}

/**
 * Page dots, as the web `CarouselDots`: the current page is a wider dot in
 * `palette.primary`, the others muted at 30%. Nothing for a single page.
 * Without `onChange` it is one element that reads "Page 2 of 5". With it each
 * dot is a 44 button named "Page 2 of 5", `selected` on the current page; the
 * dots then sit 44 apart, so each has a whole target.
 */
export function PageIndicator({ count, index, onChange, testID }: PageIndicatorProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  if (count <= 1) return null;
  const current = Math.min(Math.max(index, 0), count - 1);
  const size = pageDotSize(largerText);
  const pageLabel = (page: number) => `Page ${page + 1} of ${count}`;
  const dot = (page: number) => {
    const selected = page === current;
    return (
      <View
        key={page}
        style={{
          height: size.height,
          width: selected ? size.active : size.height,
          borderRadius: size.height / 2,
          backgroundColor: selected
            ? palette.primary[scheme]
            : withAlpha(tokens.color.muted[scheme], 0.3),
        }}
      />
    );
  };
  const pages = Array.from({ length: count }, (_, page) => page);

  if (!onChange) {
    return (
      <View
        testID={testID}
        accessible
        accessibilityLabel={pageLabel(current)}
        className="flex-row items-center justify-center"
        style={{ gap: size.gap }}
      >
        {pages.map((page) => dot(page))}
      </View>
    );
  }
  return (
    <View testID={testID} className="flex-row items-center justify-center">
      {pages.map((page) => (
        <Pressable
          key={page}
          testID={testID ? `${testID}-${page}` : undefined}
          accessibilityRole="button"
          accessibilityLabel={pageLabel(page)}
          accessibilityState={{ selected: page === current }}
          onPress={() => onChange(page)}
          className="items-center justify-center active:opacity-70"
          style={{ minWidth: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
        >
          {dot(page)}
        </Pressable>
      ))}
    </View>
  );
}

import { Children, useEffect, type ReactNode } from "react";
import { BackHandler, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, sizeStyle, textStyle, touchSlop, typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";

/**
 * The web panel picker height (`computePanelPopupPlacement`): at most 340 and
 * at least 160, here a share of the window, as a phone has the keyboard up.
 */
export const PROMPT_INPUT_MENU = { maxHeight: 340, minHeight: 160, windowShare: 0.35 } as const;

/** Menu height for a window height: the share, kept inside the web's 160 to 340. */
export function promptInputMenuHeight(windowHeight: number): number {
  return Math.round(
    Math.max(PROMPT_INPUT_MENU.minHeight, Math.min(PROMPT_INPUT_MENU.maxHeight, windowHeight * PROMPT_INPUT_MENU.windowShare)),
  );
}

export type PromptInputMenuProps = {
  /** Names the list for VoiceOver and TalkBack, as the web listbox `aria-label` (such as "Mentions" or "Skills"). */
  title: string;
  /** `PromptInputMenuItem`s. With none, `empty` shows instead. */
  children?: ReactNode;
  /** Shown when there are no rows. Default "No matches.", as the web. */
  empty?: ReactNode;
  /**
   * Closes the picker, as Escape does on the web. Android back calls it while
   * the picker is mounted, before the screen behind gets the press.
   */
  onDismiss?: () => void;
  testID?: string;
};

/**
 * The web `@` / `/` picker (`MentionPickerPopup`, `panel` layout) for touch:
 * the composer's full width, docked right above the field, so it rides the
 * keyboard with it. Give it to `PromptInput` as `menu`. The popover surface
 * (`rounded-surface bg-popover`, the field border in place of the web shadow
 * ring, as the AI parts draw no shadow) holds a `py-1` list that scrolls past
 * `promptInputMenuHeight`. Taps reach a row while the keyboard
 * is up, so picking never drops the keyboard.
 */
export function PromptInputMenu({ title, children, empty = "No matches.", onDismiss, testID }: PromptInputMenuProps) {
  const scheme = useScheme();
  // Back closes the picker first. An effect: the subscription is a native one.
  useEffect(() => {
    if (!onDismiss) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onDismiss();
      return true;
    });
    return () => subscription.remove();
  }, [onDismiss]);
  const { height } = useWindowDimensions();
  const hasRows = Children.toArray(children).length > 0;
  return (
    <View
      testID={testID}
      className="overflow-hidden border"
      style={{
        backgroundColor: palette.overlay[scheme],
        borderColor: tokens.color.border[scheme],
        borderRadius: tokens.radius.lg,
        maxHeight: promptInputMenuHeight(height),
      }}
    >
      {hasRows ? (
        <ScrollView
          accessibilityRole="list"
          accessibilityLabel={title}
          keyboardShouldPersistTaps="always"
          contentContainerClassName="py-1"
        >
          {children}
        </ScrollView>
      ) : (
        // Web: `px-3 py-2.5 text-xs leading-relaxed text-muted-foreground`.
        <Text
          className="px-3 py-2.5 font-instrument-sans text-xs"
          style={[sizeStyle("text-xs", "relaxed"), textStyle("muted", scheme)]}
        >
          {empty}
        </Text>
      )}
    </View>
  );
}

/** Web badge chip: `rounded-md bg-muted px-1.5 py-0.5 text-3xs font-medium` (10). */
const BADGE_TEXT = { fontSize: 10, lineHeight: 12 } as const;

export type PromptInputMenuItemProps = {
  /** The character that inserts this row, muted before the label: `@` or `/`. Left out when `leading` names a person. */
  prefix?: string;
  label: string;
  /** One muted line under the label, such as a skill's description. */
  description?: string;
  /** Before the text, such as a teammate's `Avatar` (24). */
  leading?: ReactNode;
  /** At the end in place of `badge`, such as a 16 kind icon. */
  trailing?: ReactNode;
  /** A small source chip at the end (such as "Eva" or "Claude"), with an optional 11 `badgeIcon`. */
  badge?: string;
  badgeIcon?: ReactNode;
  /** The row Return picks, tinted as the web's keyboard-selected row. */
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
};

/** A description longer than this is cut with "…", as the web `previewOneLine`. */
const DESCRIPTION_MAX = 72;

function oneLine(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length <= DESCRIPTION_MAX ? line : `${line.slice(0, DESCRIPTION_MAX - 1)}…`;
}

/**
 * One picker row, the web `MentionRow` in its option button
 * (`mx-1 rounded-lg px-2 text-sm`), at least 44 high. `selected` takes the
 * web `bg-primary/15` (`/25` dark) and a medium label; a press fades to 70%,
 * as the composer chips, in place of the web hover fill.
 */
export function PromptInputMenuItem({
  prefix,
  label,
  description,
  leading,
  trailing,
  badge,
  badgeIcon,
  selected = false,
  onPress,
  testID,
}: PromptInputMenuItemProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const muted = textStyle("muted", scheme);
  const labelSize = sizeStyle(largerText ? "text-lg" : "text-sm");
  const detail = description ? oneLine(description) : undefined;
  const end =
    trailing ??
    (badge ? (
      <View
        className="shrink-0 flex-row items-center gap-1 px-1.5 py-0.5"
        style={{ backgroundColor: tokens.color.surfaceSecondary[scheme], borderRadius: 6 }}
      >
        {badgeIcon}
        <Text className="font-instrument-sans-medium" style={[BADGE_TEXT, muted, typeStyle("medium")]}>
          {badge}
        </Text>
      </View>
    ) : null);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[`${prefix ?? ""}${label}`, detail, badge].filter(Boolean).join(", ")}
      onPress={onPress}
      // Already 44 high and the list's width: no slop past the row.
      hitSlop={touchSlop(MIN_TOUCH_TARGET)}
      // A plain style: NativeWind drops a function `style` beside `className`.
      className={cn("mx-1 flex-row items-center gap-2 px-2 py-1.5 active:opacity-70", largerText && "py-2")}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        borderRadius: 8,
        backgroundColor: selected ? withAlpha(palette.primary[scheme], scheme === "dark" ? 0.25 : 0.15) : "transparent",
      }}
    >
      {leading}
      <View className="min-w-0 flex-1 gap-0.5">
        <View className="min-w-0 flex-row items-center gap-1.5">
          <Text
            numberOfLines={1}
            className={cn("min-w-0 flex-1", selected ? "font-instrument-sans-medium" : "font-instrument-sans")}
            style={[labelSize, textStyle("foreground", scheme), selected ? typeStyle("medium") : null]}
          >
            {prefix ? <Text style={muted}>{prefix}</Text> : null}
            {label}
          </Text>
          {end}
        </View>
        {detail ? (
          <Text numberOfLines={1} className="font-instrument-sans text-xs" style={[sizeStyle("text-xs"), muted]}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

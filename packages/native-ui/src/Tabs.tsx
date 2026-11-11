import { Children, createContext, isValidElement, useContext, type ReactNode } from "react";
import { Pressable, View, type ViewProps } from "react-native";
import Animated, { type SharedValue } from "react-native-reanimated";
import { cn } from "./cn";
import {
  MIN_TOUCH_TARGET,
  tabColors,
  tabTrackStyle,
  tabTriggerSize,
  touchSlop,
  typeStyle,
  type TabsSize,
  type TabsVariant,
} from "./controlStyles";
import { selectionHaptic } from "./haptics";
import { useControllableState } from "./primitives/use-controllable-state";
import { useTabIndicator, useTabLabelStyle } from "./tabIndicator";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

/** `pills` (default): separate pills, the `PillTabs` look. `segmented`: one track with the active segment raised. `soft`: wrapping pills, the active one filled. `pills` and `segmented` are as wide as their tabs, at the start, as on the web. */
export type TabsListVariant = TabsVariant;

const TabsContext = createContext<{
  value: string;
  setValue: (value: string) => void;
} | null>(null);

const TabsListContext = createContext<{
  variant: TabsListVariant;
  size: TabsSize;
  progress?: SharedValue<number>;
  indicator?: ReturnType<typeof useTabIndicator>;
}>({ variant: "pills", size: "default" });

/** A trigger's place in its list, for the linked indicator and label colour. */
const TabIndexContext = createContext(0);

function useTabs(part: string) {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${part} must be inside Tabs.`);
  return context;
}

export type TabsProps = ViewProps & {
  /** Active tab when the parent controls it. */
  value?: string;
  /** Initial tab when `value` is not set. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

/** Composable tabs with the web part names (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`). For a flat options array use `PillTabs`. */
export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  className,
  ...props
}: TabsProps) {
  const [current, setValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <View className={cn("gap-3", className)} {...props} />
    </TabsContext.Provider>
  );
}

export type TabsListProps = ViewProps & {
  variant?: TabsListVariant;
  /** `sm` makes the triggers smaller. */
  size?: TabsSize;
  /**
   * Where a linked `Pager` is, in pages: the first trigger is page 0. With it,
   * as in `PillTabs`, the selected fill is one indicator that slides with the
   * pages and each label blends to the selected colour with it. The triggers
   * are the list's direct children, in page order.
   */
  progress?: SharedValue<number>;
  className?: string;
};

export function TabsList({
  variant = "pills",
  size = "default",
  progress,
  className,
  style,
  children,
  ...props
}: TabsListProps) {
  const scheme = useScheme();
  const triggers = Children.toArray(children);
  const indicator = useTabIndicator(progress, triggers.length);
  return (
    <TabsListContext.Provider value={{ variant, size, progress, indicator }}>
      <View
        accessibilityRole="tablist"
        className={cn(
          "flex-row",
          // The web lists: `segmented` and `pills` are `inline-flex` (as wide
          // as their tabs), `soft` a full-width row of centred, wrapping pills.
          // Pills wrap rather than run off a phone screen, except under a
          // linked indicator, which slides along one line.
          variant === "segmented"
            ? "max-w-full gap-[3px] self-start rounded-full p-[3px]"
            : variant === "soft"
              ? "flex-wrap items-center justify-center gap-1.5"
              : progress
                ? "max-w-full gap-1.5 self-start"
                : "max-w-full flex-wrap gap-1.5 self-start",
          className,
        )}
        style={variant === "segmented" ? [tabTrackStyle(scheme), style] : style}
        {...props}
      >
        {indicator.measured ? (
          // The selected fill under the triggers, as `PillTabs`.
          <Animated.View
            pointerEvents="none"
            style={[
              { position: "absolute", left: 0, borderRadius: 9999 },
              { backgroundColor: tabColors(variant, true, scheme).backgroundColor },
              indicator.style,
            ]}
          />
        ) : null}
        {triggers.map((trigger, index) => (
          <TabIndexContext.Provider key={isValidElement(trigger) && trigger.key !== null ? trigger.key : index} value={index}>
            {trigger}
          </TabIndexContext.Provider>
        ))}
      </View>
    </TabsListContext.Provider>
  );
}

export type TabsTriggerProps = {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  /**
   * The trigger height on screen, for an app whose web call site sizes its
   * list (a `h-8` list with `p-1` has 24-high triggers). Default: the web
   * `.t-tab` 30, or the larger-text size. The hit slop still reaches 44.
   */
  minHeight?: number;
  testID?: string;
  accessibilityLabel?: string;
};

export function TabsTrigger({
  value,
  children,
  disabled,
  className,
  minHeight,
  testID,
  accessibilityLabel,
}: TabsTriggerProps) {
  const { value: current, setValue } = useTabs("TabsTrigger");
  const { variant, size, progress, indicator } = useContext(TabsListContext);
  const index = useContext(TabIndexContext);
  const largerText = useLargerText();
  const scheme = useScheme();
  const selected = current === value;
  // Fill and label are styles from `tabColors`: apps' `bg-secondary` and
  // `bg-surface` can stay light in dark mode, under a light label.
  const colors = tabColors(variant, selected, scheme);
  const labelStyle = useTabLabelStyle(
    progress,
    index,
    { selected: tabColors(variant, true, scheme).color, muted: tabColors(variant, false, scheme).color },
    colors.color,
  );
  const trigger = tabTriggerSize(variant, size, largerText);
  const height = minHeight ?? trigger.minHeight;
  // The web `.t-tab` is `font-medium`; the soft trigger is regular.
  const medium = variant !== "soft";

  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === "string" ? children : undefined)
      }
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      // The trigger height on screen (the web 30 by default), a 44 target to touch.
      hitSlop={touchSlop(MIN_TOUCH_TARGET, height)}
      disabled={disabled}
      onPress={() => {
        if (selected) return;
        selectionHaptic();
        setValue(value);
      }}
      className={cn(
        "shrink items-center justify-center rounded-full",
        trigger.className,
        variant === "pills" && "border border-white/40 dark:border-white/10",
        disabled ? "opacity-50" : "active:opacity-70",
        className,
      )}
      // A plain object: NativeWind puts the class styles and `style` in an
      // array, where a `({ pressed }) => ...` style is dropped.
      // When linked and measured, the list's indicator draws the selected fill.
      style={{ backgroundColor: indicator?.measured ? "transparent" : colors.backgroundColor, minHeight: height }}
      onLayout={progress ? indicator?.onLayout(index) : undefined}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Animated.Text
          numberOfLines={1}
          className={cn(
            "text-center",
            medium ? "font-instrument-sans-medium" : "font-instrument-sans",
            trigger.textClassName,
          )}
          style={[{ letterSpacing: trigger.letterSpacing }, medium ? typeStyle("medium") : null, labelStyle]}
        >
          {children}
        </Animated.Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export type TabsContentProps = ViewProps & {
  value: string;
  className?: string;
};

/** Renders only while its tab is active. */
export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { value: current } = useTabs("TabsContent");
  if (current !== value) return null;
  return <View className={className} {...props} />;
}

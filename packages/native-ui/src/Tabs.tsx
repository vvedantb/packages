import { createContext, useContext, type ReactNode } from "react";
import { Pressable, Text, View, type ViewProps } from "react-native";
import { cn } from "./cn";
import { tabColors, tabTrackStyle, type TabsVariant } from "./controlStyles";
import { selectionHaptic } from "./haptics";
import { useControllableState } from "./primitives/use-controllable-state";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

/** `pills` (default): separate pills, the `PillTabs` look. `segmented`: one track with the active segment raised. `soft`: wrapping pills, the active one filled. */
export type TabsListVariant = TabsVariant;

const TabsContext = createContext<{
  value: string;
  setValue: (value: string) => void;
} | null>(null);

const TabsListContext = createContext<{
  variant: TabsListVariant;
  size: "default" | "sm";
}>({ variant: "pills", size: "default" });

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
  size?: "default" | "sm";
  className?: string;
};

export function TabsList({
  variant = "pills",
  size = "default",
  className,
  style,
  ...props
}: TabsListProps) {
  const scheme = useScheme();
  return (
    <TabsListContext.Provider value={{ variant, size }}>
      <View
        accessibilityRole="tablist"
        className={cn(
          "flex-row",
          variant === "segmented"
            ? "rounded-full border border-white/40 p-1 dark:border-white/10"
            : variant === "soft"
              ? "flex-wrap gap-2"
              : "gap-2",
          className,
        )}
        style={variant === "segmented" ? [tabTrackStyle(scheme), style] : style}
        {...props}
      />
    </TabsListContext.Provider>
  );
}

export type TabsTriggerProps = {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  testID?: string;
  accessibilityLabel?: string;
};

export function TabsTrigger({
  value,
  children,
  disabled,
  className,
  testID,
  accessibilityLabel,
}: TabsTriggerProps) {
  const { value: current, setValue } = useTabs("TabsTrigger");
  const { variant, size } = useContext(TabsListContext);
  const largerText = useLargerText();
  const scheme = useScheme();
  const selected = current === value;
  const small = size === "sm";
  // Fill and label are styles from `tabColors`: apps' `bg-secondary` and
  // `bg-surface` can stay light in dark mode, under a light label.
  const colors = tabColors(variant, selected, scheme);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === "string" ? children : undefined)
      }
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        if (selected) return;
        selectionHaptic();
        setValue(value);
      }}
      className={cn(
        "items-center justify-center rounded-full px-4",
        small
          ? largerText
            ? "min-h-12 py-2"
            : "min-h-10 py-1.5"
          : largerText
            ? "min-h-14 py-3"
            : "min-h-12 py-2",
        variant === "segmented" && "flex-1",
        variant === "pills" && "border border-white/40 dark:border-white/10",
        disabled ? "opacity-50" : "active:opacity-70",
        className,
      )}
      // A plain object: NativeWind puts the class styles and `style` in an
      // array, where a `({ pressed }) => ...` style is dropped.
      style={{ backgroundColor: colors.backgroundColor }}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          numberOfLines={1}
          className={cn(
            "text-center font-instrument-sans-semibold",
            small
              ? largerText
                ? "text-lg"
                : "text-base"
              : largerText
                ? "text-xl"
                : "text-lg",
          )}
          style={{ color: colors.color }}
        >
          {children}
        </Text>
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

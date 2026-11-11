import type { ComponentType, ReactNode } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconDots, IconX, type IconProps } from "@tabler/icons-react-native";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./DropdownMenu";
import { FloatingSurface } from "./FloatingSurface";
import { MIN_TOUCH_TARGET, sizeStyle, touchSlop, typeStyle } from "./controlStyles";
import { palette, withAlpha } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";
import { EASE_OUT } from "./motion";
import { NativeOnlyAnimatedView } from "./primitives/native-only-animated-view";

/**
 * One control in the bar, as the web `BulkBarAction`. Each action carries the
 * handler it runs, so confirm dialogs stay with the caller.
 */
export interface BulkBarAction {
  key: string;
  /** Full label: the More menu item and the accessible name. */
  label: string;
  /** Shorter label shown in the bar on wide screens (defaults to `label`). */
  shortLabel?: string;
  /** A Tabler icon, drawn at 17 in the button colour. */
  icon: ComponentType<IconProps>;
  /** Label and icon in the danger colour. */
  destructive?: boolean;
  /** The web Alt-to-skip hint. No effect on a phone (no Alt key). */
  showSkipHint?: boolean;
  /** Native only: turns this action off even with a selection. */
  disabled?: boolean;
  onClick: () => void;
}

export interface BulkActionBarProps {
  isSelecting: boolean;
  selectedCount: number;
  totalCount: number;
  onExitSelect: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  primaryActions: ReadonlyArray<BulkBarAction>;
  /** Behind a More (dots) button, in a `DropdownMenu`. */
  moreActions?: ReadonlyArray<BulkBarAction>;
  /** On the right, after a divider. */
  destructiveAction?: BulkBarAction;
  /** The web motion key. Here the bar's `testID`. */
  barKey?: string;
  /**
   * Space under the bar, in points, before its 12 gap. Default: the bottom
   * safe-area inset. Above a `FloatingTabBar`, pass
   * `tabBarReserve(largerText, insets.bottom)`.
   */
  bottomOffset?: number;
}

/** The web `sm` breakpoint: below it, bar buttons are icon-only and "selected" is hidden. */
export const BULK_BAR_LABEL_MIN_WIDTH = 640;

/** Web `h-9` buttons with a 17 icon and `text-sm`; with larger text 48 high, a 22 icon and `text-lg`. */
function barMetrics(largerText: boolean) {
  return largerText
    ? { height: 48, icon: 22, text: sizeStyle("text-lg"), caption: sizeStyle("text-base") }
    : { height: 36, icon: 17, text: sizeStyle("text-sm"), caption: sizeStyle("text-xs") };
}

// Docked at the bottom: it rises into place and sinks back out, the exit 20%
// quicker.
const BAR_ENTER = FadeInDown.duration(150).easing(EASE_OUT);
const BAR_EXIT = FadeOutDown.duration(120).easing(EASE_OUT);

/**
 * The floating selection bar, as the web `BulkActionBar`: a pill-ended glass
 * bar (`FloatingSurface`, radius 16, `px-2.5 py-2`, `gap-1`) centred at the
 * bottom of its container, 12 above `bottomOffset`. It holds the selected
 * count chip, Select all (n) / Clear, a divider, the primary actions, a More
 * menu, the destructive action, and Cancel selection (X). Actions are off with
 * no selection. Below 640 wide (the web `sm`) the actions are icon-only. Put it
 * last in a full-size container; it scrolls sideways when it does not fit.
 */
export function BulkActionBar({
  isSelecting,
  selectedCount,
  totalCount,
  onExitSelect,
  onSelectAll,
  onClearSelection,
  primaryActions,
  moreActions,
  destructiveAction,
  barKey,
  bottomOffset,
}: BulkActionBarProps) {
  const scheme = useScheme();
  const metrics = barMetrics(useLargerText());
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  if (!isSelecting) return null;
  const wide = width >= BULK_BAR_LABEL_MIN_WIDTH;
  const hasSelection = selectedCount > 0;
  const allSelected = totalCount > 0 && selectedCount >= totalCount;
  const muted = tokens.color.muted[scheme];

  return (
    <NativeOnlyAnimatedView
      testID={barKey}
      pointerEvents="box-none"
      entering={BAR_ENTER}
      exiting={BAR_EXIT}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 12 + (bottomOffset ?? insets.bottom),
        alignItems: "center",
        paddingHorizontal: 16,
      }}
    >
      <FloatingSurface radius={tokens.radius.lg} style={{ maxWidth: width - 32 }}>
        <ScrollView
          horizontal
          bounces={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8 }}
        >
          <View
            accessible
            accessibilityLabel={`${selectedCount} selected`}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 2 }}
          >
            <View
              style={{
                borderRadius: tokens.radius.md,
                paddingHorizontal: 8,
                paddingVertical: 2,
                backgroundColor: tokens.color.surfaceSecondary[scheme],
              }}
            >
              <Text
                className="font-instrument-sans-semibold"
                style={[metrics.caption, typeStyle("semibold"), { fontVariant: ["tabular-nums"], color: tokens.color.foreground[scheme] }]}
              >
                {selectedCount}
              </Text>
            </View>
            {wide ? (
              <Text className="font-instrument-sans-medium" style={[metrics.text, typeStyle("medium"), { color: muted }]}>
                selected
              </Text>
            ) : null}
          </View>

          {totalCount > 0 ? (
            <BarPressable height={metrics.height} paddingX={8} onPress={allSelected ? onClearSelection : onSelectAll}>
              <Text className="font-instrument-sans-medium" style={[metrics.text, typeStyle("medium"), { color: muted }]}>
                {allSelected ? "Clear" : `Select all (${totalCount})`}
              </Text>
            </BarPressable>
          ) : null}

          <BarDivider />

          {primaryActions.map((action) => (
            <BarButton key={action.key} action={action} disabled={!hasSelection} wide={wide} />
          ))}

          {moreActions && moreActions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                accessibilityLabel="More actions"
                disabled={!hasSelection}
                hitSlop={touchSlop(MIN_TOUCH_TARGET, metrics.height)}
                style={({ pressed }) => barButtonStyle(metrics.height, 0, pressed, !hasSelection, false, scheme)}
              >
                <IconDots size={metrics.icon} color={muted} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                {moreActions.map((action) => (
                  <DropdownMenuItem
                    key={action.key}
                    icon={action.icon}
                    destructive={action.destructive}
                    disabled={!hasSelection || Boolean(action.disabled)}
                    onSelect={action.onClick}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {destructiveAction ? (
            <>
              <BarDivider />
              <BarButton action={destructiveAction} disabled={!hasSelection} wide={wide} />
            </>
          ) : null}

          <BarDivider />

          <BarPressable height={metrics.height} paddingX={0} label="Cancel selection" onPress={onExitSelect}>
            <IconX size={metrics.icon} color={muted} />
          </BarPressable>
        </ScrollView>
      </FloatingSurface>
    </NativeOnlyAnimatedView>
  );
}

/**
 * A bar button box: the web `h-9 rounded-lg`, at least 44 wide and slopped to
 * 44 high, `surface-secondary` while pressed (a 10% danger tint for a
 * destructive one), faded to 30% when off.
 */
function barButtonStyle(
  height: number,
  paddingX: number,
  pressed: boolean,
  disabled: boolean,
  destructive: boolean,
  scheme: "light" | "dark",
): ViewStyle {
  const pressedFill = destructive ? withAlpha(palette.danger[scheme], 0.1) : tokens.color.surfaceSecondary[scheme];
  return {
    height,
    minWidth: MIN_TOUCH_TARGET,
    paddingHorizontal: paddingX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: tokens.radius.lg,
    backgroundColor: pressed && !disabled ? pressedFill : "transparent",
    opacity: disabled ? 0.3 : 1,
  };
}

function BarPressable({
  height,
  paddingX,
  label,
  disabled = false,
  destructive = false,
  onPress,
  children,
}: {
  height: number;
  paddingX: number;
  label?: string;
  disabled?: boolean;
  destructive?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const scheme = useScheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={touchSlop(MIN_TOUCH_TARGET, height)}
      onPress={onPress}
      style={({ pressed }) => barButtonStyle(height, paddingX, pressed, disabled, destructive, scheme)}
    >
      {children}
    </Pressable>
  );
}

/** One action: the icon, and on wide screens the short label (`text-sm` medium). */
function BarButton({ action, disabled, wide }: { action: BulkBarAction; disabled: boolean; wide: boolean }) {
  const scheme = useScheme();
  const metrics = barMetrics(useLargerText());
  const Icon = action.icon;
  const color = action.destructive ? palette.danger[scheme] : tokens.color.muted[scheme];
  return (
    <BarPressable
      height={metrics.height}
      paddingX={10}
      label={action.label}
      disabled={disabled || Boolean(action.disabled)}
      destructive={action.destructive}
      onPress={action.onClick}
    >
      <Icon size={metrics.icon} color={color} />
      {wide ? (
        <Text className="font-instrument-sans-medium" style={[metrics.text, typeStyle("medium"), { color }]}>
          {action.shortLabel ?? action.label}
        </Text>
      ) : null}
    </BarPressable>
  );
}

/** The web vertical `Separator`: `mx-1.5 h-5 bg-border`. */
function BarDivider() {
  const scheme = useScheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={{ width: 1, height: 20, marginHorizontal: 6, backgroundColor: tokens.color.border[scheme] }}
    />
  );
}

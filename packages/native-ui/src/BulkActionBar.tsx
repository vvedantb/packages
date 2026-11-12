import type { ComponentType, ReactNode } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconDots, IconX, type IconProps } from "@tabler/icons-react-native";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./DropdownMenu";
import { FloatingSurface } from "./FloatingSurface";
import { FLOATING_PILL_RADIUS, tabBarHeight, tabBarSlotStyle } from "./floating";
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
  /**
   * Shorter label shown in the bar on wide screens, and under the icon with
   * `placement="tabBar"` (defaults to `label`).
   */
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
   * `tabBarReserve(largerText, insets.bottom)`. Not used with
   * `placement="tabBar"`.
   */
  bottomOffset?: number;
  /**
   * Native only: keep Cancel selection (X) and its divider outside the
   * sideways scroll, at the bar's right end, so it shows even when the bar
   * is wider than the screen. The rest of the bar still scrolls. Default
   * `false`: the X scrolls with the actions, as the web.
   */
  pinCancel?: boolean;
  /**
   * Native only. `"float"` (default): the web bar, floating 12 above
   * `bottomOffset`. `"tabBar"`: the phone contextual bar, in the slot and
   * shape of `FloatingTabBar` (hide the tab bar while selecting, with
   * `tabBarStyle: { display: "none" }` on the screen). It shows up and
   * leaves at once, so the two bars swap with no gap. Each action is its
   * icon over its `shortLabel` (12, or 14 with larger text) in a box 48 high
   * (56 with larger text) that shares out the spare width. There is no count
   * chip: the screen header shows the count, as Android's contextual action
   * bar, and no dividers, as the tab bar. Cancel selection (X) is pinned, as
   * with `pinCancel`.
   */
  placement?: BulkBarPlacement;
}

export type BulkBarPlacement = "float" | "tabBar";

/** The web `sm` breakpoint: below it, bar buttons are icon-only and "selected" is hidden. */
export const BULK_BAR_LABEL_MIN_WIDTH = 640;

/**
 * Web `h-9` buttons with a 17 icon and `text-sm`; with larger text 48 high, a
 * 22 icon and `text-lg`. In the tab bar slot: 48 high with a 20 icon over a
 * `text-xs` label; with larger text 56, a 24 icon and `text-sm`. `caption` is
 * the count chip, or the label under a docked icon.
 */
function barMetrics(largerText: boolean, docked: boolean) {
  if (docked) {
    return largerText
      ? { height: 56, icon: 24, text: sizeStyle("text-lg"), caption: sizeStyle("text-sm") }
      : { height: 48, icon: 20, text: sizeStyle("text-sm"), caption: sizeStyle("text-xs") };
  }
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
 * last in a full-size container; it scrolls sideways when it does not fit
 * (with `pinCancel`, all but the X scrolls). `placement="tabBar"` docks it in
 * the tab bar's slot instead, with labelled 48 high actions.
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
  pinCancel = false,
  placement = "float",
}: BulkActionBarProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  if (!isSelecting) return null;
  const docked = placement === "tabBar";
  const metrics = barMetrics(largerText, docked);
  // Docked has no X to pin: the header holds it.
  const pinned = pinCancel && !docked;
  // Docked, every action shows its label (under the icon).
  const labelled = docked || width >= BULK_BAR_LABEL_MIN_WIDTH;
  const hasSelection = selectedCount > 0;
  const allSelected = totalCount > 0 && selectedCount >= totalCount;
  const muted = tokens.color.muted[scheme];
  // Docked, the screen's header carries the close X (Android's contextual
  // action bar), so the bar has none: one exit, and room for every label.
  const cancel = docked ? null : (
    <>
      <BarDivider />
      <BarPressable height={metrics.height} paddingX={0} docked={docked} label="Cancel selection" onPress={onExitSelect}>
        <IconX size={metrics.icon} color={muted} />
      </BarPressable>
    </>
  );

  return (
    <NativeOnlyAnimatedView
      testID={barKey}
      pointerEvents="box-none"
      // Docked, the bar swaps with the tab bar at once.
      entering={docked ? undefined : BAR_ENTER}
      exiting={docked ? undefined : BAR_EXIT}
      style={
        docked
          ? tabBarSlotStyle(insets)
          : {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 12 + (bottomOffset ?? insets.bottom),
              alignItems: "center",
              paddingHorizontal: 16,
            }
      }
    >
      <FloatingSurface
        radius={docked ? FLOATING_PILL_RADIUS : tokens.radius.lg}
        style={docked ? undefined : { maxWidth: width - 32 }}
      >
        {/* Docked: as high as the tab bar it stands in for. */}
        <View style={{ flexDirection: "row", alignItems: "center", height: docked ? tabBarHeight(largerText) : undefined }}>
          <ScrollView
            horizontal
            bounces={false}
            showsHorizontalScrollIndicator={false}
            // Pinned: the scroll gives up width first, and the X part keeps the right padding.
            style={pinned || docked ? { flexShrink: 1 } : undefined}
            contentContainerStyle={{
              // Docked, the actions grow to fill the bar, and it scrolls only when they do not fit.
              ...(docked ? { flexGrow: 1 } : null),
              flexDirection: "row",
              alignItems: "center",
              gap: docked ? 0 : 4,
              paddingLeft: docked ? 8 : 10,
              paddingRight: docked ? 8 : pinned ? 0 : 10,
              paddingVertical: docked ? 0 : 8,
            }}
          >
            {docked ? null : (
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
                {labelled ? (
                  <Text className="font-instrument-sans-medium" style={[metrics.text, typeStyle("medium"), { color: muted }]}>
                    selected
                  </Text>
                ) : null}
              </View>
            )}

            {totalCount > 0 ? (
              <BarPressable height={metrics.height} paddingX={8} docked={docked} onPress={allSelected ? onClearSelection : onSelectAll}>
                <Text className="font-instrument-sans-medium" style={[metrics.text, typeStyle("medium"), { color: muted }]}>
                  {allSelected ? "Clear" : `Select all (${totalCount})`}
                </Text>
              </BarPressable>
            ) : null}

            {docked ? null : <BarDivider />}

            {primaryActions.map((action) => (
              <BarButton key={action.key} action={action} disabled={!hasSelection} labelled={labelled} docked={docked} />
            ))}

            {moreActions && moreActions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  accessibilityLabel="More actions"
                  disabled={!hasSelection}
                  hitSlop={touchSlop(MIN_TOUCH_TARGET, metrics.height)}
                  style={({ pressed }) => barButtonStyle(metrics.height, 0, pressed, !hasSelection, false, docked, scheme)}
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
                {docked ? null : <BarDivider />}
                <BarButton action={destructiveAction} disabled={!hasSelection} labelled={labelled} docked={docked} />
              </>
            ) : null}

            {pinned ? null : cancel}
          </ScrollView>
          {pinned ? (
            // The scroll's 4 gap before the divider, then the bar's end padding.
            // Docked, as the tab bar: no dividers and no gaps, the boxes' own padding apart.
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: docked ? 0 : 4, paddingRight: docked ? 8 : 10 }}>
              {cancel}
            </View>
          ) : null}
        </View>
      </FloatingSurface>
    </NativeOnlyAnimatedView>
  );
}

/**
 * A bar button box: the web `h-9 rounded-lg`, at least 44 wide and slopped to
 * 44 high, `surface-secondary` while pressed (a 10% danger tint for a
 * destructive one), faded to 30% when off. Docked: a pill (as the tab bar's
 * active pill), at least 48 wide.
 */
function barButtonStyle(
  height: number,
  paddingX: number,
  pressed: boolean,
  disabled: boolean,
  destructive: boolean,
  docked: boolean,
  scheme: "light" | "dark",
): ViewStyle {
  const pressedFill = destructive ? withAlpha(palette.danger[scheme], 0.1) : tokens.color.surfaceSecondary[scheme];
  return {
    height,
    minWidth: docked ? 48 : MIN_TOUCH_TARGET,
    paddingHorizontal: paddingX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: docked ? FLOATING_PILL_RADIUS : tokens.radius.lg,
    backgroundColor: pressed && !disabled ? pressedFill : "transparent",
    opacity: disabled ? 0.3 : 1,
  };
}

function BarPressable({
  height,
  paddingX,
  docked,
  grow = false,
  label,
  disabled = false,
  destructive = false,
  onPress,
  children,
}: {
  height: number;
  paddingX: number;
  docked: boolean;
  /** Take a share of the bar's spare width (a docked action). */
  grow?: boolean;
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
      style={({ pressed }) => ({
        ...barButtonStyle(height, paddingX, pressed, disabled, destructive, docked, scheme),
        ...(grow ? { flexGrow: 1 } : null),
      })}
    >
      {children}
    </Pressable>
  );
}

/**
 * One action: the icon, and on wide screens the short label beside it
 * (`text-sm` medium). Docked, the short label sits under the icon (`caption`).
 */
function BarButton({
  action,
  disabled,
  labelled,
  docked,
}: {
  action: BulkBarAction;
  disabled: boolean;
  labelled: boolean;
  docked: boolean;
}) {
  const scheme = useScheme();
  const metrics = barMetrics(useLargerText(), docked);
  const Icon = action.icon;
  const color = action.destructive ? palette.danger[scheme] : tokens.color.muted[scheme];
  const shortLabel = action.shortLabel ?? action.label;
  if (docked) {
    return (
      <BarPressable
        height={metrics.height}
        paddingX={6}
        docked
        grow
        label={action.label}
        disabled={disabled || Boolean(action.disabled)}
        destructive={action.destructive}
        onPress={action.onClick}
      >
        <View style={{ alignItems: "center", gap: 2 }}>
          <Icon size={metrics.icon} color={color} />
          <Text numberOfLines={1} className="font-instrument-sans-medium" style={[metrics.caption, typeStyle("medium"), { color }]}>
            {shortLabel}
          </Text>
        </View>
      </BarPressable>
    );
  }
  return (
    <BarPressable
      height={metrics.height}
      paddingX={10}
      docked={false}
      label={action.label}
      disabled={disabled || Boolean(action.disabled)}
      destructive={action.destructive}
      onPress={action.onClick}
    >
      <Icon size={metrics.icon} color={color} />
      {labelled ? (
        <Text className="font-instrument-sans-medium" style={[metrics.text, typeStyle("medium"), { color }]}>
          {shortLabel}
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

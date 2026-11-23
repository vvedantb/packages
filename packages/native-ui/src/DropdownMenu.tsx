import * as Slot from "@rn-primitives/slot";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ComponentType,
  type ReactNode,
  type Ref,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PressableProps,
  type ViewProps,
} from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconCheck, type IconProps } from "@tabler/icons-react-native";
import { FloatingSurface } from "./FloatingSurface";
import { cn } from "./cn";
import { sizeStyle, typeStyle } from "./controlStyles";
import { selectionHaptic } from "./haptics";
import { PANEL_SCALE_FROM, POPOVER_ENTER, POPOVER_EXIT } from "./motion";
import { palette } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useReduceMotion } from "./useReduceMotion";
import { useScheme } from "./useScheme";
import { useControllableState } from "./primitives/use-controllable-state";
import { WindowLayer } from "./primitives/window-layer";

/**
 * Sizes from the web menu classes (`_menu-classes.ts`): content `min-w-[12rem]
 * p-1.5 rounded-lg`, `sideOffset` 4 and `collisionPadding` 8; items `px-2.5
 * py-3 rounded-menu-item` (8) with a 16 icon `gap-2`; radio items `pl-8` with
 * the check at `left-2.5`; the label `px-2.5 py-1.5`; the separator `-mx-1.5
 * my-1 h-px`. Items are at least 48 high, a phone menu row (the web
 * `max-sm:min-h-10` is 40).
 */
export const DROPDOWN_MENU = {
  minWidth: 192,
  padding: 6,
  radius: tokens.radius.lg,
  sideOffset: 4,
  edge: 8,
  itemHeight: 48,
  itemRadius: 8,
  itemPaddingX: 10,
  itemPaddingY: 12,
  itemGap: 8,
  indicatorInset: 32,
  indicatorLeft: 10,
  labelPaddingY: 6,
  separatorMargin: 4,
} as const;

/** A view's box in window coordinates, from `measureInWindow`. */
export type DropdownMenuRect = { x: number; y: number; width: number; height: number };

type MenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger: DropdownMenuRect | null;
  setTrigger: (rect: DropdownMenuRect) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenu(part: string): MenuContextValue {
  const context = useContext(MenuContext);
  if (!context) throw new Error(`${part} must be inside a DropdownMenu.`);
  return context;
}

export type DropdownMenuProps = {
  /** Open state when the parent controls it. */
  open?: boolean;
  /** Initial open state when `open` is not set. Default `false`. */
  defaultOpen?: boolean;
  /** Called with the next open state (trigger, item, outside tap, Android back). */
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

/**
 * A small menu anchored to its trigger, the native `DropdownMenu`: holds the
 * open state (controlled with `open` / `onOpenChange`, or `defaultOpen`) and
 * renders no view.
 */
export function DropdownMenu({ open, defaultOpen = false, onOpenChange, children }: DropdownMenuProps) {
  const [value, setValue] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const [trigger, setTrigger] = useState<DropdownMenuRect | null>(null);
  return (
    <MenuContext.Provider value={{ open: value, setOpen: setValue, trigger, setTrigger }}>
      {children}
    </MenuContext.Provider>
  );
}

export type DropdownMenuTriggerProps = PressableProps & {
  /**
   * Merge the press into the single child (for example a `Button` or
   * `IconButton`) instead of wrapping it. The child must pass `ref` on to its
   * native view, so the menu can measure it.
   */
  asChild?: boolean;
  /** Also receives the native view; the menu keeps its own handle. */
  ref?: Ref<ComponentRef<typeof View>>;
};

/** A measured box is usable when it has a size: Android reports 0, 0, 0, 0 for a view it has not laid out. */
export function isMeasuredRect(rect: DropdownMenuRect): boolean {
  return rect.width > 0 && rect.height > 0;
}

type Measurable = Pick<ComponentRef<typeof View>, "measureInWindow" | "measure">;

/** The wrapper shrink-wraps the trigger in a flex row (such as the PromptInput `leading` slot). */
const TRIGGER_HOST = { alignSelf: "flex-start" } as const;

/** Frames to wait for layout to settle, when a view reads empty. */
const MEASURE_RETRIES = 2;

type LayoutSize = { width: number; height: number };

/** Last-resort trigger size when a press has a touch point but no `onLayout` size and no style size: a 44 point touch target. */
const FALLBACK_SIZE: LayoutSize = { width: 44, height: 44 };

/** Numeric `width` and `height` of a plain style object, such as `{ width: 44, height: 44 }`; `undefined` for a function, array or missing size. */
export function sizeFromStyle(style: PressableProps["style"]): LayoutSize | undefined {
  if (!style || typeof style !== "object" || Array.isArray(style)) return undefined;
  if (!("width" in style) || !("height" in style)) return undefined;
  const { width, height } = style;
  if (typeof width !== "number" || typeof height !== "number") return undefined;
  return width > 0 && height > 0 ? { width, height } : undefined;
}

/**
 * The trigger's box from a press: the press point in window coordinates
 * (`pageX`, `pageY`) less its point in the view (`locationX`, `locationY`) is
 * the view's origin, and `size` is its laid-out size. `null` without a size or a usable touch point.
 */
export function triggerRectFromPress(
  event: { nativeEvent?: Partial<Record<"pageX" | "pageY" | "locationX" | "locationY", number>> } | null | undefined,
  size: LayoutSize | undefined,
): DropdownMenuRect | null {
  const point = event?.nativeEvent;
  if (!size || !point) return null;
  const { pageX, pageY, locationX, locationY } = point;
  if (
    typeof pageX !== "number" || !Number.isFinite(pageX) ||
    typeof pageY !== "number" || !Number.isFinite(pageY) ||
    typeof locationX !== "number" || !Number.isFinite(locationX) ||
    typeof locationY !== "number" || !Number.isFinite(locationY)
  ) {
    return null;
  }
  const rect = { x: pageX - locationX, y: pageY - locationY, width: size.width, height: size.height };
  return isMeasuredRect(rect) ? rect : null;
}

/**
 * The view's box in window coordinates, or `null` when it cannot be measured.
 * `measureInWindow` first; when it returns an empty box, `measure` (its
 * `pageX` and `pageY` are window coordinates too) as a second reading. When
 * both are empty, it tries again on the next frame, up to `retries` times: a
 * view under a keyboard-lifted or avoiding parent may not be laid out yet.
 */
export function measureAnchor(view: Measurable, done: (rect: DropdownMenuRect | null) => void, retries = MEASURE_RETRIES) {
  view.measureInWindow((x, y, width, height) => {
    const rect = { x, y, width, height };
    if (isMeasuredRect(rect)) return done(rect);
    view.measure((_x, _y, w, h, pageX, pageY) => {
      const second = { x: pageX, y: pageY, width: w, height: h };
      if (isMeasuredRect(second)) return done(second);
      if (retries <= 0) return done(null);
      requestAnimationFrame(() => measureAnchor(view, done, retries - 1));
    });
  });
}

/**
 * Opens the menu, or closes it when open. On press it measures its wrapper
 * (`measureInWindow`) and the menu opens under it. The wrapper is a
 * `collapsable={false}` view, so Android keeps a native view to measure. On
 * press, the box comes at once from the press point and a size (`onLayout`,
 * then a numeric `style` width and height, then 44), and the menu opens; a live
 * measure then refines it. When the press has no touch point and every measure
 * reads empty, the last good box is used. Reports `expanded`. A caller `ref` is
 * kept: it gets the wrapper, as the menu's own handle does.
 */
export function DropdownMenuTrigger({
  asChild,
  onPress,
  accessibilityState,
  ref: callerRef,
  style,
  ...props
}: DropdownMenuTriggerProps) {
  const { open, setOpen, setTrigger } = useMenu("DropdownMenuTrigger");
  const ref = useRef<ComponentRef<typeof View> | null>(null);
  // This trigger's last `onLayout` size and last good measured box, kept for when a live reading is empty.
  const layoutSizeRef = useRef<LayoutSize | undefined>(undefined);
  const lastRectRef = useRef<DropdownMenuRect | undefined>(undefined);
  const styleSize = sizeFromStyle(style);
  const Component = asChild ? Slot.Pressable : Pressable;
  return (
    <View
      ref={(view: ComponentRef<typeof View> | null) => {
        ref.current = view;
        if (typeof callerRef === "function") callerRef(view);
        else if (callerRef) callerRef.current = view;
      }}
      collapsable={false}
      accessible={false}
      style={styleSize ? { ...TRIGGER_HOST, ...styleSize } : TRIGGER_HOST}
      onLayout={(event: LayoutChangeEvent) => {
        const view = ref.current;
        if (!view) return;
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) layoutSizeRef.current = { width, height };
        measureAnchor(view, (rect) => {
          if (rect) lastRectRef.current = rect;
        });
      }}
    >
      <Component
        accessibilityRole="button"
        {...props}
        style={style}
        accessibilityState={{ ...accessibilityState, expanded: open }}
        onPress={(event: GestureResponderEvent) => {
          onPress?.(event);
          if (open) return setOpen(false);
          const view = ref.current;
          const size = layoutSizeRef.current ?? styleSize ?? FALLBACK_SIZE;
          const pressRect = triggerRectFromPress(event, size);
          // Anchor and open at once from the press, then refine from a live measure.
          if (pressRect) setTrigger(pressRect);
          setOpen(true);
          if (!view) return;
          measureAnchor(view, (rect) => {
            if (rect) {
              lastRectRef.current = rect;
              return setTrigger(rect);
            }
            if (!pressRect && lastRectRef.current) setTrigger(lastRectRef.current);
          });
        }}
      />
    </View>
  );
}

export type DropdownMenuAlign = "start" | "end";

export type DropdownMenuPosition = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  maxHeight: number;
};

/**
 * Where the menu goes: under the trigger, `sideOffset` away, its start edge on
 * the trigger's start (`"start"`) or its end edge on the trigger's end
 * (`"end"`), kept 8 inside the safe area. It flips above the trigger when its
 * content does not fit below and there is more room above; it then sets `top`
 * only, never `bottom`. Before the content
 * is measured (0), it flips only when less than one item row fits below. Without
 * a trigger box it sits at the top of the safe area.
 */
export function dropdownMenuPosition({
  trigger,
  window,
  insets,
  align,
  sideOffset = DROPDOWN_MENU.sideOffset,
  contentHeight,
}: {
  trigger: DropdownMenuRect | null;
  window: { width: number; height: number };
  insets: { top: number; bottom: number; left: number; right: number };
  align: DropdownMenuAlign;
  sideOffset?: number;
  contentHeight: number;
}): DropdownMenuPosition {
  const edge = DROPDOWN_MENU.edge;
  const minTop = insets.top + edge;
  const maxBottom = window.height - insets.bottom - edge;
  const minLeft = insets.left + edge;
  const minRight = insets.right + edge;
  if (!trigger) return { top: minTop, left: minLeft, maxHeight: maxBottom - minTop };
  const horizontal =
    align === "end"
      ? { right: Math.max(minRight, window.width - (trigger.x + trigger.width)) }
      : { left: Math.max(minLeft, trigger.x) };
  const below = trigger.y + trigger.height + sideOffset;
  const above = trigger.y - sideOffset;
  const roomBelow = maxBottom - below;
  const roomAbove = above - minTop;
  // Not measured yet (0): flip only when almost no room is below, so a bottom
  // trigger never gets a first layout with a tiny `maxHeight`.
  const tooTight = contentHeight > 0 ? contentHeight > roomBelow : roomBelow < DROPDOWN_MENU.itemHeight;
  if (tooTight && roomAbove > roomBelow) {
    // `top` only: `bottom` is ignored inside `WindowLayerHost` on Android. The menu's
    // bottom edge lands on `above`; before measure, a two-row estimate stands in.
    const height = contentHeight > 0 ? contentHeight : Math.min(roomAbove, DROPDOWN_MENU.itemHeight * 2 + DROPDOWN_MENU.padding * 2);
    return { ...horizontal, top: Math.max(minTop, above - height), maxHeight: roomAbove };
  }
  return { ...horizontal, top: below, maxHeight: roomBelow };
}

export type DropdownMenuContentProps = ViewProps & {
  /** Which trigger edge the menu lines up with. Default `"start"`. */
  align?: DropdownMenuAlign;
  /** Gap from the trigger. Default 4, as on the web. */
  sideOffset?: number;
  className?: string;
};

/**
 * The menu in a `WindowLayer` (in the app's window under `WindowLayerHost`, so
 * a chat under it keeps its place; else a transparent `Modal`): the opaque overlay surface of
 * `Dialog` and `Sheet` (`FloatingSurface` without blur, with the floating
 * shadow) at radius 16, at least 192 wide, `p-1.5`, scrolling when taller than
 * the room. A tap outside, Android back and the VoiceOver escape gesture close
 * it. The panel (not the backdrop) fades in and scales from 0.96 over 150 ms
 * once it is measured, from the corner nearest the trigger, and fades out in
 * 100 ms. With Reduce Motion on, it appears and leaves at once.
 */
export function DropdownMenuContent({
  align = "start",
  sideOffset,
  className,
  style,
  children,
  ...props
}: DropdownMenuContentProps) {
  const menu = useMenu("DropdownMenuContent");
  const { open, setOpen, trigger } = menu;
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  // `null` until the content is measured: only then is it known whether the
  // menu fits below the trigger or flips above, so it stays hidden till then.
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  // Up while open, and after a close until the panel has faded out.
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  if (!open && shown && reduceMotion) setShown(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  // The panel's motion, on the UI thread. At rest (1, 1) under Reduce Motion.
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : PANEL_SCALE_FROM);
  const measured = contentHeight !== null;
  const hide = () => {
    // Opened again in the moment the fade ended: stay up.
    if (openRef.current) return;
    setShown(false);
    setContentHeight(null);
    scale.set(PANEL_SCALE_FROM);
  };
  useEffect(() => {
    if (reduceMotion) {
      opacity.set(1);
      scale.set(1);
      return;
    }
    if (open) {
      if (!measured) return;
      opacity.set(withTiming(1, POPOVER_ENTER));
      scale.set(withTiming(1, POPOVER_ENTER));
    } else if (shown) {
      // A fade only: the scale stays where it is.
      opacity.set(
        withTiming(0, POPOVER_EXIT, (finished) => {
          "worklet";
          if (finished) runOnJS(hide)();
        }),
      );
    }
    // Only opening, measuring and closing start the motion.
  }, [open, measured, reduceMotion]);
  const panelStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));
  const close = () => setOpen(false);
  const position = dropdownMenuPosition({ trigger, window, insets, align, sideOffset, contentHeight: contentHeight ?? 0 });
  // The scale grows from the corner nearest the trigger: its edge on the
  // trigger's (`align`), and the top, or the bottom when the menu flipped above.
  const transformOrigin = `${align === "end" ? 100 : 0}% ${position.bottom === undefined ? 0 : 100}%`;
  if (!shown) return null;
  return (
    // The panel runs its own motion, so no fade; the items need the menu's
    // context, which a layer loses, so it is provided again.
    <WindowLayer onRequestClose={close} fade={false}>
      <MenuContext.Provider value={menu}>
      {/* A full-size host, as `OverlayModal` has: without it the backdrop and the
          menu are bare layer children with no box to size or hit-test against,
          and the menu can stack under tab bars and glass layers. */}
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Pressable
          testID="DropdownMenu-backdrop"
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityRole="menu"
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          // Leaving: a late tap on a row must not select twice.
          pointerEvents={open ? "auto" : "none"}
          style={{
            position: "absolute",
            // Every edge is set, `null` when unused, so React Native clears the one
            // a flip leaves behind instead of keeping a stale `top`.
            top: position.top ?? null,
            bottom: position.bottom ?? null,
            left: position.left ?? null,
            right: position.right ?? null,
            maxHeight: position.maxHeight,
            minWidth: DROPDOWN_MENU.minWidth,
            maxWidth: window.width - insets.left - insets.right - 2 * DROPDOWN_MENU.edge,
            opacity: contentHeight === null ? 0 : 1,
          }}
        >
          <Animated.View style={[{ transformOrigin }, panelStyle]}>
            <FloatingSurface blur={false} radius={DROPDOWN_MENU.radius} style={{ maxHeight: position.maxHeight }}>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={(_width, height) => setContentHeight(height)}
                contentContainerStyle={{ padding: DROPDOWN_MENU.padding }}
              >
                <View className={cn(className)} style={style} {...props}>
                  {children}
                </View>
              </ScrollView>
            </FloatingSurface>
          </Animated.View>
        </View>
      </View>
      </MenuContext.Provider>
    </WindowLayer>
  );
}

/** Item type and icon size: the web `text-sm` with a 16 icon in 48 rows, or `text-lg` with a 22 icon and 56 rows with larger text. */
function itemMetrics(largerText: boolean) {
  return largerText
    ? { text: sizeStyle("text-lg"), icon: 22, minHeight: 56 }
    : { text: sizeStyle("text-sm"), icon: 16, minHeight: DROPDOWN_MENU.itemHeight };
}

type MenuIcon = ComponentType<IconProps>;

type MenuItemBaseProps = Omit<PressableProps, "onPress" | "children" | "style"> & {
  children: ReactNode;
  /** Called on press. The menu then closes, unless `closeOnSelect` is `false`. */
  onSelect?: () => void;
  /** Default `true`. */
  closeOnSelect?: boolean;
  disabled?: boolean;
  className?: string;
};

function MenuRow({
  part,
  itemRole,
  checked,
  color,
  paddingLeft,
  leading,
  children,
  onSelect,
  closeOnSelect = true,
  disabled,
  className,
  accessibilityState,
  ...props
}: MenuItemBaseProps & {
  part: string;
  itemRole: "menuitem" | "radio";
  checked?: boolean;
  color: string;
  paddingLeft: number;
  leading: ReactNode;
}) {
  const { setOpen } = useMenu(part);
  const scheme = useScheme();
  const metrics = itemMetrics(useLargerText());
  return (
    <Pressable
      accessibilityRole={itemRole}
      {...props}
      disabled={disabled}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled), ...(checked === undefined ? null : { checked }) }}
      onPress={() => {
        // A new pick from a set ticks; a plain action and the current choice do not.
        if (checked === false) selectionHaptic();
        onSelect?.();
        if (closeOnSelect) setOpen(false);
      }}
      // The row layout is a plain style object. NativeWind's `Pressable`
      // interop rebuilds `style` from the inline value on native and drops a
      // function `style` entirely, so a layout kept in one stacked the icon
      // above the label on Android (React Native's default column). The press
      // highlight comes from the `pressed` render state as a background layer.
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: metrics.minHeight,
        gap: DROPDOWN_MENU.itemGap,
        paddingLeft,
        paddingRight: DROPDOWN_MENU.itemPaddingX,
        paddingVertical: DROPDOWN_MENU.itemPaddingY,
        borderRadius: DROPDOWN_MENU.itemRadius,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {({ pressed }) => (
        <>
          {pressed && !disabled ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { borderRadius: DROPDOWN_MENU.itemRadius, backgroundColor: palette.default[scheme] }]}
            />
          ) : null}
          {leading}
          {/* A caller `className` lands here, off the Pressable (see the style note above). */}
          <View className={cn("min-w-0 flex-1 flex-row items-center", className)}>
            {typeof children === "string" ? (
              <Text className="flex-1 font-instrument-sans" style={[metrics.text, { color }]}>
                {children}
              </Text>
            ) : (
              children
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

export type DropdownMenuItemProps = MenuItemBaseProps & {
  /** Leading icon (a Tabler icon), drawn at 16 in the item colour. */
  icon?: MenuIcon;
  /** The web `text-destructive` item: label and icon in the danger colour. */
  destructive?: boolean;
  /** The web `text-warning` item (such as Archive): label and icon in the warning colour. */
  warning?: boolean;
};

/** One action row (`menuitem`): an optional icon and the label. */
export function DropdownMenuItem({ icon: Icon, destructive, warning, ...props }: DropdownMenuItemProps) {
  const scheme = useScheme();
  const metrics = itemMetrics(useLargerText());
  const color = destructive
    ? palette.danger[scheme]
    : warning
      ? palette.warning[scheme]
      : palette.overlayForeground[scheme];
  return (
    <MenuRow
      part="DropdownMenuItem"
      itemRole="menuitem"
      color={color}
      paddingLeft={DROPDOWN_MENU.itemPaddingX}
      leading={Icon ? <Icon size={metrics.icon} color={color} /> : null}
      {...props}
    />
  );
}

export type DropdownMenuRadioItemProps = MenuItemBaseProps & {
  /** Shows the check and reports `checked`. */
  checked: boolean;
};

/**
 * One choice of a set (`radio`, reporting `checked`): the label inset `pl-8`
 * with a 16 check at `left-2.5` when `checked`.
 */
export function DropdownMenuRadioItem({ checked, ...props }: DropdownMenuRadioItemProps) {
  const scheme = useScheme();
  const metrics = itemMetrics(useLargerText());
  const color = palette.overlayForeground[scheme];
  return (
    <MenuRow
      part="DropdownMenuRadioItem"
      itemRole="radio"
      checked={checked}
      color={color}
      paddingLeft={DROPDOWN_MENU.indicatorInset + (metrics.icon - 16)}
      leading={
        checked ? (
          <View
            accessible={false}
            style={{ position: "absolute", left: DROPDOWN_MENU.indicatorLeft, top: 0, bottom: 0, justifyContent: "center" }}
          >
            <IconCheck size={metrics.icon} color={color} />
          </View>
        ) : null
      }
      {...props}
    />
  );
}

export type DropdownMenuLabelProps = { children: ReactNode; className?: string };

/** A group heading: the web `text-xs font-semibold uppercase tracking-widest text-muted-foreground`, `px-2.5 py-1.5`. */
export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  const scheme = useScheme();
  const text = sizeStyle(useLargerText() ? "text-base" : "text-xs");
  return (
    <Text
      accessibilityRole="header"
      className={cn("font-instrument-sans-semibold uppercase", className)}
      style={[
        text,
        typeStyle("semibold"),
        {
          letterSpacing: text.fontSize / 10,
          color: tokens.color.muted[scheme],
          paddingHorizontal: DROPDOWN_MENU.itemPaddingX,
          paddingVertical: DROPDOWN_MENU.labelPaddingY,
        },
      ]}
    >
      {children}
    </Text>
  );
}

/** A 1-high `separator` line across the menu, `-mx-1.5 my-1`. */
export function DropdownMenuSeparator() {
  const scheme = useScheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={{
        height: 1,
        marginHorizontal: -DROPDOWN_MENU.padding,
        marginVertical: DROPDOWN_MENU.separatorMargin,
        backgroundColor: tokens.color.separator[scheme],
      }}
    />
  );
}

import * as Slot from "@rn-primitives/slot";
import { createContext, useContext, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type PressableProps,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconCheck, type IconProps } from "@tabler/icons-react-native";
import { FloatingSurface } from "./FloatingSurface";
import { cn } from "./cn";
import { MIN_TOUCH_TARGET, sizeStyle, typeStyle } from "./controlStyles";
import { palette } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useReduceMotion } from "./useReduceMotion";
import { useScheme } from "./useScheme";
import { useControllableState } from "./primitives/use-controllable-state";

/**
 * Sizes from the web menu classes (`_menu-classes.ts`): content `min-w-[12rem]
 * p-1.5 rounded-lg`, `sideOffset` 4 and `collisionPadding` 8; items `px-2.5
 * py-2 rounded-menu-item` (8) with a 16 icon `gap-2`; radio items `pl-8` with
 * the check at `left-2.5`; the label `px-2.5 py-1.5`; the separator `-mx-1.5
 * my-1 h-px`. Items are at least 44 high (the web `max-sm:min-h-10` is 40).
 */
export const DROPDOWN_MENU = {
  minWidth: 192,
  padding: 6,
  radius: tokens.radius.lg,
  sideOffset: 4,
  edge: 8,
  itemRadius: 8,
  itemPaddingX: 10,
  itemPaddingY: 8,
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
};

/**
 * Opens the menu, or closes it when open. On press it measures itself
 * (`measureInWindow`) and the menu opens under it. Reports `expanded`.
 */
export function DropdownMenuTrigger({ asChild, onPress, accessibilityState, ...props }: DropdownMenuTriggerProps) {
  const { open, setOpen, setTrigger } = useMenu("DropdownMenuTrigger");
  const ref = useRef<View>(null);
  const Component = asChild ? Slot.Pressable : Pressable;
  return (
    <Component
      ref={ref}
      accessibilityRole="button"
      {...props}
      accessibilityState={{ ...accessibilityState, expanded: open }}
      onPress={(event: GestureResponderEvent) => {
        onPress?.(event);
        if (open) return setOpen(false);
        const view = ref.current;
        if (!view) return setOpen(true);
        view.measureInWindow((x, y, width, height) => {
          setTrigger({ x, y, width, height });
          setOpen(true);
        });
      }}
    />
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
 * content does not fit below and there is more room above. Without a trigger
 * box it sits at the top of the safe area.
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
  if (contentHeight > roomBelow && roomAbove > roomBelow) {
    return { ...horizontal, bottom: window.height - above, maxHeight: roomAbove };
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
 * The menu in a transparent RN `Modal`: the opaque overlay surface of
 * `Dialog` and `Sheet` (`FloatingSurface` without blur, with the floating
 * shadow) at radius 16, at least 192 wide, `p-1.5`, scrolling when taller than
 * the room. A tap outside, Android back and the VoiceOver escape gesture close
 * it. With Reduce Motion on, the fade is off.
 */
export function DropdownMenuContent({
  align = "start",
  sideOffset,
  className,
  style,
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open, setOpen, trigger } = useMenu("DropdownMenuContent");
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [contentHeight, setContentHeight] = useState(0);
  const close = () => setOpen(false);
  const position = dropdownMenuPosition({ trigger, window, insets, align, sideOffset, contentHeight });
  return (
    <Modal
      visible={open}
      transparent
      animationType={reduceMotion ? "none" : "fade"}
      statusBarTranslucent
      onRequestClose={close}
    >
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
        style={{
          position: "absolute",
          ...position,
          minWidth: DROPDOWN_MENU.minWidth,
          maxWidth: window.width - insets.left - insets.right - 2 * DROPDOWN_MENU.edge,
        }}
      >
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
      </View>
    </Modal>
  );
}

/** Item type and icon size: the web `text-sm` with a 16 icon, or `text-lg` with a 22 icon and 56 rows with larger text. */
function itemMetrics(largerText: boolean) {
  return largerText
    ? { text: sizeStyle("text-lg"), icon: 22, minHeight: 56 }
    : { text: sizeStyle("text-sm"), icon: 16, minHeight: MIN_TOUCH_TARGET };
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
        onSelect?.();
        if (closeOnSelect) setOpen(false);
      }}
      // No `className` on this Pressable: NativeWind drops a function `style`
      // when a `className` is set, and the row's layout lives in the style.
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        minHeight: metrics.minHeight,
        gap: DROPDOWN_MENU.itemGap,
        paddingLeft,
        paddingRight: DROPDOWN_MENU.itemPaddingX,
        paddingVertical: DROPDOWN_MENU.itemPaddingY,
        borderRadius: DROPDOWN_MENU.itemRadius,
        backgroundColor: pressed && !disabled ? palette.default[scheme] : "transparent",
        opacity: disabled ? 0.5 : 1,
      })}
    >
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
    </Pressable>
  );
}

export type DropdownMenuItemProps = MenuItemBaseProps & {
  /** Leading icon (a Tabler icon), drawn at 16 in the item colour. */
  icon?: MenuIcon;
  /** The web `text-destructive` item: label and icon in the danger colour. */
  destructive?: boolean;
};

/** One action row (`menuitem`): an optional icon and the label. */
export function DropdownMenuItem({ icon: Icon, destructive, ...props }: DropdownMenuItemProps) {
  const scheme = useScheme();
  const metrics = itemMetrics(useLargerText());
  const color = destructive ? palette.danger[scheme] : palette.overlayForeground[scheme];
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

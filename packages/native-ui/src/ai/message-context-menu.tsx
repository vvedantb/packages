import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../cn";
import { PANEL_SCALE_FROM, POPOVER_ENTER } from "../motion";
import { sizeStyle, typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";
import { MESSAGE_MENU, messageContextMenuLayout, type MessageMenu, type MessageMenuRect } from "./message-menu-layout";
import { usePressed } from "../usePressed";

/** How far the held message lifts as the menu opens: a little, so a tall one stays in its room. */
const LIFT_SCALE = 1.02;

/**
 * The iMessage hold menu for a chat message: the chat fades under a frosted
 * wash of the screen colour, the held message stays in place,
 * lifted, with the quick reactions in a pill above it and the actions in a
 * card below it, label first and icon last. It fades in and out as one (the
 * Modal's own fade; with Reduce Motion on, it appears at once). As it fades
 * in, the pill and the card grow into place from the message's side (0.96 to
 * 1) and the held message lifts a little (to 1.02), in 150 ms; with Reduce
 * Motion they are in place at once. A tap outside, Android back
 * or the VoiceOver escape closes it; an action or a reaction closes it, then
 * runs. `Message` opens it with `menu`.
 */
export function MessageContextMenu({
  open,
  onClose,
  onDismissed,
  anchor,
  align,
  preview,
  menu,
  testID = "message-context-menu",
}: {
  open: boolean;
  onClose: () => void;
  /** After the menu has gone from the screen (iOS; Android gives no such callback for a `Modal`). */
  onDismissed?: () => void;
  /** The held message's box; the menu stays shut without one. */
  anchor: MessageMenuRect | null;
  /** Which side the pill and the card line up with: the message's (`end` for the user's). */
  align: "start" | "end";
  /** The message, drawn again over the blur. */
  preview: ReactNode;
  menu: MessageMenu;
  testID?: string;
}) {
  const scheme = useScheme();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const largerText = useLargerText();
  const reduceMotion = useReduceMotion();
  const rowHeight = largerText ? 56 : 48;
  const body = chatTextSize("body", largerText);
  // 0 to 1 as the menu opens. Started from the menu's first layout: Reanimated's
  // entering animations do not run inside a Modal on Android, a shared value does.
  const shown = useSharedValue(0);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: PANEL_SCALE_FROM + (1 - PANEL_SCALE_FROM) * shown.get() }] }));
  const liftStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + (LIFT_SCALE - 1) * shown.get() }] }));
  // `POPOVER_ENTER` reduces with the system setting: with Reduce Motion the menu is in place at once.
  const appear = () => {
    shown.set(0);
    shown.set(withTiming(1, POPOVER_ENTER));
  };
  if (!open || anchor === null) return null;

  const layout = messageContextMenuLayout({
    anchor,
    window,
    insets,
    menuHeight: menu.actions.length * rowHeight,
    hasReactions: menu.reactions !== undefined,
  });
  const run = (action: () => void) => {
    onClose();
    action();
  };
  // The pill and the card line up with the message's side, kept on screen.
  const side = (width: number) =>
    align === "end"
      ? { left: Math.max(MESSAGE_MENU.edge, Math.min(anchor.x + anchor.width, window.width - MESSAGE_MENU.edge) - width) }
      : { left: Math.max(MESSAGE_MENU.edge, Math.min(anchor.x, window.width - MESSAGE_MENU.edge - width)) };
  const surface = tokens.color.surface[scheme];
  const shadow = { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 };
  const pillWidth = Math.min(window.width - 2 * MESSAGE_MENU.edge, (menu.reactions?.items.length ?? 0) * 48 + 16);

  return (
    // The Modal's own fade: Reanimated entering animations do not run inside a Modal on Android.
    <Modal visible transparent animationType={reduceMotion ? "none" : "fade"} statusBarTranslucent onRequestClose={onClose} onDismiss={onDismissed}>
      <View style={{ flex: 1 }} testID={testID} accessibilityViewIsModal onAccessibilityEscape={onClose} onLayout={appear}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            testID={`${testID}-backdrop`}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={onClose}
            // A frosted wash of the screen colour over the chat, as iMessage's blur reads: the `ai`
            // entry reaches no optional peer, so it draws no `expo-blur`.
            style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(tokens.color.background[scheme], 0.85) }]}
          />
        </View>
        {/* The held message, lifted: in place, on the screen colour with a shadow, clipped when it is taller than the room. */}
        <Animated.View
          pointerEvents="none"
          style={[{
            position: "absolute",
            top: layout.previewTop,
            left: anchor.x,
            width: anchor.width,
            height: layout.previewHeight,
            overflow: "hidden",
            // The screen colour behind the copy: a reply without a bubble would show the dimmed original through it.
            backgroundColor: tokens.color.background[scheme],
            borderRadius: tokens.radius.card,
            ...shadow,
          }, liftStyle]}
        >
          {preview}
        </Animated.View>
        {menu.reactions ? (
          <Animated.View
            accessibilityRole="toolbar"
            style={[{
              position: "absolute",
              top: layout.pillTop,
              ...side(pillWidth),
              height: MESSAGE_MENU.pillHeight,
              borderRadius: MESSAGE_MENU.pillHeight / 2,
              backgroundColor: surface,
              // Styles, not classes: this is a Reanimated view.
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 8,
              // Grows from the corner next to the message.
              transformOrigin: align === "end" ? "right bottom" : "left bottom",
              ...shadow,
            }, popStyle]}
          >
            {menu.reactions.items.map((item) => {
              const selected = item.selected === true;
              return (
                <Pressable
                  key={item.key}
                  testID={`${testID}-reaction-${item.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  onPress={() => run(() => menu.reactions?.onPress(item.key))}
                  className="size-11 items-center justify-center rounded-full active:opacity-70"
                  style={{ marginHorizontal: 2, backgroundColor: selected ? withAlpha(palette.primary[scheme], 0.12) : "transparent" }}
                >
                  {item.render(selected)}
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}
        <Animated.View
          accessibilityRole="menu"
          style={[{
            position: "absolute",
            top: layout.menuTop,
            ...side(MESSAGE_MENU.menuWidth),
            width: MESSAGE_MENU.menuWidth,
            maxWidth: window.width - 2 * MESSAGE_MENU.edge,
            borderRadius: tokens.radius.card,
            backgroundColor: surface,
            overflow: "hidden",
            transformOrigin: align === "end" ? "right top" : "left top",
            ...shadow,
          }, popStyle]}
        >
          {menu.actions.map((action, index) => (
            <MenuCardRow
              key={action.key}
              testID={`${testID}-action-${action.key}`}
              action={action}
              first={index === 0}
              rowHeight={rowHeight}
              body={body}
              iconSize={largerText ? 22 : 20}
              onPress={() => run(action.onPress)}
            />
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * One card row: label first, icon last. While pressed it takes the
 * `SheetRow` pressed fill, so the finger sees which row it is on.
 */
function MenuCardRow({
  testID,
  action,
  first,
  rowHeight,
  body,
  iconSize,
  onPress,
}: {
  testID: string;
  action: MessageMenu["actions"][number];
  first: boolean;
  rowHeight: number;
  body: ReturnType<typeof chatTextSize>;
  iconSize: number;
  onPress: () => void;
}) {
  const scheme = useScheme();
  // A state, not a style function: with a `className`, NativeWind drops a style function.
  const press = usePressed();
  const disabled = action.disabled === true;
  const Icon = action.icon;
  const color = action.destructive ? palette.danger[scheme] : tokens.color.foreground[scheme];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="menuitem"
      accessibilityLabel={action.label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      className="flex-row items-center gap-3 px-4"
      style={[
        {
          minHeight: rowHeight,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: press.pressed && !disabled ? palette.default[scheme] : "transparent",
        },
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.separator[scheme] },
      ]}
    >
      <Text
        numberOfLines={1}
        className={cn(body, "min-w-0 flex-1 font-instrument-sans")}
        style={[sizeStyle(body), typeStyle("medium"), { color }]}
      >
        {action.label}
      </Text>
      {Icon ? <Icon size={iconSize} color={color} /> : null}
    </Pressable>
  );
}

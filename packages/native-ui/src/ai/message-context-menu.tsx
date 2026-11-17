import { useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../cn";
import { sizeStyle, typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";
import { MESSAGE_MENU, messageContextMenuLayout, type MessageMenu, type MessageMenuRect } from "./message-menu-layout";

/**
 * The iMessage hold menu for a chat message: the chat fades under a frosted
 * wash of the screen colour, the held message stays in place,
 * lifted, with the quick reactions in a pill above it and the actions in a
 * card below it, label first and icon last. It fades in and out as one (the
 * Modal's own fade; with Reduce Motion on, it appears at once). A tap outside, Android back
 * or the VoiceOver escape closes it; an action or a reaction closes it, then
 * runs. `Message` opens it with `menu`.
 */
export function MessageContextMenu({
  open,
  onClose,
  anchor,
  align,
  preview,
  menu,
  testID = "message-context-menu",
}: {
  open: boolean;
  onClose: () => void;
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
    <Modal visible transparent animationType={reduceMotion ? "none" : "fade"} statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }} testID={testID} accessibilityViewIsModal onAccessibilityEscape={onClose}>
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
        <View
          pointerEvents="none"
          style={{
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
          }}
        >
          {preview}
        </View>
        {menu.reactions ? (
          <View
            accessibilityRole="toolbar"
            style={{
              position: "absolute",
              top: layout.pillTop,
              ...side(pillWidth),
              height: MESSAGE_MENU.pillHeight,
              borderRadius: MESSAGE_MENU.pillHeight / 2,
              backgroundColor: surface,
              ...shadow,
            }}
            className="flex-row items-center px-2"
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
          </View>
        ) : null}
        <View
          accessibilityRole="menu"
          style={{
            position: "absolute",
            top: layout.menuTop,
            ...side(MESSAGE_MENU.menuWidth),
            width: MESSAGE_MENU.menuWidth,
            maxWidth: window.width - 2 * MESSAGE_MENU.edge,
            borderRadius: tokens.radius.card,
            backgroundColor: surface,
            overflow: "hidden",
            ...shadow,
          }}
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
        </View>
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
  const [pressed, setPressed] = useState(false);
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
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className="flex-row items-center gap-3 px-4"
      style={[
        {
          minHeight: rowHeight,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: pressed && !disabled ? palette.default[scheme] : "transparent",
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

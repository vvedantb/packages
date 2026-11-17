import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../cn";
import { sizeStyle, typeStyle } from "../controlStyles";
import { EASE_OUT } from "../motion";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";
import { MESSAGE_MENU, messageContextMenuLayout, type MessageMenu, type MessageMenuRect } from "./message-menu-layout";

const ENTER = { duration: 180, easing: EASE_OUT };

/**
 * The iMessage hold menu for a chat message: the chat fades under a frosted
 * wash of the screen colour, the held message stays in place,
 * lifted, with the quick reactions in a pill above it and the actions in a
 * card below it, label first and icon last. The wash, the pill and the card
 * fade in over 180 ms (with Reduce Motion on, they appear at once). A tap outside, Android back
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
  // Reanimated's layout animations follow the system Reduce Motion by default.
  const enter = FadeIn.duration(ENTER.duration).easing(ENTER.easing);
  const pillWidth = Math.min(window.width - 2 * MESSAGE_MENU.edge, (menu.reactions?.items.length ?? 0) * 48 + 16);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }} testID={testID} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <Animated.View entering={enter} style={StyleSheet.absoluteFill}>
          <Pressable
            testID={`${testID}-backdrop`}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={onClose}
            // A frosted wash of the screen colour over the chat, as iMessage's blur reads: the `ai`
            // entry reaches no optional peer, so it draws no `expo-blur`.
            style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(tokens.color.background[scheme], 0.85) }]}
          />
        </Animated.View>
        {/* The held message, lifted: in place, a shadow under it, clipped when it is taller than the room. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: layout.previewTop,
            left: anchor.x,
            width: anchor.width,
            height: layout.previewHeight,
            overflow: "hidden",
            ...shadow,
          }}
        >
          {preview}
        </View>
        {menu.reactions ? (
          <Animated.View
            entering={enter}
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
          </Animated.View>
        ) : null}
        <Animated.View
          entering={enter}
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
          {menu.actions.map((action, index) => {
            const Icon = action.icon;
            const color = action.destructive ? palette.danger[scheme] : tokens.color.foreground[scheme];
            return (
              <Pressable
                key={action.key}
                testID={`${testID}-action-${action.key}`}
                accessibilityRole="menuitem"
                accessibilityLabel={action.label}
                accessibilityState={{ disabled: action.disabled === true }}
                disabled={action.disabled === true}
                onPress={() => run(action.onPress)}
                className="flex-row items-center gap-3 px-4"
                style={({ pressed }) => [
                  { minHeight: rowHeight, opacity: action.disabled ? 0.5 : 1 },
                  pressed && { backgroundColor: palette.default[scheme] },
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.separator[scheme] },
                ]}
              >
                <Text
                  numberOfLines={1}
                  className={cn(body, "min-w-0 flex-1 font-instrument-sans")}
                  style={[sizeStyle(body), typeStyle("medium"), { color }]}
                >
                  {action.label}
                </Text>
                {Icon ? <Icon size={largerText ? 22 : 20} color={color} /> : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

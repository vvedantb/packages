import { useEffect, type ComponentType } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { IconProps } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, sizeStyle, textStyle, touchSlop, typeStyle } from "../controlStyles";
import { selectionHaptic } from "../haptics";
import { palette } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";

/** One row of `MessageActionSheet`. */
export type MessageSheetAction = {
  key: string;
  label: string;
  icon?: ComponentType<IconProps>;
  /** Draws the row in the danger colour, such as Delete. */
  destructive?: boolean;
  onPress: () => void;
};

export type MessageActionSheetProps = {
  open: boolean;
  /** Called on a backdrop tap, Cancel, Android back and after an action runs. */
  onClose: () => void;
  actions: MessageSheetAction[];
  /** Shown above the rows, and names the sheet for VoiceOver and TalkBack. Default "Message actions". */
  title?: string;
  /** Default "Cancel". */
  cancelLabel?: string;
  testID?: string;
};

/**
 * The sheet that opens on a long press of a chat message: a bottom sheet in
 * an RN `Modal` (no `@gorhom/bottom-sheet`) with one pressable row per action
 * and a Cancel row. It closes on the backdrop, Cancel, Android back and after
 * an action. A `selectionHaptic()` fires when it opens (`expo-haptics` is an
 * optional peer). Row testIDs are `{testID}-action-{key}`.
 */
export function MessageActionSheet({
  open,
  onClose,
  actions,
  title = "Message actions",
  cancelLabel = "Cancel",
  testID = "message-action-sheet",
}: MessageActionSheetProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (open) selectionHaptic();
  }, [open]);

  const caption = chatTextSize("caption", largerText);
  const body = chatTextSize("body", largerText);
  const minHeight = largerText ? 56 : MIN_TOUCH_TARGET + 4;

  return (
    <Modal
      visible={open}
      transparent
      animationType={reduceMotion ? "none" : "fade"}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        testID={`${testID}-backdrop`}
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        hitSlop={touchSlop(MIN_TOUCH_TARGET)}
        style={[StyleSheet.absoluteFill, { backgroundColor: palette.backdrop[scheme] }]}
      />
      <View pointerEvents="box-none" style={styles.anchor}>
        <View
          testID={testID}
          accessibilityViewIsModal
          accessibilityLabel={title}
          onAccessibilityEscape={onClose}
          className="w-full self-center px-2"
          style={{ maxWidth: 480, paddingBottom: insets.bottom + 8 }}
        >
          <View
            className="overflow-hidden"
            style={{ backgroundColor: tokens.color.surface[scheme], borderRadius: tokens.radius.card }}
          >
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              className={cn(caption, "px-4 pb-1 pt-3 font-instrument-sans-medium")}
              style={[sizeStyle(caption), typeStyle("medium"), textStyle("muted", scheme)]}
            >
              {title}
            </Text>
            {actions.map((action, index) => {
              const Icon = action.icon;
              const color = action.destructive ? palette.danger[scheme] : tokens.color.foreground[scheme];
              return (
                <Pressable
                  key={action.key}
                  testID={`${testID}-action-${action.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  hitSlop={touchSlop(MIN_TOUCH_TARGET)}
                  onPress={() => {
                    onClose();
                    action.onPress();
                  }}
                  className="flex-row items-center gap-3 px-4"
                  style={[
                    { minHeight },
                    index > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: tokens.color.separator[scheme],
                    },
                  ]}
                >
                  {Icon ? <Icon size={largerText ? 22 : 20} color={color} /> : null}
                  <Text
                    numberOfLines={1}
                    className={cn(body, "min-w-0 flex-1 font-instrument-sans-medium")}
                    style={[sizeStyle(body), typeStyle("medium"), { color }]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            testID={`${testID}-cancel`}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            onPress={onClose}
            hitSlop={touchSlop(MIN_TOUCH_TARGET)}
            className="mt-2 items-center justify-center"
            style={{
              minHeight,
              backgroundColor: tokens.color.surface[scheme],
              borderRadius: tokens.radius.card,
            }}
          >
            <Text
              className={cn(body, "font-instrument-sans-semibold")}
              style={[sizeStyle(body), typeStyle("semibold"), textStyle("foreground", scheme)]}
            >
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: { flex: 1, justifyContent: "flex-end" },
});

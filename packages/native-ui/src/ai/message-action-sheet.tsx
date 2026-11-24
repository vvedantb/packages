import { useEffect, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { IconProps } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, sizeStyle, textStyle, touchSlop, typeStyle } from "../controlStyles";
import { selectionHaptic } from "../haptics";
import { palette } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { OverlayModal, OverlayRoot } from "../primitives/overlay";
import { SheetDragView } from "../primitives/sheet-drag";
import { chatTextSize } from "./chat-text";

/** One row of `MessageActionSheet`. */
export type MessageSheetAction = {
  key: string;
  label: string;
  icon?: ComponentType<IconProps>;
  /** Draws the row in the danger colour, such as Delete. */
  destructive?: boolean;
  /** Dims the row and ignores presses (the context menu's rows; the sheet leaves a disabled action out). */
  disabled?: boolean;
  onPress: () => void;
};

/** The sheet's default title, also the message's `longpress` action label. */
export const MESSAGE_ACTIONS_TITLE = "Message actions";

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
 * the kit's `OverlayModal` (an RN `Modal`, no bottom-sheet library) with one row per action
 * and a Cancel row. It slides up and down as `Sheet` does (a drag down closes it too; with
 * Reduce Motion on it appears and leaves in place). It closes on the backdrop, Cancel, Android back and after
 * an action. A `selectionHaptic()` fires when it opens (`expo-haptics` is an
 * optional peer). Row testIDs are `{testID}-action-{key}`.
 */
export function MessageActionSheet({
  open,
  onClose,
  actions,
  title = MESSAGE_ACTIONS_TITLE,
  cancelLabel = "Cancel",
  testID = "message-action-sheet",
}: MessageActionSheetProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (open) selectionHaptic();
  }, [open]);

  const caption = chatTextSize("caption", largerText);
  const body = chatTextSize("body", largerText);
  const minHeight = largerText ? 56 : MIN_TOUCH_TARGET + 4;

  return (
    <OverlayRoot
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {/* The kit's bottom-sheet overlay: it slides with `SHEET_SPRING`, the backdrop
          follows its position and a drag down closes it. The part name keeps
          the backdrop testID `{testID}-backdrop`. */}
      <OverlayModal part={testID} placement="bottom" dismissible>
        <SheetDragView enabled>
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
                className={cn(body, "font-instrument-sans-medium")}
                style={[sizeStyle(body), typeStyle("medium"), textStyle("foreground", scheme)]}
              >
                {cancelLabel}
              </Text>
            </Pressable>
          </View>
        </SheetDragView>
      </OverlayModal>
    </OverlayRoot>
  );
}

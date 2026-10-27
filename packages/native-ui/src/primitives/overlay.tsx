import * as Slot from "@rn-primitives/slot";
import {
  createContext,
  useContext,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "../palette";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import { useControllableState } from "./use-controllable-state";

type OverlayContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlay(part: string): OverlayContextValue {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error(`${part} must be inside its Dialog, AlertDialog or Sheet root.`);
  }
  return context;
}

export type OverlayRootProps = {
  /** Open state when the parent controls it. */
  open?: boolean;
  /** Initial open state when `open` is not set. Default `false`. */
  defaultOpen?: boolean;
  /** Called with the next open state (trigger, close, backdrop, Android back). */
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

/** Root shared by `Dialog`, `AlertDialog` and `Sheet`: holds the open state, renders no view. */
export function OverlayRoot({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: OverlayRootProps) {
  const [value, setValue] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  return (
    <OverlayContext.Provider value={{ open: value, setOpen: setValue }}>
      {children}
    </OverlayContext.Provider>
  );
}

export type OverlayPressableProps = ComponentPropsWithoutRef<typeof Pressable> & {
  /** Merge the press handler into the single child (for example a `Button`) instead of wrapping it. */
  asChild?: boolean;
};

function OverlayPressable({
  asChild,
  next,
  part,
  onPress,
  ...props
}: OverlayPressableProps & { next: boolean; part: string }) {
  const { setOpen } = useOverlay(part);
  const Component = asChild ? Slot.Pressable : Pressable;
  return (
    <Component
      accessibilityRole="button"
      {...props}
      onPress={(event: GestureResponderEvent) => {
        onPress?.(event);
        setOpen(next);
      }}
    />
  );
}

export function OverlayTrigger(props: OverlayPressableProps & { part: string }) {
  return <OverlayPressable {...props} next />;
}

export function OverlayClose(props: OverlayPressableProps & { part: string }) {
  return <OverlayPressable {...props} next={false} />;
}

/**
 * RN `Modal` with a tinted backdrop, safe-area padding and keyboard avoidance.
 * `placement="center"` centres the child (dialogs) inside the insets on every
 * side; `"bottom"` pins it to the bottom edge (sheets), which pad their own
 * bottom inset. The backdrop closes the overlay only when `dismissible`;
 * Android back and the VoiceOver escape gesture always close it, as Escape
 * does on the web. With Reduce Motion on, the fade is off.
 */
export function OverlayModal({
  part,
  placement,
  dismissible,
  children,
}: {
  part: string;
  placement: "center" | "bottom";
  dismissible: boolean;
  children: ReactNode;
}) {
  const { open, setOpen } = useOverlay(part);
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const close = () => setOpen(false);

  return (
    <Modal
      visible={open}
      transparent
      animationType={reduceMotion ? "none" : "fade"}
      statusBarTranslucent
      onRequestClose={close}
    >
      {/* Android too: a modal window with `statusBarTranslucent` may not
          resize for the keyboard, which then covers the fields. The padding
          is the measured overlap, so it drops to 0 where the window does
          resize. */}
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <Pressable
          testID={`${part}-backdrop`}
          accessible={dismissible}
          accessibilityRole="button"
          accessibilityLabel="Close"
          disabled={!dismissible}
          onPress={close}
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.backdrop[scheme] }]}
        />
        <View
          pointerEvents="box-none"
          onAccessibilityEscape={close}
          style={[
            styles.fill,
            placement === "bottom"
              ? {
                  justifyContent: "flex-end",
                  paddingTop: insets.top + 16,
                  paddingLeft: insets.left,
                  paddingRight: insets.right,
                }
              : {
                  justifyContent: "center",
                  paddingTop: insets.top + 16,
                  paddingBottom: insets.bottom + 16,
                  paddingLeft: insets.left + 16,
                  paddingRight: insets.right + 16,
                },
          ]}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

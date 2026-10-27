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
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "../palette";
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
 * `placement="center"` centres the child (dialogs); `"bottom"` pins it to the
 * bottom edge (sheets). The backdrop closes the overlay only when `dismissible`;
 * Android back always closes it, as Escape does on the web.
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
  const close = () => setOpen(false);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
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
          style={[
            styles.fill,
            placement === "bottom"
              ? { justifyContent: "flex-end", paddingTop: insets.top + 16 }
              : {
                  justifyContent: "center",
                  paddingTop: insets.top + 16,
                  paddingBottom: insets.bottom + 16,
                  paddingHorizontal: 16,
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

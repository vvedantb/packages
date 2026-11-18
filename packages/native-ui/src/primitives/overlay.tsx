import * as Slot from "@rn-primitives/slot";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "../palette";
import { KeyboardAvoidingView, KeyboardLiftContext } from "./keyboard-parts";
import { DIALOG_ENTER, DIALOG_EXIT, PANEL_SCALE_FROM } from "../motion";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import {
  SheetDragProvider,
  SheetGestureContext,
  slideSheetIn,
  slideSheetOut,
  useSheetBackdropStyle,
  useSheetDragState,
} from "./sheet-drag";
import { useControllableState } from "./use-controllable-state";
import { WindowLayer } from "./window-layer";

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
 * A `WindowLayer` (in the app's window under `WindowLayerHost`, so a chat
 * under it keeps its place; else a `Modal`) with a tinted backdrop, safe-area padding and keyboard avoidance
 * (`KeyboardAvoidingView`: frame by frame with `KeyboardControllerProvider`).
 * `placement="center"` centres the child (dialogs) inside the insets on every
 * side: the backdrop fades while the panel scales from 0.96 and fades in (200
 * ms on open, 150 ms on close), and the layer stays up until it is out of
 * sight. `"bottom"` pins it to the bottom
 * edge (sheets), which pad their own bottom inset: the sheet slides up on
 * open and back down on close, however it closes, and may be dragged down to
 * close (`SheetDragView`); the backdrop fades with the sheet's position. The
 * layer stays up until the sheet is out of sight. The backdrop closes the
 * overlay only when `dismissible`; Android back and the VoiceOver escape
 * gesture always close it, as Escape does on the web. With Reduce Motion on,
 * overlays appear and leave in place. With the Gesture Handler parts
 * (`GestureHandlerProvider`), the content sits in its own root view: on
 * Android a `Modal` is a separate root, and without one there every gesture
 * in it silently does nothing (the fallback `Modal`).
 */
export function OverlayModal({
  part,
  placement,
  dismissible,
  onShow,
  children,
}: {
  part: string;
  placement: "center" | "bottom";
  dismissible: boolean;
  /** Once the overlay is on screen: where to focus a field (see `DialogContent`'s `onShow`). */
  onShow?: () => void;
  children: ReactNode;
}) {
  const overlay = useOverlay(part);
  const { open, setOpen } = overlay;
  const reduceMotion = useReduceMotion();
  const slides = placement === "bottom" && !reduceMotion;
  const scales = placement === "center" && !reduceMotion;
  // Up while open, and after a close until a sliding sheet or a scaling dialog is out of sight.
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  if (!open && shown && !slides && !scales) setShown(false);
  const close = () => setOpen(false);
  const ModalRoot = useContext(SheetGestureContext)?.ModalRoot ?? Fragment;

  if (!shown) return null;
  return (
    // The layer runs its own motion, so no fade; a layer loses the context
    // between it and the host, so the open state is provided again.
    <WindowLayer onRequestClose={close} onShow={onShow} fade={false}>
      <OverlayContext.Provider value={overlay}>
      <ModalRoot>
        <OverlayModalBody
          placement={placement}
          dismissible={dismissible}
          open={open}
          slides={slides}
          scales={scales}
          close={close}
          onHidden={() => setShown(false)}
          part={part}
        >
          {children}
        </OverlayModalBody>
      </ModalRoot>
      </OverlayContext.Provider>
    </WindowLayer>
  );
}

/** The layer's content: mounted with each opening, so a sheet starts below the screen (or at rest). */
function OverlayModalBody({
  part,
  placement,
  dismissible,
  open,
  slides,
  scales,
  close,
  onHidden,
  children,
}: {
  part: string;
  placement: "center" | "bottom";
  dismissible: boolean;
  open: boolean;
  slides: boolean;
  scales: boolean;
  close: () => void;
  onHidden: () => void;
  children: ReactNode;
}) {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const drag = useSheetDragState(close, slides);
  const sheetBackdropStyle = useSheetBackdropStyle(drag);
  // A centred dialog: one 0 to 1 `progress` drives the backdrop fade and the
  // panel's scale and opacity. It mounts at 0 with each opening, and at 1
  // under Reduce Motion, so there the dialog simply appears.
  const progress = useSharedValue(scales ? 0 : 1);
  const centreBackdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const centrePanelStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: PANEL_SCALE_FROM + (1 - PANEL_SCALE_FROM) * progress.get() }],
  }));
  const backdropStyle = placement === "center" ? centreBackdropStyle : sheetBackdropStyle;
  // The open state lives in React, the sheet's position on the UI thread:
  // each change of `open` starts the slide that matches it. The slide in on
  // opening starts from the sheet's first layout (`SheetDragView`).
  useEffect(() => {
    if (!slides) return;
    if (open) slideSheetIn(drag);
    else slideSheetOut(drag, onHidden);
    // Only a change of `open` starts a slide; `drag` and `onHidden` keep their meaning.
  }, [open, slides]);
  // The same for a centred dialog, from wherever `progress` is. Opened again
  // while it leaves, it turns back at once, and the exit callback reports
  // `finished` false, so the layer stays up.
  useEffect(() => {
    if (!scales) return;
    if (open) {
      progress.set(withTiming(1, DIALOG_ENTER));
    } else {
      progress.set(
        withTiming(0, DIALOG_EXIT, (finished) => {
          "worklet";
          if (finished) runOnJS(onHidden)();
        }),
      );
    }
    // As the slide: only a change of `open` starts it.
  }, [open, scales]);
  return (
    <SheetDragProvider value={drag}>
      {/* Android too: a modal window with `statusBarTranslucent` may not
          resize for the keyboard, which then covers the fields. The padding
          is the measured overlap, so it drops to 0 where the window does
          resize. Frame by frame with `KeyboardControllerProvider`. */}
      <KeyboardAvoidingView style={styles.fill}>
        {/* Over the app, not in the dock it opened from: the dock's lift is not for it. */}
        <KeyboardLiftContext.Provider value={false}>
          <Animated.View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, { backgroundColor: palette.backdrop[scheme] }, backdropStyle]}
          >
            <Pressable
              testID={`${part}-backdrop`}
              accessible={dismissible}
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={!dismissible}
              onPress={close}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
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
              placement === "center" ? centrePanelStyle : null,
            ]}
          >
            {children}
          </Animated.View>
        </KeyboardLiftContext.Provider>
      </KeyboardAvoidingView>
    </SheetDragProvider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

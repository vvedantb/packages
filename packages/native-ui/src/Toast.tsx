import { Fragment, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { FadeInUp, FadeOutUp, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { notificationHaptic } from "./haptics";
import { EASE_OUT } from "./motion";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";
import Svg, { Path } from "react-native-svg";
import { cn } from "./cn";
import { sizeStyle, textStyle, typeStyle } from "./controlStyles";
import { FLOATING_INSET } from "./floating";
import {
  TOAST_ICON_SIZE,
  TOAST_ICONS,
  toastIconColor,
  toastShadowStyle,
  toastSurfaceStyle,
} from "./toastChrome";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";
import { NativeOnlyAnimatedView } from "./primitives/native-only-animated-view";
import { ToastDragContext } from "./toastDrag";
import { getToasts, subscribeToasts, toast, type ToastItem } from "./toastStore";

// On iOS the overlay draws above RN `Modal`s, so toasts show over dialogs (as
// sonner does on the web). On Android a `Modal` still covers them.
const FullWindowOverlay = Platform.OS === "ios" ? RNFullWindowOverlay : Fragment;

const toastShadow = toastShadowStyle(Platform.OS);

// Down from the top edge and back up the way it came, the exit 20% quicker:
// the reader is done with it.
const TOAST_ENTER = FadeInUp.duration(200).easing(EASE_OUT);
const TOAST_EXIT = FadeOutUp.duration(160).easing(EASE_OUT);

/**
 * Renders the `toast()` queue at the top of the screen, inside the safe-area
 * insets. Mount once, inside `SafeAreaProvider` and after the navigator.
 */
export function Toaster({ offset = 8 }: { offset?: number }) {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  const insets = useSafeAreaInsets();
  if (items.length === 0) return null;
  return (
    <FullWindowOverlay>
      <View
        pointerEvents="box-none"
        className="gap-2"
        style={{
          position: "absolute",
          top: insets.top + offset,
          left: insets.left + FLOATING_INSET,
          right: insets.right + FLOATING_INSET,
          zIndex: 50,
        }}
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </View>
    </FullWindowOverlay>
  );
}

/** The web filled 24 icons (`toastChrome`), or a spinner while loading. */
function ToastIcon({ item }: { item: ToastItem }) {
  const scheme = useScheme();
  if (item.variant === "loading") {
    return <ActivityIndicator size="small" color={tokens.color.muted[scheme]} />;
  }
  if (item.variant === "default") return null;
  const { viewBox, d, evenOdd } = TOAST_ICONS[item.variant];
  const rule = evenOdd ? "evenodd" : undefined;
  return (
    <Svg width={TOAST_ICON_SIZE} height={TOAST_ICON_SIZE} viewBox={viewBox}>
      <Path
        d={d}
        fill={toastIconColor(item.variant, scheme)}
        fillRule={rule}
        clipRule={rule}
      />
    </Svg>
  );
}

/**
 * Closes `item` after its `duration`, counting only while it is not `held`:
 * a finger on the toast pauses the time left, and lifting it resumes. A
 * toast replaced in place (same id, new item) starts its own time afresh.
 */
function useToastTimer(item: ToastItem, held: boolean) {
  // The time left, and the item it counts for. Only the effect reads and writes it.
  const left = useRef({ item, ms: item.duration });
  useEffect(() => {
    if (left.current.item !== item) left.current = { item, ms: item.duration };
    if (held || !Number.isFinite(item.duration)) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => toast.dismiss(item.id), left.current.ms);
    return () => {
      clearTimeout(timer);
      left.current.ms -= Date.now() - startedAt;
    };
  }, [item, held]);
}

function ToastCard({ item }: { item: ToastItem }) {
  const largerText = useLargerText();
  const scheme = useScheme();
  // The swipe up to dismiss, under `GestureHandlerProvider`.
  const Drag = useContext(ToastDragContext);
  const [held, setHeld] = useState(false);
  useToastTimer(item, held);

  // A success or error toast reports an operation the user started: one
  // notification haptic as it shows (or turns from loading into a result).
  useEffect(() => {
    if (item.variant === "success" || item.variant === "error") notificationHaptic(item.variant);
  }, [item.id, item.variant]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      item.description ? `${item.title}. ${item.description}` : item.title,
    );
  }, [item.title, item.description]);

  const surface = (
    // The web toast: flat overlay fill, radius 16, ring and a light shadow.
    <View style={[toastSurfaceStyle(scheme), toastShadow]}>
      <Pressable
        testID={`toast-${item.id}`}
        // With an action, the text and the action button stay separate
        // elements for VoiceOver and TalkBack instead of one grouped button.
        accessible={!item.action}
        accessibilityRole="button"
        accessibilityHint="Closes the message"
        onPress={() => toast.dismiss(item.id)}
        className="flex-row items-center gap-3 px-4 py-3"
      >
        <ToastIcon item={item} />
        <View className="min-w-0 flex-1">
          {/* Web `text-sm font-medium leading-snug` (14 / 19.25, 500); `text-lg` with larger text. */}
          <Text
            className={cn(
              "font-instrument-sans-medium",
              largerText ? "text-lg" : "text-sm",
            )}
            style={[
              textStyle("foreground", scheme),
              typeStyle("medium"),
              largerText ? sizeStyle("text-lg") : sizeStyle("text-sm", "snug"),
            ]}
          >
            {item.title}
          </Text>
          {item.description ? (
            <Text
              className={cn(
                "font-instrument-sans",
                largerText ? "text-base" : "text-sm",
              )}
              style={textStyle("muted", scheme)}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
        {item.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              item.action?.onPress();
              toast.dismiss(item.id);
            }}
            className="rounded-full bg-secondary px-3 py-1.5 active:opacity-70"
          >
            <Text
              className="font-instrument-sans-semibold text-sm"
              style={[textStyle("foreground", scheme), typeStyle("semibold")]}
            >
              {item.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );

  return (
    <NativeOnlyAnimatedView
      entering={TOAST_ENTER}
      exiting={TOAST_EXIT}
      layout={LinearTransition}
    >
      {Drag ? (
        <Drag onDismiss={() => toast.dismiss(item.id)} onHoldChange={setHeld}>
          {surface}
        </Drag>
      ) : (
        surface
      )}
    </NativeOnlyAnimatedView>
  );
}

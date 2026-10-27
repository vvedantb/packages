import { Fragment, useEffect, useSyncExternalStore } from "react";
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
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
} from "@tabler/icons-react-native";
import { FloatingSurface } from "./FloatingSurface";
import { cn } from "./cn";
import { textStyle, typeStyle } from "./controlStyles";
import { FLOATING_INSET, FLOATING_ROW_RADIUS } from "./floating";
import { palette } from "./palette";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";
import { NativeOnlyAnimatedView } from "./primitives/native-only-animated-view";
import { getToasts, subscribeToasts, toast, type ToastItem } from "./toastStore";

// On iOS the overlay draws above RN `Modal`s, so toasts show over dialogs (as
// sonner does on the web). On Android a `Modal` still covers them.
const FullWindowOverlay = Platform.OS === "ios" ? RNFullWindowOverlay : Fragment;

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

function ToastIcon({ item }: { item: ToastItem }) {
  const scheme = useScheme();
  const size = 22;
  switch (item.variant) {
    case "success":
      return <IconCircleCheck size={size} color={palette.success[scheme]} />;
    case "error":
      return <IconCircleX size={size} color={palette.danger[scheme]} />;
    case "warning":
      return <IconAlertTriangle size={size} color={palette.warning[scheme]} />;
    case "info":
      return <IconInfoCircle size={size} color={tokens.color.muted[scheme]} />;
    case "loading":
      return <ActivityIndicator size="small" color={tokens.color.muted[scheme]} />;
    default:
      return null;
  }
}

function ToastCard({ item }: { item: ToastItem }) {
  const largerText = useLargerText();
  const scheme = useScheme();

  useEffect(() => {
    if (!Number.isFinite(item.duration)) return;
    const timer = setTimeout(() => toast.dismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      item.description ? `${item.title}. ${item.description}` : item.title,
    );
  }, [item.title, item.description]);

  return (
    <NativeOnlyAnimatedView
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition}
    >
      <FloatingSurface radius={FLOATING_ROW_RADIUS}>
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
            <Text
              className={cn(
                "font-instrument-sans-semibold",
                largerText ? "text-lg" : "text-base",
              )}
              style={[textStyle("foreground", scheme), typeStyle("semibold")]}
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
      </FloatingSurface>
    </NativeOnlyAnimatedView>
  );
}

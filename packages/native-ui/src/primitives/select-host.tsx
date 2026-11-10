import * as SelectPrimitive from "@rn-primitives/select";
import * as React from "react";
import { Modal, Platform, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import { useReduceMotion } from "../useReduceMotion";

/**
 * Where `SelectContent` draws its options.
 *
 * - Android: rendered directly (no Portal; a Modal inside a portal mounts empty)
 *   as a transparent RN `Modal` with a full-size `box-none` host, as
 *   `DropdownMenuContent` and `OverlayModal` have. A portal alone loses the
 *   elevation fight with an absolute tab bar or glass layer, so the options
 *   drew behind them and could not be tapped. The Modal is its own window.
 *   Android back closes the Select (the Modal needs `onRequestClose`).
 * - iOS: `FullWindowOverlay`, which sits above native navigation chrome.
 * - Web: no wrapper; Radix owns the layering.
 *
 * Read `Platform.OS` at render, not at import, so a test can switch it.
 */
export function SelectHost({ children }: { children: React.ReactNode }) {
  const { open, onOpenChange, setTriggerPosition, setContentLayout } =
    SelectPrimitive.useRootContext();
  const reduceMotion = useReduceMotion();
  if (Platform.OS === "android") {
    // No Portal here, so the primitive's own `open` gate does not apply.
    if (!open) return null;
    const close = () => {
      setTriggerPosition(null);
      setContentLayout(null);
      onOpenChange(false);
    };
    return (
      <Modal
        visible
        transparent
        animationType={reduceMotion ? "none" : "fade"}
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={{ flex: 1 }} pointerEvents="box-none" testID="SelectContent-host">
          {children}
        </View>
      </Modal>
    );
  }
  if (Platform.OS === "ios") {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }
  return <>{children}</>;
}

import * as SelectPrimitive from "@rn-primitives/select";
import * as React from "react";
import { Modal, Platform, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";

/**
 * Where `SelectContent` draws its options.
 *
 * - Android: a transparent RN `Modal` with a full-size `box-none` host, as
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
  const { onOpenChange, setTriggerPosition, setContentLayout } = SelectPrimitive.useRootContext();
  if (Platform.OS === "android") {
    const close = () => {
      setTriggerPosition(null);
      setContentLayout(null);
      onOpenChange(false);
    };
    return (
      <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
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

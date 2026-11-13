import * as SelectPrimitive from "@rn-primitives/select";
import * as React from "react";
import { Modal, Platform, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import { useReduceMotion } from "../useReduceMotion";

/**
 * Where `SelectContent` draws its options.
 *
 * - Android: a transparent RN `Modal` with a full-size `box-none` host, as
 *   `DropdownMenuContent` and `OverlayModal` use. The Modal is its own window,
 *   so options sit above an absolute tab bar or glass layer. `SelectContent`
 *   renders this host without a Portal, because a Modal inside a portal mounts
 *   empty. With no Portal there is no `open` gate from the primitive, so the
 *   host mounts the Modal only while the Select is open. Android back closes it.
 * - iOS: `FullWindowOverlay`, which sits above native navigation chrome.
 * - Web: no wrapper. Radix owns the layering.
 *
 * `Platform.OS` is read at render, not at import, so a test can switch it.
 */
export function SelectHost({ children }: { children: React.ReactNode }) {
  const { open, onOpenChange, setTriggerPosition, setContentLayout } =
    SelectPrimitive.useRootContext();
  const reduceMotion = useReduceMotion();

  if (Platform.OS === "ios") {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }
  if (Platform.OS !== "android") {
    return <>{children}</>;
  }
  if (!open) {
    return null;
  }

  const close = () => {
    setTriggerPosition(null);
    setContentLayout(null);
    onOpenChange(false);
  };

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType={reduceMotion ? "none" : "fade"}
      onRequestClose={close}
    >
      <View style={{ flex: 1 }} pointerEvents="box-none" testID="SelectContent-host">
        {children}
      </View>
    </Modal>
  );
}

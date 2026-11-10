import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetDefaultBackdropProps } from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types";
import { IconX } from "@tabler/icons-react-native";
import { useColorScheme } from "nativewind";
import React, { useCallback } from "react";
import {
  Platform,
  Text,
  TouchableOpacity,
  View,
  type ViewProps,
} from "react-native";
import { Colors } from "./colors";
import { textStyle, typeStyle } from "./controlStyles";
import { floatingSolidFill } from "./floating";
import { GlassSheetBackground } from "./LiquidGlass";
import { useLargerText } from "./theme";

// One snap point, set explicitly. With dynamic sizing the sheet can measure to
// height 0 on Android and never appear.
const SNAP_POINTS = ["40%"];
const SHEET_RADIUS = 20;

/**
 * Opaque sheet chrome for Android. The glass background needs a measured blur
 * target, which is not reliable once an RN `Modal` has been dismissed.
 */
function SolidSheetBackground({
  style,
  pointerEvents,
}: {
  style?: ViewProps["style"];
  pointerEvents?: ViewProps["pointerEvents"];
}) {
  const { colorScheme } = useColorScheme();
  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        style,
        {
          backgroundColor: floatingSolidFill[colorScheme === "dark" ? "dark" : "light"],
          borderTopLeftRadius: SHEET_RADIUS,
          borderTopRightRadius: SHEET_RADIUS,
        },
      ]}
    />
  );
}

function SheetBackdrop(props: BottomSheetDefaultBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.5}
    />
  );
}

/**
 * A controlled bottom sheet over the screen, built on gorhom's default-export
 * `BottomSheet` (the named `BottomSheet` export is undefined).
 *
 * It renders nothing while `visible` is false. A closed gorhom sheet still lays
 * out an absolute-fill host that can cover the triggers beneath it, and
 * `BottomSheetModal.present()` did nothing after an RN `Modal` had been
 * dismissed on Android.
 */
export function BottomSheetContainer({
  visible,
  onClose,
  title,
  children,
  closeTestID,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeTestID?: string;
}) {
  const largerText = useLargerText();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const renderBackdrop = useCallback(
    (props: BottomSheetDefaultBackdropProps) => <SheetBackdrop {...props} />,
    [],
  );

  if (!visible) {
    return null;
  }

  return (
    <BottomSheet
      index={0}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture
      keyboardBehavior="interactive"
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundComponent={
        Platform.OS === "android" ? SolidSheetBackground : GlassSheetBackground
      }
      handleIndicatorStyle={{
        backgroundColor: isDark ? Colors.white : Colors.neutral[800],
      }}
    >
      {/* Padding is a style, not a NativeWind class: `BottomSheetView` does not
          always apply `className`, and an unpadded sheet can measure too small. */}
      <BottomSheetView style={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <Text
            accessibilityRole="header"
            className={`${largerText ? "text-2xl" : "text-xl"} flex-1 font-instrument-sans-semibold`}
            style={[textStyle("foreground", isDark ? "dark" : "light"), typeStyle("semibold")]}
          >
            {title}
          </Text>
          <TouchableOpacity
            testID={closeTestID}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            className="-mr-2 h-12 w-12 items-center justify-center"
            hitSlop={8}
            activeOpacity={0.7}
          >
            <IconX size={largerText ? 32 : 28} color={isDark ? "white" : "black"} />
          </TouchableOpacity>
        </View>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

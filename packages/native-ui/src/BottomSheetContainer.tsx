import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  type ViewProps,
} from "react-native";
import React, { useRef, useCallback, useMemo, JSX } from "react";
import { useColorScheme } from "nativewind";
import { Colors } from "./colors";
import { textStyle, typeStyle } from "./controlStyles";
import { IconX } from "@tabler/icons-react-native";
import { BottomSheetDefaultBackdropProps } from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types";
import { GlassSheetBackground } from "./LiquidGlass";
import { floatingSolidFill } from "./floating";
import { useLargerText } from "./theme";

/** Opaque sheet chrome on Android — glass blur needs a measured target and can fail after Modal dismiss. */
function SolidSheetBackground({
  style,
  pointerEvents,
}: {
  style?: ViewProps["style"];
  pointerEvents?: ViewProps["pointerEvents"];
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        style,
        {
          backgroundColor: isDark
            ? floatingSolidFill.dark
            : floatingSolidFill.light,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
      ]}
    />
  );
}

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
  const sheetRef = useRef<React.ElementRef<typeof BottomSheet>>(null);
  const largerText = useLargerText();
  const { colorScheme } = useColorScheme();
  // Explicit snap so the sheet cannot measure to height 0 on Android.
  const snapPoints = useMemo(() => ["40%"], []);

  const renderBackdrop = useCallback(
    (props: JSX.IntrinsicAttributes & BottomSheetDefaultBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  // Unmount when closed: a closed gorhom BottomSheet still lays out an
  // absolute-fill host that can cover triggers underneath (and BottomSheetModal
  // present() was a no-op after RN Modal dismiss on Android).
  if (!visible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundComponent={
        Platform.OS === "android" ? SolidSheetBackground : GlassSheetBackground
      }
      handleIndicatorStyle={{
        backgroundColor:
          colorScheme === "dark" ? Colors.white : Colors.neutral[800],
      }}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      enablePanDownToClose
      keyboardBehavior="interactive"
    >
      {/* Padding via style, not NativeWind className: gorhom's BottomSheetView
          does not always pick up className, and a zero-padded sheet can measure
          too small to present. */}
      <BottomSheetView style={{ padding: 20, paddingBottom: 48 }}>
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <Text
            accessibilityRole="header"
            className={`${largerText ? "text-2xl" : "text-xl"} flex-1 font-instrument-sans-semibold`}
            style={[
              textStyle("foreground", colorScheme === "dark" ? "dark" : "light"),
              typeStyle("semibold"),
            ]}
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
            <IconX
              size={largerText ? 32 : 28}
              color={colorScheme === "dark" ? "white" : "black"}
            />
          </TouchableOpacity>
        </View>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

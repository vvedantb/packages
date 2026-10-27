import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { View, Text, TouchableOpacity } from "react-native";
import { useRef, useEffect, useCallback, JSX } from "react";
import { useColorScheme } from "nativewind";
import { Colors } from "./colors";
import { textStyle, typeStyle } from "./controlStyles";
import { IconX } from "@tabler/icons-react-native";
import { BottomSheetDefaultBackdropProps } from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types";
import { GlassSheetBackground } from "./LiquidGlass";
import { useLargerText } from "./theme";

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
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const largerText = useLargerText();
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

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

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      backgroundComponent={GlassSheetBackground}
      handleIndicatorStyle={{
        backgroundColor:
          colorScheme === "dark" ? Colors.white : Colors.neutral[800],
      }}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      keyboardBehavior="interactive"
    >
      <BottomSheetView className="p-5 pb-12">
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
            onPress={() => bottomSheetModalRef.current?.dismiss()}
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
    </BottomSheetModal>
  );
}

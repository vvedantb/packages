import { View } from "react-native";
import { NativeBottomSheetSection } from "../src/sections/native-bottom-sheet";

export default function Screen() {
  return (
    <View style={{ flex: 1 }} testID="screen-native-bottom-sheet">
      <NativeBottomSheetSection />
    </View>
  );
}

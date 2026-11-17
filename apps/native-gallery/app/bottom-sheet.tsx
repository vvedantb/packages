import { View } from "react-native";
import { BottomSheetSection } from "../src/sections/bottom-sheet";

export default function Screen() {
  return (
    <View style={{ flex: 1 }} testID="screen-bottom-sheet">
      <BottomSheetSection />
    </View>
  );
}

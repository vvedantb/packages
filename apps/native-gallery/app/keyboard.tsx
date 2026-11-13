import { View } from "react-native";
import { KeyboardSection } from "../src/sections/keyboard";

export default function Screen() {
  return (
    <View style={{ flex: 1 }} testID="screen-keyboard">
      <KeyboardSection />
    </View>
  );
}

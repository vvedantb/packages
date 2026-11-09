import { View } from "react-native";
import { LayeringSection } from "../src/sections/layering";

export default function Screen() {
  return (
    <View style={{ flex: 1 }} testID="screen-layering">
      <LayeringSection />
    </View>
  );
}

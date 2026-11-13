import { View } from "react-native";
import { AuthSection } from "../src/sections/auth";

export default function Screen() {
  return (
    <View style={{ flex: 1 }} testID="screen-auth">
      <AuthSection />
    </View>
  );
}

import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AuthSection } from "../src/sections/auth";

export default function Screen() {
  // `/auth?mode=reset` is where the sign-in form's "Forgot password?" link goes.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return (
    <View style={{ flex: 1 }} testID="screen-auth">
      <AuthSection initial={mode === "reset" ? "reset" : "sign-in"} />
    </View>
  );
}

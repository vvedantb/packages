import { Button } from "@vvedantb/native-ui/button";
import { router } from "expo-router";
import { View } from "react-native";
import { GText } from "./ui";

/** A back button and title for the gallery's own screens. */
export function RouterStackPageHeaderBack({ title }: { title: string }) {
  return (
    <View className="gap-2">
      <Button testID="back" variant="ghost" size="sm" fullWidth={false} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}>
        Back
      </Button>
      <GText accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700" }}>{title}</GText>
    </View>
  );
}

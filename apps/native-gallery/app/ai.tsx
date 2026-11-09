import { AiChatGallery } from "@vvedantb/native-ui/ai-gallery";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Ai() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top }} testID="screen-ai">
      <AiChatGallery />
    </View>
  );
}

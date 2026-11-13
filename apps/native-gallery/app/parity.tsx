import { ParityGallery } from "@vvedantb/native-ui/gallery";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Parity() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top }} testID="screen-parity">
      <ParityGallery />
    </View>
  );
}

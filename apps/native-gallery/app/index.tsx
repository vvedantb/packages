import { Link } from "expo-router";
import { View } from "react-native";
import { Label, Switch } from "@vvedantb/native-ui";
import { Button } from "@vvedantb/native-ui/button";
import { useGallery } from "../src/GalleryContext";
import { SCREENS, SECTIONS } from "../src/sections";
import { Block, GText, Page } from "../src/ui";

export default function Home() {
  const { largerText, setLargerText, dark, setDark } = useGallery();
  return (
    <Page testID="home">
      <GText accessibilityRole="header" style={{ fontSize: 28, fontWeight: "700" }}>
        Native UI gallery
      </GText>
      <Block title="Display">
        <View className="flex-row items-center justify-between">
          <Label>Larger text</Label>
          <Switch testID="toggle-larger-text" accessibilityLabel="Larger text" checked={largerText} onCheckedChange={setLargerText} />
        </View>
        <View className="flex-row items-center justify-between">
          <Label>Dark mode</Label>
          <Switch testID="toggle-dark" accessibilityLabel="Dark mode" checked={dark} onCheckedChange={setDark} />
        </View>
      </Block>
      <Block title="Screens">
        {[...SCREENS, ...SECTIONS].map((item) => (
          <Link key={item.id} href={("Component" in item ? `/section/${item.id}` : `/${item.id}`) as never} asChild>
            <Button testID={`link-${item.id}`} variant="outline">
              {item.title}
            </Button>
          </Link>
        ))}
      </Block>
    </Page>
  );
}

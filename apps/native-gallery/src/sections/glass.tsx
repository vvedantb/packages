// Floating and glass chrome: surfaces, blur target, FAB and the tab bar with static props.
import { Text, View } from "react-native";
import { IconHome, IconPlus, IconSettings } from "@tabler/icons-react-native";
import { FloatingFAB, FloatingSurface, FloatingTabBar, GlassBlurProvider, GlassBlurTarget, GlassSheetBackground, LiquidGlass } from "@vvedantb/native-ui";
import { TabScreen } from "@vvedantb/native-ui/expo-router";
import { Block, GText } from "../ui";

const ROUTES = [
  { key: "home", name: "home" },
  { key: "search", name: "search" },
  { key: "settings", name: "settings" },
] as const;

/** The three fields `FloatingTabBar` reads from Expo Router's `Tabs`, with the first tab focused. */
export const TAB_BAR_PROPS = {
  state: { index: 0, routes: ROUTES },
  descriptors: {
    home: { options: { title: "Home", tabBarIcon: ({ color }: { color: string }) => <IconHome size={22} color={color} /> } },
    search: { options: { title: "A very long tab label" } },
    settings: { options: { title: "Settings", tabBarIcon: ({ color }: { color: string }) => <IconSettings size={22} color={color} /> } },
  },
  navigation: { emit: () => ({ defaultPrevented: false }), navigate: () => undefined },
} as unknown as Parameters<typeof FloatingTabBar>[0];

export function GlassSection() {
  return (
    <>
      <Block title="FloatingSurface">
        <FloatingSurface className="p-4">
          <GText>Floating surface with blur</GText>
        </FloatingSurface>
        <FloatingSurface blur={false} elevated={false} className="p-4">
          <GText>Solid, flat</GText>
        </FloatingSurface>
      </Block>
      <Block title="GlassBlurProvider, GlassBlurTarget, LiquidGlass">
        <GlassBlurProvider>
          <GlassBlurTarget style={{ height: 120, backgroundColor: "#db2777", borderRadius: 16, justifyContent: "center" }}>
            <Text style={{ color: "white", textAlign: "center" }}>Content behind the glass</Text>
          </GlassBlurTarget>
          <View style={{ marginTop: -60, height: 56 }}>
            <LiquidGlass style={{ flex: 1, borderRadius: 28, justifyContent: "center", alignItems: "center" }}>
              <GText>Liquid glass</GText>
            </LiquidGlass>
          </View>
        </GlassBlurProvider>
      </Block>
      <Block title="TabScreen">
        <GlassBlurProvider>
          <View style={{ height: 120 }}>
            <TabScreen>
              <View testID="tab-screen" style={{ flex: 1, backgroundColor: "#db2777", borderRadius: 16, justifyContent: "center" }}>
                <Text style={{ color: "white", textAlign: "center" }}>Focused tab: blur target active</Text>
              </View>
            </TabScreen>
          </View>
        </GlassBlurProvider>
      </Block>
      <Block title="GlassSheetBackground">
        <View style={{ height: 80, borderRadius: 16, overflow: "hidden" }}>
          <GlassSheetBackground style={{ flex: 1 }} />
        </View>
      </Block>
      <Block title="FloatingFAB">
        <View className="h-20">
          <FloatingFAB label="New item" onPress={() => undefined} testID="gallery-fab">
            <IconPlus size={24} color="white" />
          </FloatingFAB>
        </View>
      </Block>
      <Block title="FloatingTabBar">
        <View style={{ height: 96 }}>
          <FloatingTabBar {...TAB_BAR_PROPS} />
        </View>
      </Block>
    </>
  );
}

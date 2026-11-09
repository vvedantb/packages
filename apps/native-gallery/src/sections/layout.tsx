// Layout containers, settings chrome, bot tiles, artifacts, theme colours and the Text primitive.
import { useState } from "react";
import { View } from "react-native";
import { IconFolder } from "@tabler/icons-react-native";
import { RouterStackPageHeader } from "@vvedantb/native-ui/expo-router";
import {
  ArtifactList,
  BotPinGrid,
  Colors,
  PinnedBotTile,
  SafeAreaContainer,
  ScreenContainer,
  SettingsEmptyState,
  SettingsField,
  SettingsSection,
  SettingsStack,
  SettingsToggleRow,
  Switch,
} from "@vvedantb/native-ui";
import { Text, TextClassContext } from "@vvedantb/native-ui/primitives";
import { Block, GText, LONG_TEXT } from "../ui";

export function LayoutSection() {
  const [on, setOn] = useState(true);
  const [opened, setOpened] = useState("none");
  return (
    <>
      <Block title="RouterStackPageHeader">
        <View style={{ height: 96 }}>
          <RouterStackPageHeader title="Details" fallbackHref="/" />
        </View>
      </Block>
      <Block title="SafeAreaContainer and ScreenContainer">
        <View style={{ height: 140, borderWidth: 1, borderColor: Colors.neutral[800] }}>
          <SafeAreaContainer>
            <GText>SafeAreaContainer content</GText>
          </SafeAreaContainer>
        </View>
        <View style={{ height: 140, borderWidth: 1, borderColor: Colors.neutral[800] }}>
          <ScreenContainer reserveTabBar>
            <GText>ScreenContainer content, tab bar space reserved</GText>
          </ScreenContainer>
        </View>
      </Block>
      <Block title="Settings chrome">
        <SettingsStack>
          <SettingsSection title="Notifications" description={LONG_TEXT}>
            <SettingsToggleRow title="Push" description={LONG_TEXT} action={<Switch checked={on} onCheckedChange={setOn} />} />
            <SettingsField label="Display name" description="Shown to others">
              <GText>Sample user</GText>
            </SettingsField>
          </SettingsSection>
          <SettingsEmptyState title="No devices" description="Nothing is linked yet." icon={IconFolder} />
        </SettingsStack>
      </Block>
      <Block title="PinnedBotTile and BotPinGrid">
        <BotPinGrid>
          <PinnedBotTile title="Research" leading={<GText>R</GText>} unread onPress={() => undefined} />
          <PinnedBotTile title={LONG_TEXT} leading={<GText>L</GText>} generating onPress={() => undefined} />
        </BotPinGrid>
      </Block>
      <Block title="ArtifactList">
        <ArtifactList
          rows={[
            { id: "a", title: "Summary.md", description: "Two pages" },
            { id: "b", title: LONG_TEXT, description: LONG_TEXT },
          ]}
          onOpen={setOpened}
          testID="artifact-list"
        />
        <GText testID="artifact-opened">{`Opened: ${opened}`}</GText>
        <ArtifactList rows={[]} onOpen={() => undefined} empty={<GText>No artifacts yet</GText>} />
      </Block>
      <Block title="Text and TextClassContext">
        <TextClassContext.Provider value="text-lg">
          <Text>Text through TextClassContext</Text>
        </TextClassContext.Provider>
      </Block>
    </>
  );
}

// Layout containers, settings chrome, bot tiles, artifacts, theme colours and the Text primitive.
import { useState } from "react";
import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { IconArchive, IconFileText, IconFolder, IconTrash } from "@tabler/icons-react-native";
import { GestureHandlerProvider } from "@vvedantb/native-ui/gesture-handler";
import { InlineVideo } from "@vvedantb/native-ui/video";
import { HtmlView } from "@vvedantb/native-ui/webview";
import { RouterStackPageHeader } from "@vvedantb/native-ui/expo-router";
import {
  ArtifactList,
  BotPinGrid,
  Colors,
  ImageGallery,
  ImageViewer,
  Input,
  KeyboardAvoidingView,
  ListDivider,
  LoadingState,
  MediaCard,
  Pager,
  PillTabs,
  PinnedBotTile,
  SafeAreaContainer,
  ScreenContainer,
  SettingsEmptyState,
  SettingsField,
  SettingsSection,
  SettingsStack,
  SettingsToggleRow,
  SkeletonList,
  SkeletonRow,
  SurfaceRow,
  SwipeableRow,
  Switch,
} from "@vvedantb/native-ui";
import { Button } from "@vvedantb/native-ui/button";
import { Text, TextClassContext } from "@vvedantb/native-ui/primitives";
import { Block, GText, LONG_TEXT } from "../ui";

const IMAGES = ["a", "b", "c", "d", "e"].map((seed) => ({
  url: `https://picsum.photos/seed/native-gallery-${seed}/800/600`,
  alt: `Sample image ${seed}`,
}));

const HTML = "<h1>Report</h1><p>A short HTML artifact with a <a href='https://example.com'>link</a>.</p>";

const PAGES = ["Chats", "Files", "Settings"];

export function LayoutSection() {
  const [on, setOn] = useState(true);
  const [opened, setOpened] = useState("none");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [swiped, setSwiped] = useState("none");
  const pagerProgress = useSharedValue(0);
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
      <Block title="SurfaceRow, ListDivider and SwipeableRow">
        <GestureHandlerProvider>
          <SwipeableRow
            trailingActions={[
              { key: "archive", label: "Archive", icon: IconArchive, tone: "warning", onPress: () => setSwiped("archive") },
              { key: "delete", label: "Delete", icon: IconTrash, tone: "danger", onPress: () => setSwiped("delete") },
            ]}
          >
            <SurfaceRow accessibilityLabel="Open the weekly review chat" onPress={() => setOpened("weekly-review")} testID="surface-row">
              <GText>Weekly review</GText>
            </SurfaceRow>
          </SwipeableRow>
          <ListDivider />
          <SurfaceRow accessibilityLabel="Open the long chat" onPress={() => setOpened("long")}>
            <GText>{LONG_TEXT}</GText>
          </SurfaceRow>
          <ListDivider inset={16} />
          <GText testID="swipe-action">{`Swipe action: ${swiped}`}</GText>
        </GestureHandlerProvider>
      </Block>
      <Block title="Pager">
        {/* Tabs linked to the pager's `progress`, as an app's paged screen uses them: the
            sliding indicator's worklet runs only with `progress` (e2e "pager"). */}
        <PillTabs<string>
          options={PAGES.map((label, index) => ({ id: label, label, testID: `pager-tab-${index}` }))}
          value={PAGES[page] ?? "Chats"}
          onChange={(id) => setPage(PAGES.indexOf(id))}
          progress={pagerProgress}
        />
        <GestureHandlerProvider>
          <View style={{ height: 96 }}>
            <Pager
              index={page}
              count={PAGES.length}
              onIndexChange={setPage}
              progress={pagerProgress}
              renderPage={(index) => <GText>{`Page ${index + 1} of ${PAGES.length}: ${PAGES[index]}`}</GText>}
            />
          </View>
        </GestureHandlerProvider>
        <Button variant="outline" onPress={() => setPage((page + 1) % PAGES.length)} testID="pager-next">
          Next page
        </Button>
      </Block>
      <Block title="LoadingState, SkeletonList and SkeletonRow">
        <LoadingState label="Loading chats" />
        <LoadingState label={LONG_TEXT} paused />
        <SkeletonList label="Loading chats" count={3} renderRow={(index) => <SkeletonRow index={index} leading={32} lines={2} />} />
        <SkeletonRow lines={1} trailing={false} />
      </Block>
      <Block title="MediaCard, ImageGallery and ImageViewer">
        <MediaCard icon={IconFileText} title="Summary.pdf" description="Two pages" onPress={() => setOpened("summary")} testID="media-card" />
        <MediaCard icon={IconFileText} title={LONG_TEXT} description={LONG_TEXT} />
        <ImageGallery images={IMAGES.slice(0, 1)} />
        <ImageGallery images={IMAGES} onOpenImage={setOpened} testID="image-gallery" />
        <Button variant="outline" onPress={() => setViewerIndex(0)} testID="image-viewer-open">
          Open ImageViewer
        </Button>
        <ImageViewer images={IMAGES} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} />
      </Block>
      <Block title="InlineVideo and HtmlView">
        <InlineVideo url="https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4" accessibilityLabel="Play the sample video" testID="inline-video" />
        <HtmlView html={HTML} title="Report" height={160} onOpenLink={setOpened} testID="html-view" />
      </Block>
      <Block title="KeyboardAvoidingView">
        <KeyboardAvoidingView behavior="padding">
          <Input placeholder="Stays above the keyboard" />
        </KeyboardAvoidingView>
      </Block>
      <Block title="Text and TextClassContext">
        <TextClassContext.Provider value="text-lg">
          <Text>Text through TextClassContext</Text>
        </TextClassContext.Provider>
      </Block>
    </>
  );
}

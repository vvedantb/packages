import {
  Conversation,
  ConversationDock,
  ConversationList,
  ConversationScrollButton,
  Message,
  MessageContent,
  PromptInput,
} from "@vvedantb/native-ui/ai";
import { KeyboardControllerProvider } from "@vvedantb/native-ui/keyboard-controller";
import { Button } from "@vvedantb/native-ui/button";
import {
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  MenuSheet,
  SheetRow,
} from "@vvedantb/native-ui";
import { ImageViewer } from "@vvedantb/native-ui/primitives";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GText } from "../src/ui";

// A long chat as an app builds one: an inverted `ConversationList` under the
// keyboard providers, with a hold menu on every message. The e2e
// `chatHold` scenario scrolls up, holds an older message, lifts, and swipes
// the backdrop: the list must stay where the reader left it.

type Row = { id: string; from: "user" | "assistant"; text: string };

const THREAD: Row[] = Array.from({ length: 40 }, (_, index) => ({
  id: String(index + 1),
  from: index % 2 === 0 ? "user" : "assistant",
  text: `Chat message ${index + 1}: ${"a line of text that wraps over two rows on a phone. ".repeat(2)}`,
}));
const VIEWER_IMAGES = [{ url: "https://picsum.photos/seed/chat-hold/800/600", alt: "Mock viewer image" }];

// Newest first, as the inverted list draws row 0 at the bottom.
const NEWEST_FIRST = [...THREAD].reverse();

export default function ChatHold() {
  // The chat with and without the keyboard providers, to tell which part moves the list.
  const [keyboard, setKeyboard] = useState(true);
  const toggle = (
    <Button testID="chat-hold-keyboard" size="sm" variant="outline" onPress={() => setKeyboard(!keyboard)}>
      {`Keyboard providers: ${keyboard ? "on" : "off"}`}
    </Button>
  );
  return keyboard ? (
    <KeyboardProvider>
      <KeyboardControllerProvider>
        <Chat toggle={toggle} />
      </KeyboardControllerProvider>
    </KeyboardProvider>
  ) : (
    <Chat toggle={toggle} />
  );
}

function Chat({ toggle }: { toggle: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState("");
  const [chosen, setChosen] = useState("none");
  // An image opened over the chat, as a phone opens a message's attachment: the viewer is a Modal too.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  // The other overlays an app opens over a chat (a sheet, a confirm, a dropdown): do they move the list too?
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);

  return (
        <View style={{ flex: 1, paddingTop: insets.top }} testID="screen-chat-hold">
          {toggle}
          <Button testID="chat-hold-open-image" size="sm" variant="outline" onPress={() => setViewerIndex(0)}>
            Open image
          </Button>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button testID="chat-hold-open-sheet" size="sm" variant="outline" onPress={() => setSheet(true)}>
              Sheet
            </Button>
            <Button testID="chat-hold-open-dialog" size="sm" variant="outline" onPress={() => setDialog(true)}>
              Dialog
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger testID="chat-hold-open-dropdown" accessibilityLabel="Dropdown" className="h-11 px-3 justify-center">
                <GText>Dropdown</GText>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => undefined}>Check item</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
          <MenuSheet open={sheet} onOpenChange={setSheet} title="Check sheet">
            <SheetRow title="Check row" onPress={() => setSheet(false)} />
          </MenuSheet>
          <ConfirmDialog open={dialog} onOpenChange={setDialog} title="Check dialog" description="Mock confirm." confirmLabel="OK" onConfirm={() => undefined} />
          <ImageViewer
            images={VIEWER_IMAGES}
            index={viewerIndex}
            onIndexChange={setViewerIndex}
            onClose={() => setViewerIndex(null)}
          />
          <GText testID="chat-hold-result">{`Chose: ${chosen}`}</GText>
          <Conversation>
            <ConversationList
              inverted
              data={NEWEST_FIRST}
              keyExtractor={(row) => row.id}
              contentContainerClassName="gap-3"
              renderItem={({ item }) => (
                <Message
                  from={item.from}
                  testID={`chat-hold-message-${item.id}`}
                  menu={() => ({
                    actions: [{ key: "copy", label: "Copy text", onPress: () => setChosen(`copy ${item.id}`) }],
                  })}
                >
                  <MessageContent>{item.text}</MessageContent>
                </Message>
              )}
            />
            <ConversationScrollButton />
            <ConversationDock>
              <PromptInput value={draft} onChangeText={setDraft} onSubmit={() => setDraft("")} />
            </ConversationDock>
          </Conversation>
        </View>
  );
}

// Keyboard stress: inputs and the PromptInput composer, inline and stacked.
// `PromptInput` wraps itself in `KeyboardAvoidingView behavior="padding"`, which
// edge-to-edge Android needs, so this screen does not add a second one (that
// would lift the composer twice).
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconPaperclip } from "@tabler/icons-react-native";
import { Input, Textarea, tokens } from "@vvedantb/native-ui";
import { useScheme } from "../useScheme";
import { PromptInput, PromptInputButton, ReplyQuoteChip } from "@vvedantb/native-ui/ai";
import { Button } from "@vvedantb/native-ui/button";
import { GText } from "../ui";

/** Measures the composer wrapper and prints its height, so a Maestro flow can assert growth. */
function Measured({ id, children }: { id: string; children: React.ReactNode }) {
  const [height, setHeight] = useState(0);
  return (
    <View onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}>
      <GText testID={`${id}-height`} style={{ paddingHorizontal: 16, fontSize: 12 }}>{`${id} height: ${height}`}</GText>
      {children}
    </View>
  );
}

export function KeyboardSection() {
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  const [layout, setLayout] = useState<"inline" | "stacked">("inline");
  const [sent, setSent] = useState<string[]>([]);
  const [reply, setReply] = useState(true);
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.background[scheme] }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, padding: 16, paddingTop: insets.top + 12 }}>
        <GText style={{ fontSize: 18, fontWeight: "600" }}>Keyboard</GText>
        <Input testID="kb-input-1" placeholder="First input" />
        <Input testID="kb-input-2" placeholder="Second input" />
        <Textarea testID="kb-textarea" placeholder="Notes" />
        <View className="flex-row gap-2">
          <Button testID="kb-layout-inline" size="sm" fullWidth={false} variant={layout === "inline" ? "default" : "outline"} onPress={() => setLayout("inline")}>
            Inline
          </Button>
          <Button testID="kb-layout-stacked" size="sm" fullWidth={false} variant={layout === "stacked" ? "default" : "outline"} onPress={() => setLayout("stacked")}>
            Stacked
          </Button>
        </View>
        <GText testID="kb-sent-count">{`Sent: ${sent.length}`}</GText>
        {sent.map((text, index) => (
          <GText key={index} testID={`kb-sent-${index}`}>{text}</GText>
        ))}
      </ScrollView>
      <Measured id="composer">
        <PromptInput
          key={layout}
          testID="composer"
          layout={layout}
          onSubmit={(text) => setSent((items) => [...items, text])}
          replyTo={reply ? <ReplyQuoteChip author="Sam" text="An earlier message to answer" onDismiss={() => setReply(false)} /> : undefined}
          leading={layout === "inline" ? <PromptInputButton icon={IconPaperclip} label="Attach" onPress={() => undefined} /> : undefined}
          toolbar={layout === "stacked" ? <PromptInputButton icon={IconPaperclip} label="Attach" onPress={() => undefined} /> : undefined}
        />
      </Measured>
    </View>
  );
}

// Keyboard stress: inputs and the PromptInput composer, inline and stacked.
// `PromptInput` wraps itself in `KeyboardAvoidingView behavior="padding"`, which
// edge-to-edge Android needs, so this screen does not add a second one (that
// would lift the composer twice).
import { useState } from "react";
import { ScrollView, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconPaperclip } from "@tabler/icons-react-native";
import { Input, Textarea, tokens } from "@vvedantb/native-ui";
import { useScheme } from "../useScheme";
import { PromptInput, PromptInputButton, ReplyQuoteChip } from "@vvedantb/native-ui/ai";
import { Button } from "@vvedantb/native-ui/button";
import { GText } from "../ui";

/**
 * Measures the composer wrapper. The readout is not a child of the wrapper:
 * the caller puts it at the top of the screen, so the keyboard never covers it
 * and a Maestro flow can always read it.
 */
function useMeasured() {
  const [height, setHeight] = useState(0);
  return { height, onLayout: (e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height)) };
}

export function KeyboardSection() {
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  const [layout, setLayout] = useState<"inline" | "stacked">("inline");
  const [sent, setSent] = useState<string[]>([]);
  const [reply, setReply] = useState(true);
  const composer = useMeasured();
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.background[scheme] }}>
      {/* Always visible, above the scroll area and away from the keyboard. */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <GText testID="composer-height" style={{ fontSize: 12 }}>{`composer height: ${composer.height}`}</GText>
        <GText testID="kb-sent-count">{`Sent: ${sent.length}`}</GText>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, padding: 16, paddingTop: 8 }}>
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
        {sent.map((text, index) => (
          <GText key={index} testID={`kb-sent-${index}`}>{text}</GText>
        ))}
      </ScrollView>
      <View onLayout={composer.onLayout}>
        <PromptInput
          key={layout}
          testID="composer"
          layout={layout}
          onSubmit={(text) => setSent((items) => [...items, text])}
          replyTo={reply ? <ReplyQuoteChip author="Sam" text="An earlier message to answer" onDismiss={() => setReply(false)} /> : undefined}
          leading={layout === "inline" ? <PromptInputButton icon={IconPaperclip} label="Attach" onPress={() => undefined} /> : undefined}
          toolbar={layout === "stacked" ? <PromptInputButton icon={IconPaperclip} label="Attach" onPress={() => undefined} /> : undefined}
        />
      </View>
    </View>
  );
}

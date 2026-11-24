// Keyboard stress: inputs and the PromptInput composer, inline and stacked.
// `PromptInput` wraps itself in `KeyboardAvoidingView behavior="padding"`, which
// edge-to-edge Android needs, so this screen does not add a second one (that
// would lift the composer twice).
import { useState } from "react";
import { ScrollView, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconPaperclip, IconPlus } from "@tabler/icons-react-native";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Textarea, tokens } from "@vvedantb/native-ui";
import { useScheme } from "../useScheme";
import { PromptInput, PromptInputButton, ReplyQuoteChip } from "@vvedantb/native-ui/ai";
import { Button } from "@vvedantb/native-ui/button";
import { KeyboardControllerProvider } from "@vvedantb/native-ui/keyboard-controller";
import { PasteInputProvider } from "@vvedantb/native-ui/paste-input";
import { KeyboardProvider } from "react-native-keyboard-controller";
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
  const [pasted, setPasted] = useState(0);
  const [leadingKind, setLeadingKind] = useState<"attach" | "dd-default" | "dd-aschild">("attach");
  const [ddResult, setDdResult] = useState("none");
  const composer = useMeasured();
  // Repro for the Android DropdownMenu anchor bug: a menu whose trigger sits in the PromptInput
  // `leading` slot opens at the top-left, because measureInWindow returns zeros there.
  const ddItems = (
    <DropdownMenuContent align="start">
      <DropdownMenuItem testID="composer-dd-item-photo" onSelect={() => setDdResult("photo")}>
        Photo
      </DropdownMenuItem>
      <DropdownMenuItem testID="composer-dd-item-file" onSelect={() => setDdResult("file")}>
        File
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
  const leadingNode =
    leadingKind === "dd-default" ? (
      <DropdownMenu>
        <DropdownMenuTrigger testID="composer-dd-trigger" accessibilityLabel="Add" hitSlop={6} className="items-center justify-center" style={{ width: 44, height: 44 }}>
          <IconPlus size={20} color={tokens.color.foreground[scheme]} />
        </DropdownMenuTrigger>
        {ddItems}
      </DropdownMenu>
    ) : leadingKind === "dd-aschild" ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <PromptInputButton testID="composer-dd-aschild-trigger" icon={IconPlus} label="Add" onPress={() => undefined} />
        </DropdownMenuTrigger>
        {ddItems}
      </DropdownMenu>
    ) : (
      <PromptInputButton icon={IconPaperclip} label="Attach" onPress={() => undefined} />
    );
  return (
    <KeyboardProvider>
    <KeyboardControllerProvider>
    <View style={{ flex: 1, backgroundColor: tokens.color.background[scheme] }}>
      {/* Always visible, above the scroll area and away from the keyboard. */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <GText testID="composer-height" style={{ fontSize: 12 }}>{`composer height: ${composer.height}`}</GText>
        <GText testID="kb-sent-count">{`Sent: ${sent.length}`}</GText>
        <GText testID="kb-pasted-count">{`Pasted images: ${pasted}`}</GText>
        <GText testID="composer-dd-result">{`Composer menu: ${ddResult}`}</GText>
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
        <View className="flex-row gap-2">
          <Button testID="kb-leading-attach" size="sm" fullWidth={false} variant={leadingKind === "attach" ? "default" : "outline"} onPress={() => setLeadingKind("attach")}>
            Attach
          </Button>
          <Button testID="kb-leading-dd-default" size="sm" fullWidth={false} variant={leadingKind === "dd-default" ? "default" : "outline"} onPress={() => setLeadingKind("dd-default")}>
            Menu
          </Button>
          <Button testID="kb-leading-dd-aschild" size="sm" fullWidth={false} variant={leadingKind === "dd-aschild" ? "default" : "outline"} onPress={() => setLeadingKind("dd-aschild")}>
            Menu asChild
          </Button>
        </View>
        {sent.map((text, index) => (
          <GText key={index} testID={`kb-sent-${index}`}>{text}</GText>
        ))}
      </ScrollView>
      {/* Image paste (long-press Paste, the keyboard's image insert) through `expo-paste-input`. */}
      <PasteInputProvider>
      <View onLayout={composer.onLayout}>
        <PromptInput
          key={layout}
          testID="composer"
          layout={layout}
          onSubmit={(text) => setSent((items) => [...items, text])}
          onPasteImages={(uris) => setPasted((count) => count + uris.length)}
          replyTo={reply ? <ReplyQuoteChip author="Sam" text="An earlier message to answer" onDismiss={() => setReply(false)} /> : undefined}
          leading={layout === "inline" ? leadingNode : undefined}
          toolbar={layout === "stacked" ? <PromptInputButton icon={IconPaperclip} label="Attach" onPress={() => undefined} /> : undefined}
        />
      </View>
      </PasteInputProvider>
    </View>
    </KeyboardControllerProvider>
    </KeyboardProvider>
  );
}

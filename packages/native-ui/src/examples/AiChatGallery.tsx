// Reference screen for the AI chat parts (`@vvedantb/native-ui/ai`). Render
// `AiChatGallery` in a full-screen Expo route, with the same NativeWind setup
// as the rest of the package and a `SafeAreaProvider` above it. The thread is
// fixed sample text, not a model. It follows the app's larger-text setting.
// `ParityGallery` shows `AiChatSamples` in its "AI chat" section.
import { useState } from "react";
import { View } from "react-native";
import { IconFileText, IconPaperclip, IconSearch } from "@tabler/icons-react-native";
import {
  ActivityStep,
  AgentTrace,
  AgentTraceCollapsible,
  AgentTraceCollapsibleContent,
  AgentTraceCollapsibleTrigger,
  AgentTraceDescription,
  AgentTraceIcon,
  AgentTraceLine,
  AgentTraceTitle,
  Attachment,
  Attachments,
  CodeBlock,
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  FileChip,
  Message,
  MessageAction,
  MessageActionsBar,
  MessageContent,
  PromptInput,
  PromptInputButton,
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  ResponseText,
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
  Suggestion,
  Suggestions,
  formatElapsed,
  useStreamingDisclosure,
  type AttachmentData,
  type ChatStatus,
} from "../ai";

const SUGGESTIONS = [
  "Summarise this thread",
  "Draft a reply",
  "List the next steps",
  "Explain it more simply",
];

const SAMPLE_ATTACHMENTS: AttachmentData[] = [
  { id: "notes", filename: "meeting-notes.pdf", mediaType: "application/pdf" },
  { id: "sketch", filename: "sketch.png", mediaType: "image/png" },
];

const FINISHED_REASONING =
  "The question is how to keep one list the same on two devices.\nCompare a shared server copy with device-to-device sync, then suggest the simpler one.";

const FINISHED_REPLY =
  "Keep one copy of the list on a server and have each device read and write it.\n\nWhen a device changes an item, it sends the change with a timestamp. The other device fetches changes it has not seen.";

const SAMPLE_CODE = `type Change = {\n  itemId: string;\n  updatedAt: number;\n};`;

const STREAMING_REASONING =
  "Offline edits need to wait in a queue on the device.\nWhen the connection returns, send the queue in order and merge by timestamp…";

/**
 * The sample thread: a user message, a finished assistant message (folded
 * reasoning and trace, reply, code, sources and actions), a second user
 * message, and an assistant message that is still working while `streaming`.
 */
export function AiChatSamples({ streaming = true }: { streaming?: boolean }) {
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const searchFold = useStreamingDisclosure(streaming);
  const toggle = (kind: "like" | "dislike") => setFeedback(feedback === kind ? null : kind);

  return (
    <>
      <Message from="user">
        <MessageContent>How do I keep a list in sync across two devices?</MessageContent>
      </Message>

      <Message from="assistant">
        <MessageContent>
          <Reasoning duration={8}>
            <ReasoningTrigger />
            <ReasoningContent>{FINISHED_REASONING}</ReasoningContent>
          </Reasoning>
          <AgentTraceCollapsible>
            <AgentTraceCollapsibleTrigger>
              <AgentTraceLine>
                <AgentTraceIcon icon={IconSearch} />
                <AgentTraceTitle>Used 2 tools</AgentTraceTitle>
                <AgentTraceDescription>{`Worked for ${formatElapsed(14)}`}</AgentTraceDescription>
              </AgentTraceLine>
            </AgentTraceCollapsibleTrigger>
            <AgentTraceCollapsibleContent>
              <AgentTrace>
                <ActivityStep icon={IconSearch} label="Searched the web" description="5 results" />
                <AgentTraceLine>
                  <AgentTraceIcon icon={IconFileText} />
                  <AgentTraceTitle>Read</AgentTraceTitle>
                  <FileChip name="sync-notes.md" />
                </AgentTraceLine>
              </AgentTrace>
            </AgentTraceCollapsibleContent>
          </AgentTraceCollapsible>
          <ResponseText>{FINISHED_REPLY}</ResponseText>
          {/* The gallery has no clipboard: the button only shows its copied state. */}
          <CodeBlock language="ts" code={SAMPLE_CODE} onCopy={() => undefined} />
          <Sources>
            <SourcesTrigger count={2} />
            <SourcesContent>
              <Source href="https://example.com/sync" title="Syncing data between devices" />
              <Source href="https://example.com/timestamps" title="Merging changes by timestamp" />
            </SourcesContent>
          </Sources>
        </MessageContent>
        <MessageActionsBar>
          <MessageAction kind="copy" />
          <MessageAction kind="retry" />
          <MessageAction kind="like" selected={feedback === "like"} onPress={() => toggle("like")} />
          <MessageAction kind="dislike" selected={feedback === "dislike"} onPress={() => toggle("dislike")} />
        </MessageActionsBar>
      </Message>

      <Message from="user">
        <MessageContent>And when one device is offline?</MessageContent>
      </Message>

      <Message from="assistant">
        <MessageContent>
          <Reasoning isStreaming={streaming}>
            <ReasoningTrigger />
            <ReasoningContent>{STREAMING_REASONING}</ReasoningContent>
          </Reasoning>
          <AgentTraceCollapsible {...searchFold}>
            <AgentTraceCollapsibleTrigger>
              <AgentTraceLine>
                <AgentTraceIcon icon={IconSearch} />
                <AgentTraceTitle shimmer={streaming}>
                  {streaming ? "Searching for offline sync" : "Searched for offline sync"}
                </AgentTraceTitle>
              </AgentTraceLine>
            </AgentTraceCollapsibleTrigger>
            <AgentTraceCollapsibleContent>
              Offline-first sync, change queues, conflict handling
            </AgentTraceCollapsibleContent>
          </AgentTraceCollapsible>
          <ActivityStep
            icon={IconFileText}
            label={streaming ? "Reading sync-notes.md" : "Read sync-notes.md"}
            status={streaming ? "running" : "complete"}
            description={streaming ? undefined : `Worked for ${formatElapsed(6)}`}
          />
          {streaming ? null : (
            <ResponseText>
              {"Queue each change on the device while it is offline.\n\nWhen it reconnects, send the queue in order. If both devices changed the same item, keep the newer change."}
            </ResponseText>
          )}
        </MessageContent>
      </Message>
    </>
  );
}

/**
 * A full chat screen: the sample thread in a `Conversation` with its scroll
 * button, suggestions, and the composer with sample attachments and an
 * attach tool. The last message streams until Stop is pressed; then sent
 * messages are added to the thread.
 */
export function AiChatGallery() {
  const [status, setStatus] = useState<ChatStatus>("streaming");
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [attachments, setAttachments] = useState(SAMPLE_ATTACHMENTS);

  return (
    <View className="flex-1">
      <Conversation>
        <ConversationContent>
          <AiChatSamples streaming={status === "streaming"} />
          {sent.map((text, index) => (
            <Message key={`${index}-${text}`} from="user">
              <MessageContent>{text}</MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <Suggestions className="pt-2" contentContainerClassName="px-3">
        {SUGGESTIONS.map((suggestion) => (
          <Suggestion key={suggestion} suggestion={suggestion} onPress={setDraft} />
        ))}
      </Suggestions>
      <PromptInput
        value={draft}
        onChangeText={setDraft}
        status={status}
        onStop={() => setStatus("ready")}
        onSubmit={(text) => {
          setSent([...sent, text]);
          setAttachments([]);
        }}
        header={
          attachments.length > 0 ? (
            <Attachments>
              {attachments.map((attachment) => (
                <Attachment
                  key={attachment.id}
                  data={attachment}
                  onRemove={() => setAttachments(attachments.filter((item) => item.id !== attachment.id))}
                />
              ))}
            </Attachments>
          ) : null
        }
        toolbar={
          <PromptInputButton
            icon={IconPaperclip}
            label="Attach files"
            onPress={() => setAttachments(SAMPLE_ATTACHMENTS)}
          />
        }
      />
    </View>
  );
}

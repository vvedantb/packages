// AI parts that AiChatGallery does not show: tool and subagent cards, quotes, sheets, folds and Markdown.
import { useState } from "react";
import { View } from "react-native";
import { IconTrash } from "@tabler/icons-react-native";
import { ProviderIcon } from "@vvedantb/native-ui/brand";
import { Markdown } from "@vvedantb/native-ui/markdown";
import {
  ActivityStepDetail,
  AgentTraceFold,
  AgentTraceLine,
  ChatJumpRail,
  ChatTextColorContext,
  ChatThread,
  ChoiceQuestion,
  CodeBlock,
  CodeBlockCopyButton,
  Collapsible,
  CollapsibleContent,
  CollapsibleChevron,
  CollapsibleTrigger,
  Conversation,
  ConversationDock,
  ConversationList,
  DiffStat,
  Message,
  MessageActionSheet,
  MessageBotLabel,
  MessageContent,
  MessageMeta,
  MessageQuote,
  PromptInput,
  PromptInputChip,
  PromptInputMenu,
  PromptInputMenuItem,
  PromptInputSubmit,
  ReplyQuoteChip,
  ResponseText,
  Shimmer,
  SubagentResultCard,
  SubagentRunCard,
  ToolApprovalCard,
  ToolDraftCard,
  UnifiedDiff,
  type UnifiedDiffLine,
} from "@vvedantb/native-ui/ai";
import { Button } from "@vvedantb/native-ui/button";
import { Block, GText, LONG_TEXT } from "../ui";

const MARKDOWN = "# Heading\n\nSome **bold**, *italic* and `code`.\n\n- One\n- Two\n\n```ts\nconst a = 1;\n```";

const DIFF_LINES: UnifiedDiffLine[] = [
  { kind: "hunk", text: "@@ -1,4 +1,5 @@" },
  { kind: "context", text: "export function total(items: number[]) {", oldLine: 1, newLine: 1 },
  { kind: "removed", text: "  return items.reduce((a, b) => a + b);", oldLine: 2, newLine: null },
  { kind: "added", text: "  if (items.length === 0) return 0;", oldLine: null, newLine: 2 },
  { kind: "added", text: `  return items.reduce((a, b) => a + b, 0); // ${LONG_TEXT}`, oldLine: null, newLine: 3 },
  { kind: "context", text: "}", oldLine: 3, newLine: 4 },
];

const MARKED_LINES = new Set([3]);

const THREAD = [
  { id: "1", text: "Can you total the invoice lines?" },
  { id: "2", text: "Yes. The total is 42." },
  { id: "3", text: LONG_TEXT },
];

const COMMANDS = [
  { prefix: "/", label: "summarise", description: "Summarise the thread" },
  { prefix: "/", label: "translate", description: LONG_TEXT },
];

export function AiCardsSection() {
  const [command, setCommand] = useState("none");
  const [chip, setChip] = useState(false);
  const [diffLine, setDiffLine] = useState("none");
  const [decision, setDecision] = useState("none");
  const [sheet, setSheet] = useState(false);
  const [sheetResult, setSheetResult] = useState("none");
  const [jumped, setJumped] = useState("none");
  const [answers, setAnswers] = useState("none");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Block title="UnifiedDiff and DiffStat">
        <DiffStat additions={2} deletions={1} />
        <DiffStat additions={0} deletions={0} hideZero />
        <UnifiedDiff lines={DIFF_LINES} onLinePress={(index) => setDiffLine(String(index))} linePressHint="Marks the line" markedLines={MARKED_LINES} />
        <GText testID="diff-line">{`Diff line: ${diffLine}`}</GText>
      </Block>
      <Block title="PromptInputChip, PromptInputMenu and ProviderIcon">
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <PromptInputChip icon={<ProviderIcon provider="claude" size={14} />} label="Claude" suffix="High" expanded={chip} onPress={() => setChip(!chip)} />
          <PromptInputChip icon={<ProviderIcon provider="codex" size={14} />} label="Saved" count={12} chevron={false} size="touch" />
          <ProviderIcon provider="cursor" size={20} title="Cursor" />
        </View>
        <PromptInputMenu title="Commands" testID="prompt-menu">
          {COMMANDS.map((item) => (
            <PromptInputMenuItem
              key={item.label}
              prefix={item.prefix}
              label={item.label}
              description={item.description}
              selected={command === item.label}
              onPress={() => setCommand(item.label)}
              testID={`prompt-menu-${item.label}`}
            />
          ))}
        </PromptInputMenu>
        <PromptInputMenu title="Mentions" />
        <GText testID="prompt-command">{`Command: ${command}`}</GText>
      </Block>
      <Block title="ConversationList and ConversationDock">
        <View style={{ height: 240 }}>
          <Conversation>
            <ConversationList
              data={THREAD}
              keyExtractor={(row) => row.id}
              nestedScrollEnabled
              renderItem={({ item }) => <GText>{item.text}</GText>}
            />
            <ConversationDock>
              <GText>ConversationDock: the composer sits here</GText>
            </ConversationDock>
          </Conversation>
        </View>
      </Block>
      <Block title="ToolApprovalCard and ToolDraftCard">
        <ToolApprovalCard toolName="send_email" args={{ to: "someone@example.com", body: LONG_TEXT.repeat(3) }} onDecide={setDecision} />
        <ToolDraftCard toolName="create_event" args="title=Review" onDecide={setDecision} />
        <GText testID="tool-decision">{`Decision: ${decision}`}</GText>
      </Block>
      <Block title="SubagentRunCard and SubagentResultCard">
        <SubagentRunCard title="Researcher" status="running" elapsedSeconds={42} onCancel={() => undefined} />
        <SubagentRunCard title="Writer" status="failed" elapsedSeconds={3} />
        <SubagentResultCard title="Researcher" summary="Found three sources." detail={LONG_TEXT} />
      </Block>
      <Block title="ReplyQuoteChip, MessageQuote, MessageBotLabel, MessageMeta">
        <ReplyQuoteChip author="Sam" text={LONG_TEXT} onDismiss={() => undefined} />
        <MessageQuote author="Sam" text={LONG_TEXT} onPress={() => undefined} />
        <Message from="assistant">
          <MessageBotLabel name="Helper" />
          <MessageContent>
            <ResponseText>Reply from a bot in a group chat.</ResponseText>
          </MessageContent>
          <MessageMeta>10:42</MessageMeta>
        </Message>
      </Block>
      <Block title="MessageActionSheet">
        <Button testID="open-message-sheet" onPress={() => setSheet(true)}>
          Open message actions
        </Button>
        <GText testID="message-sheet-result">{`Chose: ${sheetResult}`}</GText>
        <MessageActionSheet
          open={sheet}
          onClose={() => setSheet(false)}
          actions={[
            { key: "copy", label: "Copy", onPress: () => setSheetResult("copy") },
            { key: "delete", label: "Delete", icon: IconTrash, destructive: true, onPress: () => setSheetResult("delete") },
          ]}
        />
      </Block>
      <Block title="ChoiceQuestion">
        <ChoiceQuestion
          questions={[{ question: "Which format?", header: "Format", multiSelect: false, options: [{ label: "PDF", description: "Fixed layout" }, { label: "Markdown", description: LONG_TEXT }] }]}
          onSubmit={(value) => setAnswers(JSON.stringify(value))}
        />
        <GText testID="choice-answers">{`Answers: ${answers}`}</GText>
      </Block>
      <Block title="ActivityStepDetail, AgentTraceFold, AgentTraceLine">
        <ActivityStepDetail step={{ type: "bash", command: "ls -la", output: { text: "total 0", exitCode: 0 } }} />
        <ActivityStepDetail step={{ type: "bash", hasHiddenDetail: true }} />
        <AgentTraceFold seconds={12}>
          <AgentTraceLine>
            <GText>Folded trace line</GText>
          </AgentTraceLine>
        </AgentTraceFold>
      </Block>
      <Block title="Collapsible">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger testID="collapsible-trigger">
            <View className="flex-row items-center gap-2">
              <GText>Show details</GText>
              <CollapsibleChevron open={open} size={16} color="#737373" />
            </View>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <GText testID="collapsible-body">{LONG_TEXT}</GText>
          </CollapsibleContent>
        </Collapsible>
      </Block>
      <Block title="ChatJumpRail">
        <ChatJumpRail items={[{ id: "1", label: "First question" }, { id: "2", label: LONG_TEXT }]} onJump={setJumped} testID="jump-rail" />
        <GText testID="jump-result">{`Jumped: ${jumped}`}</GText>
      </Block>
      <Block title="Shimmer and CodeBlockCopyButton">
        <Shimmer>Thinking</Shimmer>
        <CodeBlock code="const a = 1;" language="ts" />
        <CodeBlockCopyButton code="const a = 1;" onCopy={() => undefined} />
      </Block>
      <Block title="ChatTextColorContext and Markdown">
        <ChatTextColorContext.Provider value="#db2777">
          <Markdown>{MARKDOWN}</Markdown>
        </ChatTextColorContext.Provider>
      </Block>
      <Block title="ChatThread, PromptInput and PromptInputSubmit">
        <View style={{ height: 320 }}>
          <ChatThread
            messages={[{ id: "1", role: "user" }, { id: "2", role: "assistant" }]}
            working={false}
            renderMessage={(message) => (
              <Message key={message.id} from={message.role === "user" ? "user" : "assistant"}>
                <MessageContent>
                  <ResponseText>{message.role === "user" ? "Hello" : "Hi, how can I help?"}</ResponseText>
                </MessageContent>
              </Message>
            )}
            footer={<PromptInput onSubmit={() => undefined} />}
          />
        </View>
        <PromptInputSubmit status="ready" onSubmit={() => undefined} onStop={() => undefined} canSubmit />
      </Block>
    </>
  );
}

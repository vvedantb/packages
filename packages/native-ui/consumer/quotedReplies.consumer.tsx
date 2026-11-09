/**
 * Consumer-style type test for the 0.13.0 quoted-reply props of `/ai`.
 * Compiled by `tsconfig.consumer.json` with `strict` and `strictFunctionTypes`.
 * It never runs. Old call shapes stay in as a regression check: every new
 * prop is optional.
 */
import { IconCopy } from "@tabler/icons-react-native";
import {
  Message,
  MessageActionSheet,
  MessageContent,
  MessageQuote,
  PromptInput,
  ReplyQuoteChip,
  type MessageActionKind,
  type MessageSheetAction,
} from "../src/ai";

const actions: MessageSheetAction[] = [
  { key: "reply", label: "Reply", onPress: () => {} },
  { key: "copy", label: "Copy", icon: IconCopy, onPress: () => {} },
  { key: "delete", label: "Delete", destructive: true, onPress: () => {} },
];

// Existing shapes still compile.
export const oldShapes = (
  <>
    <Message from="user">
      <MessageContent>Hello</MessageContent>
    </Message>
    <PromptInput onSubmit={(text: string) => void text} />
  </>
);

export const newShapes = (
  <>
    <Message from="assistant" actions={actions} onLongPress={() => {}} highlighted actionSheetTitle="Reply to Ada">
      <MessageContent quote={<MessageQuote author="Ada" text="Friday" onPress={() => {}} testID="q" />}>
        Done
      </MessageContent>
    </Message>
    <MessageActionSheet open onClose={() => {}} actions={actions} title="Actions" cancelLabel="Close" />
    <PromptInput
      onSubmit={() => {}}
      replyTo={<ReplyQuoteChip author="Ada" text="Friday" onDismiss={() => {}} dismissLabel="Remove" />}
    />
  </>
);

export const kind: MessageActionKind = "reply";

// Tool and subagent cards and the bot label (0.13.0).
import {
  MessageBotLabel,
  SubagentResultCard,
  SubagentRunCard,
  ToolApprovalCard,
  ToolDraftCard,
  type ToolDecision,
} from "../src/ai";

const decide = (decision: ToolDecision) => {
  const _: "approve" | "deny" | "edit" = decision;
  void _;
};

export const cards = (
  <>
    <ToolApprovalCard toolName="send_email" args={{ to: "team" }} onDecide={decide} pending />
    <ToolDraftCard toolName="create_doc" args="Title: Plan" onDecide={decide} disabled />
    <SubagentRunCard title="Research" status="running" elapsedSeconds={12} onCancel={() => {}} />
    <SubagentResultCard title="Research" summary="Three sources" detail="Full text" />
    <Message from="assistant" bot={{ name: "Planner" }}>
      <MessageContent>Hello</MessageContent>
    </Message>
    <MessageBotLabel name="Planner" />
  </>
);

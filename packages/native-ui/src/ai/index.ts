// AI chat parts, ported from the `@vvedantb/ui` AI elements for touch. On the
// `@vvedantb/native-ui/ai` entry only, so apps without a chat do not bundle
// them. Generic: no model names and no app logic.
export { useStreamingDisclosure } from "./use-streaming-disclosure";
export { chatTextSize, formatElapsed, META_TEXT_STYLE, MONO_FONT } from "./chat-text";
export type { ChatTextKind } from "./chat-text";
export { Shimmer, SHIMMER_LOW_OPACITY } from "./shimmer";
export type { ShimmerProps } from "./shimmer";
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleChevron,
  useCollapsible,
} from "./collapsible";
export type { CollapsibleProps, CollapsibleTriggerProps } from "./collapsible";
export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  useConversation,
  isScrolledToBottom,
  AT_BOTTOM_THRESHOLD,
} from "./conversation";
export type {
  ConversationProps,
  ConversationContentProps,
  ConversationEmptyStateProps,
  ConversationScrollButtonProps,
} from "./conversation";
export {
  Message,
  MessageContent,
  MessageActionsBar,
  MessageAction,
  MessageMeta,
  MessageBotLabel,
  MESSAGE_ACTIONS,
  MESSAGE_HIGHLIGHT_MS,
  userBubbleStyle,
  tintBubbleStyle,
} from "./message";
export type {
  MessageRole,
  MessageProps,
  MessageContentProps,
  MessageBubble,
  MessageActionsBarProps,
  MessageMetaProps,
  MessageBot,
  MessageBotLabelProps,
  MessageActionKind,
  MessageActionProps,
} from "./message";
export { MessageActionSheet } from "./message-action-sheet";
export type { MessageActionSheetProps, MessageSheetAction } from "./message-action-sheet";
export { ReplyQuoteChip } from "./reply-quote-chip";
export type { ReplyQuoteChipProps } from "./reply-quote-chip";
export { MessageQuote, QUOTE_MAX_LINES } from "./message-quote";
export type { MessageQuoteProps } from "./message-quote";
export {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  useReasoning,
  reasoningMessage,
} from "./reasoning";
export type { ReasoningProps, ReasoningTriggerProps, ReasoningContentProps } from "./reasoning";
export {
  AgentTrace,
  AgentTraceLine,
  AgentTraceIcon,
  AgentTraceTitle,
  AgentTraceDescription,
  AgentTraceCollapsible,
  AgentTraceCollapsibleTrigger,
  AgentTraceCollapsibleContent,
  AgentTraceFold,
  traceLineColor,
} from "./trace";
export type {
  AgentTraceStatus,
  AgentTraceLineProps,
  AgentTraceIconProps,
  AgentTraceTitleProps,
  AgentTraceCollapsibleTriggerProps,
  AgentTraceFoldProps,
} from "./trace";
export {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "./chain-of-thought";
export type {
  ChainOfThoughtHeaderProps,
  ChainOfThoughtStepProps,
  ChainOfThoughtStepStatus,
} from "./chain-of-thought";
export { ActivityStep } from "./activity-step";
export type { ActivityStepProps, ActivityStepStatus } from "./activity-step";
export {
  PromptInput,
  PromptInputButton,
  PromptInputChip,
  PromptInputSubmit,
  PROMPT_INPUT_CHIP,
  isGenerating,
} from "./prompt-input";
export type {
  ChatStatus,
  PromptInputChipProps,
  PromptInputProps,
  PromptInputButtonProps,
  PromptInputSubmitProps,
} from "./prompt-input";
export { PromptInputMenu, PromptInputMenuItem, PROMPT_INPUT_MENU, promptInputMenuHeight } from "./prompt-input-menu";
export type { PromptInputMenuProps, PromptInputMenuItemProps } from "./prompt-input-menu";
export { Suggestions, Suggestion } from "./suggestion";
export type { SuggestionsProps, SuggestionProps } from "./suggestion";
export { Sources, SourcesTrigger, SourcesContent, Source, sourcesLabel } from "./sources";
export type { SourcesTriggerProps, SourceProps } from "./sources";
export { FileChip } from "./file-chip";
export type { FileChipProps } from "./file-chip";
export {
  Attachments,
  Attachment,
  getMediaCategory,
  getAttachmentLabel,
  ATTACHMENT_PRESS_TARGET,
} from "./attachments";
export type {
  AttachmentData,
  AttachmentMediaCategory,
  AttachmentVariant,
  AttachmentsProps,
  AttachmentProps,
} from "./attachments";
export { ChatThread } from "./chat-thread";
export type { ChatThreadProps, UIMessage } from "./chat-thread";
export { ChatJumpRail } from "./chat-jump-rail";
export type { ChatJumpRailProps, ChatJumpRailItem } from "./chat-jump-rail";
export { CodeBlock, CodeBlockCopyButton } from "./code-block";
export type { CodeBlockProps, CodeBlockCopyButtonProps } from "./code-block";
export { ResponseText, ChatTextColorContext } from "./response-text";
export type { ResponseTextProps } from "./response-text";
export { ChoiceQuestion, choiceAnswers } from "./choice-question";
export type { ChoiceQuestionProps, ChoiceQuestionItem } from "./choice-question";
export { ActivityStepDetail } from "./activity-step-detail";
export type { ActivityStepDetailProps, ActivityStepDetailStep } from "./activity-step-detail";
export { ToolApprovalCard, ToolDraftCard, summarizeArgs, ARGS_MAX_CHARS } from "./tool-approval-card";
export type { ToolApprovalCardProps, ToolDraftCardProps, ToolDecision } from "./tool-approval-card";
export { SubagentRunCard, SubagentResultCard, subagentStatusColors } from "./subagent-cards";
export type { SubagentRunCardProps, SubagentResultCardProps, SubagentStatus } from "./subagent-cards";

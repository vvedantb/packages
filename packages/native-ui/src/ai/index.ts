// AI chat parts, ported from the `@vvedantb/ui` AI elements for touch. On the
// `@vvedantb/native-ui/ai` entry only, so apps without a chat do not bundle
// them. Generic: no model names and no app logic.
export { useStreamingDisclosure } from "./use-streaming-disclosure";
export { chatTextSize, formatElapsed, MONO_FONT } from "./chat-text";
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
  MESSAGE_ACTIONS,
  userBubbleStyle,
} from "./message";
export type {
  MessageRole,
  MessageProps,
  MessageContentProps,
  MessageActionsBarProps,
  MessageActionKind,
  MessageActionProps,
} from "./message";
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
  traceLineColor,
} from "./trace";
export type {
  AgentTraceStatus,
  AgentTraceLineProps,
  AgentTraceIconProps,
  AgentTraceTitleProps,
  AgentTraceCollapsibleTriggerProps,
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
  PromptInputSubmit,
  isGenerating,
} from "./prompt-input";
export type {
  ChatStatus,
  PromptInputProps,
  PromptInputButtonProps,
  PromptInputSubmitProps,
} from "./prompt-input";
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
} from "./attachments";
export type {
  AttachmentData,
  AttachmentMediaCategory,
  AttachmentVariant,
  AttachmentsProps,
  AttachmentProps,
} from "./attachments";
export { CodeBlock, CodeBlockCopyButton } from "./code-block";
export type { CodeBlockProps, CodeBlockCopyButtonProps } from "./code-block";
export { ResponseText, ChatTextColorContext } from "./response-text";
export type { ResponseTextProps } from "./response-text";

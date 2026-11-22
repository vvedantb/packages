# Conversation

Source: `src/ai-elements/conversation.tsx`. Web gallery: `apps/ui-gallery`, section `ai`. Built on `use-stick-to-bottom`.

## Default usage

Give `Conversation` a height. It scrolls and sticks to the bottom as messages arrive.

```tsx
import { Conversation, ConversationContent, Message, MessageContent } from "@vvedantb/ui";

<Conversation className="h-96">
  <ConversationContent>
    {messages.map((message) => (
      <Message key={message.id} from={message.role}>
        <MessageContent>{message.text}</MessageContent>
      </Message>
    ))}
  </ConversationContent>
</Conversation>;
```

## Parts

| Part | Notes |
| --- | --- |
| `Conversation` | `StickToBottom` with `role="log"`. Takes its props |
| `ConversationContent` | Message column. Takes `StickToBottom.Content` props |
| `ConversationEmptyState` | Props `title`, `description`, `icon` |
| `ConversationScrollButton` | Shows when scrolled up. Props `label`, `icon`, `showDelay`, `resetKey` |
| `ConversationDownload` | Props `messages` (`{ role, content }[]`), `filename`, `formatMessage` |

## Composition

```tsx
<Conversation className="h-96">
  <ConversationContent>{/* messages */}</ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

## Native equivalent

`Conversation`, `ConversationContent`, `ConversationEmptyState` and `ConversationScrollButton` in `@vvedantb/native-ui`. Native also has `ConversationList`, `ConversationDock` and `ChatThread`.

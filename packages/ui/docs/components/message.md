# Message

Source: `src/ai-elements/message.tsx`. Web gallery: `apps/ui-gallery`, section `ai`.

## Default usage

```tsx
import { Message, MessageContent } from "@vvedantb/ui";

<Message from="assistant">
  <MessageContent>Two referrals wait for a panel date.</MessageContent>
</Message>;
```

`from` is required: a role of the `ai` package `UIMessage` (`"user"`, `"assistant"` or `"system"`). A user message sits on the right in a primary bubble. An assistant message has no bubble.

## Props

| Prop | Notes |
| --- | --- |
| `from` | Message role. Required |
| `actions` | `MessageMenuAction[]` (`key`, `label`, `onSelect`, and optional `icon`, `destructive`, `disabled`, `hover`). Adds a right-click menu and a hover toolbar for actions with an `icon` |
| `highlighted` | Soft ring on a quote target. Set it back to `false` after about 1.5 seconds |

Related parts: `MessageContent`, `MessageQuote`, `MessageActionsBar`, `MessageAction`, `MessageToolbar`, `MessageContextMenu`, `MessageHoverActions`, and the branch parts (`MessageBranch`, `MessageBranchContent`, `MessageBranchSelector`, `MessageBranchPrevious`, `MessageBranchNext`, `MessageBranchPage`).

## Composition

```tsx
<Message
  from="user"
  actions={[{ key: "reply", label: "Reply", icon: <IconCornerUpLeft />, onSelect: reply }]}
>
  <MessageContent>Summarise the open referrals.</MessageContent>
</Message>
```

## Native equivalent

`Message`, `MessageContent`, `MessageQuote`, `MessageAction`, `MessageActionsBar` and `MessageContextMenu` in `@vvedantb/native-ui`.

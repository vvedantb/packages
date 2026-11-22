# PromptInput

Source: `src/ai-elements/prompt-input.tsx`. Web gallery: `apps/ui-gallery`, section `ai`.

## Default usage

`PromptInput` is a `form`. Enter submits and Shift+Enter adds a new line. `onSubmit` is required and receives `{ text, files }`.

```tsx
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@vvedantb/ui";

const [text, setText] = useState("");

<PromptInput
  onSubmit={({ text: sent }) => {
    send(sent);
    setText("");
  }}
>
  <PromptInputBody>
    <PromptInputTextarea value={text} onChange={(event) => setText(event.currentTarget.value)} />
  </PromptInputBody>
  <PromptInputFooter>
    <span />
    <PromptInputSubmit disabled={text.trim() === ""} />
  </PromptInputFooter>
</PromptInput>;
```

Without a `PromptInputProvider`, you own the text through `value` and `onChange`. With one, the textarea reads and writes the provider state.

## Props

| Part | Prop | Notes |
| --- | --- | --- |
| `PromptInput` | `onSubmit` | `(message, event) => void \| Promise<void>`. Required |
| `PromptInput` | `accept`, `multiple`, `maxFiles`, `maxFileSize`, `globalDrop`, `onError` | File attachment limits |
| `PromptInput` | `containerClassName`, `inputGroupClassName`, `dataDrop` | Layout and non-file drops |
| `PromptInputTextarea` | `placeholder` | Default `"What would you like to know?"` |
| `PromptInputSubmit` | `status`, `onStop`, `queued` | `status` is the `ai` `ChatStatus`. While `submitted` or `streaming` with `onStop`, the button stops |

Other parts: `PromptInputHeader`, `PromptInputTools`, `PromptInputButton`, `PromptInputActionMenu`, `PromptInputModelSelect`, `PromptInputProvider`, `PromptInputActionAddAttachments`.

## Composition

```tsx
<PromptInput onSubmit={send} accept="image/*" maxFiles={4}>
  <PromptInputBody>
    <PromptInputTextarea />
  </PromptInputBody>
  <PromptInputFooter>
    <PromptInputTools>
      <PromptInputActionMenu>…</PromptInputActionMenu>
    </PromptInputTools>
    <PromptInputSubmit status={status} onStop={stop} />
  </PromptInputFooter>
</PromptInput>
```

## Native equivalent

`PromptInput`, `PromptInputButton`, `PromptInputChip`, `PromptInputMenu`, `PromptInputMenuItem` and `PromptInputSubmit` in `@vvedantb/native-ui`.

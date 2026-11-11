---
"@vvedantb/native-ui": minor
---

Tappable labels are at least 14 px, a phone size in place of the web desktop 12 px:

- `Button` `sm` has a `text-sm` label (was `text-xs`) and is 36 high (`min-h-9`, was `min-h-8`). Its hit slop does not change.
- `PromptInputChip` labels and counts are `text-sm`; `PROMPT_INPUT_CHIP.labelMinWidth` is 28 (was 24).
- `ConversationScrollButton` with `showLabel` draws its label at `text-sm`.
- The `UpgradeToProCard` pill follows `Button` `sm`: `text-sm`, 36 high.

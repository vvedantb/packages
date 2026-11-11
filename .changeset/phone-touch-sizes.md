---
"@vvedantb/native-ui": minor
---

Add phone touch sizes with no web twin. `ChatIconButton` and `MessageAction` take `size="touch"`: a whole 44 square with a 16 icon, so a row of message actions needs no slop. `PromptInputChip` takes `size="touch"`: 36 high with 4 slop above and below, for a 44 footer bar, so the target stays inside the bar (`PROMPT_INPUT_CHIP.touchHeight`). The defaults keep the web sizes.

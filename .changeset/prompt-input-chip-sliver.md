---
"@vvedantb/native-ui": patch
---

native-ui `PromptInputChip`: a label squeezed below `PROMPT_INPUT_CHIP.labelMinWidth` (24, about two characters and the ellipsis at `text-xs`, scaled up by the system font size) hides, so a narrow chip is its icon and chevron, as the web, not a sliver of a letter. It shows again when the chip has room. The accessibility label keeps the full name.

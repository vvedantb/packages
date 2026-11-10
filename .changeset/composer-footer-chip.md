---
"@vvedantb/native-ui": minor
---

Composer footer parts for a chip row under the field, as the bar under Eva's web composer:

- `PromptInput` takes a `footer` slot. It sits under the field, inside the keyboard lift and above the bottom safe-area inset, in both layouts.
- `PromptInputChip` (from `/ai`) is the web `ModelPicker` trigger: 28 high (`h-7`), `px-2`, `gap-1.5`, `rounded-md`, `text-xs` medium in the muted colour, with an optional 14 icon, a suffix at 70% after " · ", a count in tabular figures and a 12 chevron at 60%. It reaches 44 high with slop, and its label truncates. `weight="normal"` and `color` are opt-in. `PROMPT_INPUT_CHIP` holds the metrics.
- `SheetRow` takes a `leading` node in place of `icon`, for a mark that is not a Tabler icon, such as `ProviderIcon`.
- `providerLabel` (from `/brand`, beside `ProviderIcon`) names a provider as the web `getProviderLabel`: "Claude", "GPT", "Opencode", "Cursor".

---
"@vvedantb/ui": minor
---

`ModelPicker` now owns trait controls. Its new `traits` prop is required: pass the selected model's `TraitsPanel` props (`ModelPickerTraits`), or `null` where runs take no traits. The picker pins the panel above the model list and sums the traits up on the trigger, with a bolt for Fast (`modelPickerTraitSummary`). The `header`, `triggerSuffix` and `showFastIcon` props are removed: pass `traits` instead.

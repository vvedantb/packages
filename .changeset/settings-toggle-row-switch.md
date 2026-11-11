---
"@vvedantb/native-ui": minor
---

`SettingsToggleRow` takes `checked`, `onCheckedChange`, `disabled` and `accessibilityLabel`. With `onCheckedChange` the whole row is the switch, as `LabeledSwitchRow`: one Pressable with the `switch` role, `checked`, the title as its name, the description as its hint and at least 56 high (`min-h-14`). The `action` switch stays on screen and is hidden from TalkBack and VoiceOver. Without `onCheckedChange` the row is a View, as before.

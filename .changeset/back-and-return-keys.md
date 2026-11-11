---
"@vvedantb/native-ui": minor
---

Android back and the Return key. `PromptInputMenu` takes `onDismiss`: while it is mounted, Android back calls it (and goes no further), as Escape closes the web picker. `ConfirmDialog` calls `onCancel` on every close that is not Confirm (Cancel, Android back, the VoiceOver escape), as the web; Confirm does not call it. `SignInScreen`: Return on the email field moves to the password, and on the new password to the confirm field (`submitBehavior="submit"`). `ChoiceQuestion`: the "Other" field's Return key reads Next or Send, keeps the keyboard up while there is no answer, and submits on the last question.

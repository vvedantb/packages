---
"@vvedantb/native-ui": minor
---

Bottom sheets move as one piece. `SheetContent` and the compact `DialogContent` slide up on open and back down on close, however they close (a drag, the backdrop, a close button, Android back, the parent's `open`), and the backdrop fades with the sheet's position, from one shared value. The `Modal` stays up until the sheet is out of sight. The drag follows the finger from where the sheet is (a touch on a sheet that is still sliding catches it), and the release is a spring that starts at the finger's speed: a flick or a drag past half carries the sheet out, a short slow drag springs it home with a little bounce and a light haptic. Before, the sheet slid in with a fixed 240 ms layout animation, closed with the `Modal` fade, and a released drag slid out on a fixed 120–250 ms timing. Reduce Motion: sheets appear and leave in place, the drag still follows the finger, and the release settles at once. The centred dialog keeps its fade.

Press feedback: the `Button` primitive and `PromptInputChip` scale to 0.97 while pressed (the web buttons and composer chips scale by 3-4%) instead of dimming; with Reduce Motion they dim to 80%.

Haptics, through the optional `expo-haptics` peer: new `impactHaptic("light" | "medium")` and `notificationHaptic("success" | "error")` beside `selectionHaptic`. A success or error toast fires the notification haptic as it shows, the confirm button of a destructive `ConfirmDialog` fires a medium impact, and `PillTabs` fires the selection haptic on a change, as `TabsTrigger` and the tab bar already did.

Motion details: the toast, the `ConversationScrollButton` and the fold content ease out on the strong ease-out curve (new `motion.ts`), and each exit is about 20% quicker than its entry. `BulkActionBar` rises into place from below (it came down from above) and sinks out. `CollapsibleChevron` turns over 150 ms, as on the web (at once with Reduce Motion). Shared values are read and written with `.get()` / `.set()`, the form the React Compiler can follow.

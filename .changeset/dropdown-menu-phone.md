---
"@vvedantb/native-ui": patch
---

`DropdownMenu`: items are at least 48 high (`DROPDOWN_MENU.itemHeight`, up from 44; 56 with larger text as before). The menu stays at opacity 0 until its content is measured, so it no longer shows below the trigger for a frame and then flips above. A new `DropdownMenuRadioItem` pick fires `selectionHaptic()`; a plain item and the current choice do not.

---
"@vvedantb/native-ui": minor
---

A docked picker for `@` mentions and `/` skills, as the web composer's `MentionPickerPopup` in its `panel` layout:

- `PromptInput` takes a `menu` slot. It sits right above the field, the field's width and 6 clear of it, inside the keyboard lift, in both layouts. Pass it only while the picker is open.
- `PromptInputMenu` (from `/ai`) is the popover surface (`palette.overlay`, radius 16, the field border) around a labelled list that scrolls past `promptInputMenuHeight` (35% of the window, kept inside the web's 160 to 340). Taps reach a row while the keyboard is up. With no rows it shows `empty`, default "No matches.".
- `PromptInputMenuItem` is one row, the web `MentionRow`: at least 44 high, a muted `prefix` (`@` or `/`), the label, a one-line description cut at 72 characters, an optional `leading` (an avatar), and a `trailing` icon or a small `badge` with an optional `badgeIcon`. `selected` takes the web `bg-primary/15` (`/25` dark) and a medium label; a press fades to 70%.

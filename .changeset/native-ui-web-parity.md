---
"@vvedantb/native-ui": minor
---

Font, settings and chat parity release. No removed or renamed export, and no prop changes type: every new prop is optional. No new dependency. Some defaults now look different (see Changed); each follows the matching `@vvedantb/ui` part. Looks that only Eva's web app has are opt-in props.

**Added**

- `configureTheme({ font })` and `nativeUiPreset({ font })`: family names for the four weights (`{ regular, medium, semibold, bold }`). The preset sets `sans` and the four `font-instrument-sans*` classes (the class names stay the same); `configureTheme` sets the JS styles, such as `Markdown`. Keys left out keep Instrument Sans. The app loads the font files.
- `fontFamily` (the current family names) and the `ThemeFonts` type, on the root entry and `/theme`.
- `formatCompactRelativeTime` and the `CompactRelativeTimeOptions` type (root and `/primitives`): one compact unit ("now" or "42s", "5m", "3h", "2d", "4mo", "1y"), the twin of the `@vvedantb/ui` function, with `now`, `justNow` and `calendar`.
- `TabsTrigger` `minHeight`: the trigger height on screen for a list the app sizes itself. The hit slop still reaches 44.
- `sizeStyle(size, "relaxed")` (Tailwind `leading-relaxed`, 1.625), `trackingStyle(size, "wide")` and the `TextLeading` type.
- `/ai` `MessageAction` `size="xs"`: the web `icon-xs` (28, 14 icon). `PromptInputSubmit` `size` (`"md"` is 36).
- `/ai` `PromptInput` `shape="pill"` (inline layout): Eva's web chat composer, 48 high on one line, radius 24, a 14 / 20 field 36 high and a 36 send button.
- `/ai` `AgentTraceFold` `duration`: a formatted string in place of `seconds`, as the web `ActivityTasks` `duration`, for an app's own formatter.
- `/ai` `ConversationScrollButton` `showLabel`: a 28-high pill with the icon and `label`, as the web button with a label.
- `/ai` `MessageMeta` `size="2xs"`: the web `text-2xs` (11 / 16). `META_TEXT_STYLE` is the same token as a style.
- `/ai` `CodeBlock` `variant="markdown"`: the web `MarkdownCodeBlock` (13 / 20.15 code, a 32 header, `icon-xs` actions and a "Wrap long lines" toggle). `CodeBlockCopyButton` `size`.
- `/ai` `ChoiceQuestion` `buttonWeight="semibold"`: semibold Back, Next and Submit labels.
- `/markdown` `Markdown` `leading="normal"`: the text size's own line height (14 / 20), as a web `Markdown` with `text-sm`. `inlineCodeStyle` takes an optional `color`.

**Changed**

Visual defaults other apps will see change:

- Settings parts at the web sizes: `SettingsSection` title 14 / 20 semibold and description 14 / 22.75; `SettingsToggleRow` title 14 / 20 medium and description 12 / 19.5, with no minimum row height; `SettingsField` label 14 / 20 medium and help 12 / 19.5; `SettingsEmptyState` a 28 icon at half opacity, a 14 / 20 medium title and a 12 / 19.5 description in `px-4 py-16` (was 16 and 18 semibold titles and larger text).
- `/ai` chat text (`ResponseText`, `Markdown`) is the web `MessageContent` `text-sm`, 14 / 20 (was 16 / 24). Larger text is unchanged.
- `/markdown` `Markdown` follows the web `Markdown` more closely: body line height 1.625 (14 / 22.75), 16 between blocks with none outside (the Streamdown `space-y-4` root), no rule under h1 and h2, medium links, muted quotes, inline code in the text colour, tables on the code panel (0.93 em, 1.5 line height, semibold header, rows split by the border at 70%), and fences drawn as `CodeBlock variant="markdown"`.
- `/ai` `MessageContent bubble="tint"` pads `px-4 py-3` (was `px-3 py-2`), as every web user bubble.
- `/ai` `PromptInputSubmit` stays on the primary fill and fades when there is nothing to send, as the web send buttons (was the `secondary` fill).
- `/ai` `PromptInput layout="inline"`: the field is the web `Composer` `text-sm leading-6`, 14 / 24 (was 16 / 24). The stacked field stays 16 / 24, the web `Textarea` below `sm`.
- `/ai` `ChoiceQuestion`: option descriptions 12 / 19.5 (was 12 / 16), a 10 / 14 semibold topic badge (was 12 / 16 medium), the question 15 / 20.625, a plain "Other..." label until picked, option rows with no border width and a 1-wide ring outside when picked (was a 2-wide border, which narrowed the text by 4), and label lines 24 high, as the web card.

Other changes:

- `relaxedSizeStyle` now calls `sizeStyle(size, "relaxed")`, so the 1.625 lives in one place.
- Strict-consumer type fixes: `Message` types its layout style as `ViewProps["style"]` (no readonly tuple, no cast), and the auth and router parts type router options from `useRouter()`, as expo-router 57 exports no `Router` type.
- `types/peers.d.ts` declares the `react-native-marked` `Renderer` methods `link`, `blockquote` and `table`, the `strikethrough` style and `IconTextWrap`.

**Fixed**

- `PromptInput`: on web a multiline field starts one row high (React Native Web gave the `textarea` the HTML default of 2 rows, and auto-grow kept it). Clearing the field drops its measured height, so it is one line again.
- `/markdown` `Markdown`: bold, italic and linked words no longer grow the line (the library starts them at its own 16 / 24); links are no longer italic; blank lines in highlighted code are no longer drawn twice; blocks inside a quote no longer add their outer margins.

**Tests**

- New `tests/chatParity.test.ts`: every chat default kept above reads its `packages/ui` source (message, composer, prompt input, textarea, code blocks, `markdown.css`, the Streamdown root and table, the question card).
- New `tests/relativeTime.test.ts` and `tests/tabsTriggerHeight.test.ts`; `tests/settingsParity.test.ts`, `tests/configureTheme.test.ts`, `tests/tailwindPreset.test.ts` and `tests/styleTypes.test.ts` for the font and settings work.
- `tests/ai.test.ts`, `tests/markdown.test.ts`, `tests/choiceQuestion.test.ts` and `tests/turnFold.test.ts` updated for the new defaults and options.

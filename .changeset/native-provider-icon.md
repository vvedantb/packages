---
"@vvedantb/native-ui": minor
---

Add `ProviderIcon` to `@vvedantb/native-ui/brand` (and the root entry): the four AI provider marks of the web `ProviderIcon` (Claude, OpenAI for `codex`, OpenCode, Cursor) as `react-native-svg` marks with the same path data, viewBoxes and fills. Any other provider draws the Claude mark, as on the web. Props: `provider`, `size` (default 14), `title` (accessible name; without it the mark is hidden from assistive tech), `testID` and `style`. The OpenAI and Cursor marks follow the colour scheme, as the web `dark:` classes. `PROVIDER_MARKS` and `providerMark(provider)` expose the data. A test checks the marks against `@vvedantb/ui` `ai-elements/provider-icon.tsx`.

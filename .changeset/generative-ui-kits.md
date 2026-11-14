---
"@vvedantb/server": minor
"@vvedantb/ui": minor
"@vvedantb/native-ui": minor
---

Generative UI in the kits: agent-composed panels from one shared catalog.

- `@vvedantb/server/generative-ui`: the 16 component definitions (zod props), the `reply` and `open_url` actions, tones and styles, `parseGenerativeUiSpec` and `isHttpUrl`. No json-render runtime: pass `generativeUiCatalogDefinition` to json-render's `defineCatalog`.
- `@vvedantb/ui/generative-ui`: `GenerativeUiPanel` (stored spec, `onReply`, `onOpenUrl`), `GenerativeUiRenderer` and `generativeUiCatalog` on `@json-render/react`.
- `@vvedantb/native-ui/generative-ui`: `GenerativeUiPanel` (plus `onCopy` and `renderUnsupported`) and `generativeUiNativeCatalog` on `@json-render/react-native`, drawn as the web panel on the native tokens.

New optional peers: `@json-render/core`, `@json-render/react` (ui), `@json-render/react-native` (native-ui), `>=0.21.0`.

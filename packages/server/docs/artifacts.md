# Artifacts core (`@vvedantb/server`)

The backend-safe core for artifacts: standalone documents (HTML, Markdown, SVG, code, or typed JSON such as a quiz) that run offline in a sandboxed iframe or WebView and keep per-user state through a small bridge. Everything here is plain strings and data. There is no DOM, no React, and no Convex import, so the same code runs in a Convex V8 function, a Node server, a browser and React Native.

- **Contract**: Zod schemas for the artifact type and format, the state spec, typed bodies (`quizBodyV1`, `flashcardsBodyV1`), and list/detail rows. Built with your `z`.
- **State**: limits, the pure ops the host and the server both apply, storage-shim prefixes, and the host's save debounce.
- **Rendering**: the built-in quiz and flashcards pages, the document wrapper with its CSP, and the guest bootstrap.

```ts
import { z } from "zod";
import { createArtifactSchemas, wrapArtifactDocument } from "@vvedantb/server";

const artifacts = createArtifactSchemas(z);

// Server: check a body before saving it.
const checked = artifacts.validateArtifactBody("quiz", "json", body, 1);
if (!checked.ok) throw new Error(checked.error);

// Client: build the iframe srcdoc from the row, its body and the user's state.
iframe.srcdoc = wrapArtifactDocument(body, row.format, state.data, {
  title: row.title,
  template: row.stateSpec?.template,
  stateGlobalAliases: ["app"], // optional: window.app.state works as well as window.artifactState
});
```

## Contract

`createArtifactSchemas(z)` takes zod 3.25+ or 4 (zod is an optional peer and the package never imports it) and returns:

| Schema | Shape |
| --- | --- |
| `artifactType` | `ARTIFACT_TYPES`: `document`, `report`, `slides`, `infographic`, `mindmap`, `quiz`, `flashcards`, `diagram`, `code`. What the artifact is, for filters and icons. |
| `artifactFormat` | `ARTIFACT_FORMATS`: `html`, `markdown`, `svg`, `code`, `json`. How the body renders. |
| `stateSpec` | `{ stateVersion: int ≥ 1, keys: string[] (≤ 32, each 1–64 chars), template?: "quiz" \| "flashcards" }` |
| `quizBodyV1` | `{ title, questions: [{ id, prompt, options: 2–5 strings, correctIndex }] }` (≥ 1 question; `correctIndex` must point at an option) |
| `flashcardsBodyV1` | `{ title, cards: [{ id, front, back }] }` (≥ 1 card) |
| `listRow` | `ArtifactListRow`: `id`, `title` (1–200 chars), `description?` (≤ 280), `type`, `format`, `language?`, `schemaVersion`, `stateSpec?`, `currentVersion`, `size` (bytes), `origin: { client, externalId? }`, `createdAt`, `updatedAt`, `teamId?`. Metadata only. |
| `detailRow` | `ArtifactDetailRow`: a list row plus `body` (≤ 400,000 chars). |

Strings in the typed bodies are trimmed and must not be empty. Objects strip unknown keys. Ids are strings, so the rows work for any store and any client. `origin.client` is a free string naming the writer, not an enum.

`validateArtifactBody(type, format, body, schemaVersion = 1)` returns `{ ok: true, json? }` or `{ ok: false, error }`:

- Any body over `ARTIFACT_BODY_MAX_CHARS` (400,000 characters) fails.
- `json` is only valid for the types in `ARTIFACT_JSON_TYPES` (`quiz` and `flashcards`, version 1). The body must parse and match the typed schema; `json` is the parsed body.
- Other formats are strings and pass once under the cap.

## State

State is a `Record<string, string>` per user, per artifact. The guest JSON-encodes values. The host keeps a copy, answers the guest from it, and saves it through its own store. The server applies the same ops and limits, so a write the host accepted is never refused for size.

| Limit | Value |
| --- | --- |
| `ARTIFACT_STATE_MAX_KEYS` | 32 keys |
| `ARTIFACT_STATE_MAX_KEY_LENGTH` | 64 characters (after trimming) |
| `ARTIFACT_STATE_MAX_VALUE_BYTES` | 16 KiB per value (UTF-8) |
| `ARTIFACT_STATE_MAX_TOTAL_BYTES` | 64 KiB in total, keys included (UTF-8) |
| `ARTIFACT_STATE_MIN_WRITE_INTERVAL_MS` | 1 s between server writes for one artifact and user |
| `ARTIFACT_STATE_DAILY_WRITES` | `{ free: 400, pro: 4000 }` writes per user per UTC day (`utcDayKey(now)`, for example `20261022`) |
| `ARTIFACT_STATE_DEBOUNCE_MS`, `ARTIFACT_STATE_MAX_WAIT_MS` | the host saves 5 s after the last change, and at least every 30 s while changes keep coming |
| `ARTIFACT_VERSION_KEEP` | 10 versions kept per artifact |

The package holds the numbers only. Enforcing the write interval and daily caps is the server's job, since it holds the counters.

- `applyArtifactStateOp(current, op)`: one guest op (`get`, `set`, `getAll`, `remove`, `reset`). Returns `{ data, value, error? }`. On an error, `data` is `current`.
- `applyArtifactStatePatch(current, { sets?, removes?, reset? })`: a batched write, applied as reset, then sets, then removes. All or nothing: on an error, `data` is `current`.
- `validateArtifactStateMap(data)`: the first limit broken, or `undefined`.
- `parseArtifactStateOp(message)`: the op in a guest message, or `undefined` when it is malformed.
- `createTrailingMaxDebounce(flush, trailingMs?, maxMs?, timers?)`: `{ schedule, flushNow, cancel, isPending }`. Call `flushNow()` on `pagehide` and when the frame unmounts.
- Storage shims: the guest's `localStorage` and `sessionStorage` live in the same map under `ARTIFACT_LOCAL_STORAGE_PREFIX` (`ls:`) and `ARTIFACT_SESSION_STORAGE_PREFIX` (`ss:`). `storageView`, `clearPrefixedKeys`, `prefixedStorageKey` and `unprefixStorageKey` read and edit them.

## Rendering

`wrapArtifactDocument(body, format, snapshot?, options?)` returns the `srcdoc`:

| Format | Document |
| --- | --- |
| `html` | The page as is when it has `<html`; otherwise wrapped in a minimal page. |
| `svg` | Centred on a white page. |
| `markdown`, `code` | Escaped text in a `<pre>`. Render Markdown in the host when you want formatting. |
| `json` | The built-in quiz or flashcards page; escaped text when the body does not parse. |

`options.template` (from `stateSpec.template`) is tried first for any format, so an older HTML-format body that holds quiz JSON still renders. `options.title` is the heading when the body has none (default "Artifact"). `options.stateGlobalAliases` is passed to the guest (see below).

The CSP meta tag and the guest script go at the start of `<head>`. `ARTIFACT_CSP` allows inline scripts and styles, and `data:`/`blob:` images, fonts and media. It blocks every network request, frames, objects, forms and `<base>`. Render the document in an iframe with `sandbox="allow-scripts"` and **no** `allow-same-origin`, or in a WebView with the same isolation.

`wrapArtifactHtml(html, snapshot?, options?)` does the injection step only, for a document you built yourself. `artifactGuestScript(snapshot?, options?)` is the inline script alone (snapshot, aliases, then `GUEST_BOOTSTRAP_SCRIPT`), for a React Native WebView's `injectedJavaScriptBeforeContentLoaded`.

`buildQuizHtml({ title, questions })` and `buildFlashcardsHtml({ title, cards })` build the offline pages. They keep progress in `window.artifactState` (quiz: `answers`, `currentIndex`, `submitted`, `score`, `total`; flashcards: `index`, `known`, `seen`). `htmlFromArtifactTemplate({ title, content, template? })` parses `content` and builds the page, or returns `undefined`. Its parsers (`parseQuizTemplate`, `parseFlashcardsTemplate`) are lenient so older bodies still render without zod: they also take a bare array, `question` for `prompt`, and missing ids. Use `validateArtifactBody` for writes.

Download helpers: `ARTIFACT_FORMAT_FILES[format]` gives `{ extension, mime }`, and `artifactFileName(title, format)` a safe file name. `formatFromLanguage(language)` maps a code-fence language to a format (`html`/`htm`, `svg`, `md`/`markdown`, otherwise `code`).

## Bridge protocol

1. The guest bootstrap runs first. It reads `window.__ARTIFACT_SNAPSHOT__` and `window.__ARTIFACT_ALIASES__` (set by `artifactGuestScript`), deletes them, and posts `{ type: "artifact:ready" }` to the parent. Requests the page makes before the port arrives are queued and sent once it does.
2. The host checks `event.source` is its frame, creates a `MessageChannel`, and posts `{ type: "artifact:port" }` with `port2`.
3. The guest sends `{ type: "artifact:state", requestId, op, key?, value? }` on the port. The host parses it with `parseArtifactStateOp`, applies it with `applyArtifactStateOp`, schedules a save after `set`, `remove` or `reset`, and answers `{ type: "artifact:state-result", requestId, ok, value?, error? }`.

In a React Native WebView the guest sends through `window.ReactNativeWebView.postMessage` (JSON strings) and the host answers with `artifact:state-result` window messages. The constants are `ARTIFACT_READY_TYPE`, `ARTIFACT_PORT_TYPE`, `ARTIFACT_STATE_TYPE` and `ARTIFACT_STATE_RESULT_TYPE`.

The guest API, with promises and JSON values:

```js
await window.artifactState.set("score", 3);
const all = await window.artifactState.getAll(); // { score: "3", ... } raw strings
await window.artifactState.get("score");         // "3"
await window.artifactState.remove("score");
await window.artifactState.reset();
```

The guest checks the limits before sending, so an over-quota `set` rejects (and `localStorage.setItem` throws `QuotaExceededError`) without reaching the host.

### Aliases

An app whose existing artifacts call another global (for example `window.app.state`) passes `stateGlobalAliases: ["app"]`. Each alias becomes `window[alias] = { state }`, with the same `state` object as `window.artifactState`. Aliases must be JavaScript identifiers and must not name a global the page or the bootstrap needs (`window`, `document`, `localStorage`, `artifactState`, …). `assertStateGlobalAliases` throws on a bad one, and the wrappers call it.

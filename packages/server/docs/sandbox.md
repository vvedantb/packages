# Code sandbox (`@vvedantb/server`)

Runs untrusted JavaScript, such as model-written scripts, in QuickJS compiled to WebAssembly. The script calls host tools through a `tools` proxy, logs with `console`, and returns a JSON value. The host decides which tools exist, can refuse or stub each call, and gets back the result, the logs and a record of every call.

Node only (a Convex `"use node"` action, a plain Node server, an Electron main process).

```ts
import { runSandboxedScript, serializeExecuteOutcome, type SandboxTool } from "@vvedantb/server";

const tools: SandboxTool[] = [
  {
    name: "list_items",
    mutating: false,
    invoke: async (argsJson) => JSON.stringify(await listItems(JSON.parse(argsJson))),
  },
  {
    name: "close_item",
    mutating: true,
    invoke: async (argsJson) => JSON.stringify(await closeItem(JSON.parse(argsJson))),
  },
];

const outcome = await runSandboxedScript(
  `const { rows } = await tools.list_items({ status: args.status });
   console.log("found", rows.length);
   return rows.map((row) => row.id);`,
  tools,
  { deadlineMs: 10_000 },
  { globals: { args: { status: "open" } } },
);

if (outcome.ok) console.log(outcome.result, outcome.logs, outcome.calls);
else console.error(outcome.error);

const reply = serializeExecuteOutcome(outcome); // pretty JSON for a tool reply, with a preview for large results
```

## Install

QuickJS is two optional peers. Install them where you run the sandbox:

```sh
npm install quickjs-emscripten-core@^0.32.0 @jitl/quickjs-singlefile-cjs-release-sync@^0.32.0
```

Both load on the first `runSandboxedScript` call, never when the package root is imported. The WASM module loads once per process; a failed load is retried on the next call. Without them, `runSandboxedScript` returns `{ ok: false, error: "Sandbox unavailable: …" }`.

The package's `browser` field maps both to empty modules, so browser-platform bundles of the root (Convex's default V8 runtime) never pull in QuickJS or its Node built-ins, even when it is installed. Node bundles (esbuild `platform: "node"`) include it. The variant is CommonJS and requires Node built-ins, so an ESM Node bundle needs esbuild's usual banner:

```js
banner: { js: `import { createRequire } from "node:module"; const require = createRequire(import.meta.url);` }
```

## API

| Export | What it does |
| --- | --- |
| `runSandboxedScript(code, tools, limits?, options?)` | Runs `code` as the body of an async function in a fresh QuickJS runtime. Resolves to an `ExecuteOutcome`. Never throws. |
| `SandboxTool` | `{ name, mutating, invoke(argsJson): Promise<string> }`. `invoke` gets the JSON text of the single argument object and resolves to the JSON text of the result. A rejection's message is what the script sees. |
| `ExecuteLimits`, `DEFAULT_EXECUTE_LIMITS` | Per-run limits. Pass a partial object to override some. |
| `SandboxOptions` | `{ globals?, onCall? }`. See below. |
| `SandboxCall`, `SandboxCallDecision` | What `onCall` receives and returns. |
| `ExecuteOutcome` | `{ ok: true, result, logs, calls, ms }` or `{ ok: false, error, logs, calls, ms }`. |
| `SandboxCallRecord` | One entry of `calls`: `{ name, ms, ok, skipped? }`. |
| `serializeExecuteOutcome(outcome, maxChars?)`, `DEFAULT_RESULT_CHAR_CAP` | Pretty JSON of an outcome. See [Large results](#large-results). |

### Limits

| Field | Default | What happens at the limit |
| --- | --- | --- |
| `deadlineMs` | 60 000 | Wall clock for the whole run, including time in tools. Script code is interrupted (`InternalError: interrupted`); a run waiting on a tool fails with `Execution exceeded <n>ms`. |
| `memoryBytes` | 64 MB | QuickJS heap. The run fails with `InternalError: out of memory`. |
| `stackBytes` | 1 MB | QuickJS stack. The run fails with a stack overflow error. |
| `maxCalls` | 50 | Further calls reject with `Tool call limit (<n>) reached`. |
| `maxMutatingCalls` | 10 | Calls to `mutating` tools beyond this reject with `Mutating tool call limit (<n>) reached`. |
| `maxLogLines` | 200 | Later lines are dropped and counted in a last line, `… [<n> more log lines truncated]`. |
| `maxLogLineChars` | 2 000 | Longer lines are cut and end with `… [truncated]`. |

A rejected call is an ordinary rejection, so a script can catch it and carry on.

## Inside the script

- `await tools.<name>(args)` calls a host tool with one JSON-serialisable argument (`{}` when omitted) and resolves to the parsed JSON result. Arguments that do not serialise reject with `Tool arguments must be JSON-serialisable`. An unknown name rejects with `Unknown tool: <name>`.
- `tools` cannot be enumerated. `Object.keys(tools)` throws and points the script at `tools.search({ query })`. `search` is an ordinary tool: supply one named `search` if scripts should be able to find tools.
- `console.log`, `info`, `warn`, `error` and `debug` collect lines into `logs`. Strings print as they are; other values as JSON.
- `return` a JSON-serialisable value. `undefined` becomes `null`. Anything else (a `BigInt`, a function) fails the run with `Return value is not JSON-serialisable`.
- There is no `fetch`, `require`, `import`, `process`, timer or filesystem. A promise that can never settle (nothing pending on the host) fails with `Execution stalled: the script's promise never settles`.

## Options

### `globals`

JSON-serialisable values set as globals before the script runs, for example `{ args }` for script parameters. They are copied in as JSON, so the script cannot reach host objects through them. A name that would replace something already global (`JSON`, `Object`), `tools`, `console`, or any name starting with `__` fails the run with `Global name is reserved: <name>`.

### `onCall`

Called before each tool call, after the name and the call caps are checked:

```ts
onCall: (call: { name: string; args: JsonValue; mutating: boolean }) =>
  SandboxCallDecision | Promise<SandboxCallDecision>;

type SandboxCallDecision =
  | { allow: true }                   // run the tool
  | { allow: false; error: string }   // the script's call rejects with `error`
  | { stub: JsonInput };              // the call resolves to `stub`; the tool does not run
```

- Allow-list: return `{ allow: false, error }` for tools the caller may not use. The tool does not run, and the call is recorded with `ok: false`.
- Dry run: return `{ stub }` for `mutating` calls. The script sees the stub as the result, and the call is recorded with `ok: true, skipped: true`.
- A hook that throws or rejects refuses the call with its message.
- Refused and stubbed calls count against `maxCalls` and `maxMutatingCalls` like real ones, so a dry run stops where a real run would.

## Outcome

- `result` (on success) is the returned JSON value. `error` (on failure) is one line, such as `TypeError: x is not a function` or `Execution exceeded 60000ms`.
- `logs` are kept on failure too, up to the point the run stopped.
- `calls` lists every tool call that reached the host and settled before the run ended, in settle order: `{ name, ms, ok, skipped? }`. Calls rejected for an unknown name or a cap are not listed. A tool still running when the run ends is left to finish; its result is ignored.
- `ms` is the wall-clock time of the whole run.

## Large results

`serializeExecuteOutcome(outcome, maxChars = DEFAULT_RESULT_CHAR_CAP)` returns `{ result | error, logs, calls, ms }` as pretty JSON. When a successful outcome serialises to more than `maxChars` (default 100 000), the result is replaced by a preview:

```json
{
  "truncated": true,
  "note": "Result was 250000 characters; showing the first 100000. Filter or summarise inside the script instead.",
  "resultPreview": "[{\"id\":…",
  "logs": [],
  "calls": [],
  "ms": 42
}
```

Failed outcomes are never cut.

## How it works

Each run gets a fresh QuickJS runtime and context with the heap, stack and interrupt limits set, and both are disposed when the run ends, on every path. It uses the synchronous QuickJS build with deferred promises, not the asyncify build: an asyncified host call made from a pending microtask crashes the WASM module. Each tool call returns a deferred promise that the host settles when the tool finishes, and the host pumps pending jobs until the script's own promise settles, the deadline passes, or nothing is left to wait for. Host results that arrive after the run has ended are ignored, because touching a disposed context aborts the process.

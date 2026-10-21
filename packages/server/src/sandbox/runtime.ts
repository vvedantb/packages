/**
 * Code sandbox: runs untrusted JavaScript in QuickJS (WASM) and bridges
 * `tools.<name>(args)` calls back to async host handlers.
 *
 * Uses the sync QuickJS build with deferred promises rather than the asyncify
 * build: an asyncified host call made from a pending microtask job crashes the
 * WASM module, whereas a deferred promise lets the host settle the call later
 * while the driver pumps pending jobs until the script's own promise settles.
 * Every QuickJS handle is disposed on the path that created it: deferreds in
 * the final block, settled promise states right after they are read, strings
 * and errors through `consume`. Host handlers that settle after disposal are
 * ignored via the `alive` flag, because touching a disposed context aborts the
 * whole process.
 */
import type { QuickJSDeferredPromise, QuickJSWASMModule } from "quickjs-emscripten-core";
import { isJsonObject, type JsonInput, type JsonValue, type Thrown } from "../mcp/json.js";

export type SandboxTool = {
  readonly name: string;
  /** true for tools that change state; counted against `maxMutatingCalls`. */
  readonly mutating: boolean;
  /**
   * Receives the JSON text of the single argument object and resolves to the
   * JSON text of the result. A rejection's message is what the script sees.
   */
  readonly invoke: (argsJson: string) => Promise<string>;
};

export type ExecuteLimits = {
  /** Wall clock for the whole execution, including time spent in tools. */
  readonly deadlineMs: number;
  /** QuickJS heap cap. */
  readonly memoryBytes: number;
  /** QuickJS stack cap. */
  readonly stackBytes: number;
  /** Total tool calls per execution. */
  readonly maxCalls: number;
  /** Subset cap for tools that change state. */
  readonly maxMutatingCalls: number;
  /** `console` lines kept; the rest are counted in one closing line. */
  readonly maxLogLines: number;
  /** Characters kept per `console` line. */
  readonly maxLogLineChars: number;
};

export const DEFAULT_EXECUTE_LIMITS: ExecuteLimits = {
  deadlineMs: 60_000,
  memoryBytes: 64 * 1024 * 1024,
  stackBytes: 1024 * 1024,
  maxCalls: 50,
  maxMutatingCalls: 10,
  maxLogLines: 200,
  maxLogLineChars: 2_000,
};

export type SandboxCallRecord = {
  readonly name: string;
  readonly ms: number;
  readonly ok: boolean;
  /** Set when `onCall` returned a stub, so the tool never ran. */
  readonly skipped?: true;
};

type ExecuteTelemetry = {
  readonly logs: readonly string[];
  readonly calls: readonly SandboxCallRecord[];
  readonly ms: number;
};

export type ExecuteOutcome =
  | ({ readonly ok: true; readonly result: JsonValue } & ExecuteTelemetry)
  | ({ readonly ok: false; readonly error: string } & ExecuteTelemetry);

/** A tool call the script made, as `onCall` sees it, after the name and caps are checked. */
export type SandboxCall = {
  readonly name: string;
  readonly args: JsonValue;
  readonly mutating: boolean;
};

/**
 * What `onCall` decides:
 * - `{ allow: true }`: run the tool.
 * - `{ allow: false, error }`: the script's call rejects with `error`; the tool does not run.
 * - `{ stub }`: the call resolves to `stub` and the tool does not run (dry run). Recorded with `skipped: true`.
 */
export type SandboxCallDecision =
  | { readonly allow: true }
  | { readonly allow: false; readonly error: string }
  | { readonly stub: JsonInput };

export type SandboxOptions = {
  /** JSON-serialisable values set as VM globals before the script runs, for example `{ args }`. */
  readonly globals?: Readonly<Record<string, JsonInput>>;
  /** Called before each tool call. A throw or rejection refuses the call with its message. */
  readonly onCall?: (call: SandboxCall) => SandboxCallDecision | Promise<SandboxCallDecision>;
};

const QUICKJS_MISSING =
  "The code sandbox needs the quickjs-emscripten-core and @jitl/quickjs-singlefile-cjs-release-sync packages, in a Node runtime";

let modulePromise: Promise<QuickJSWASMModule> | undefined;

// QuickJS is an optional peer, imported on first use and never at module load, so the package root stays loadable
// without it and V8 bundles of the root carry no WASM. Each import() is awaited directly in a try block, as in
// mcp-oauth-client/oauth.ts. The "browser" field in package.json maps both packages to empty modules for browser-platform
// bundles (Convex V8), whose bundler would otherwise follow the import into the variant's Node built-ins.
// tests-node/bundle.mjs checks both.
async function importQuickJs() {
  try {
    const core = await import("quickjs-emscripten-core");
    const variant = await import("@jitl/quickjs-singlefile-cjs-release-sync");
    if (typeof core.newQuickJSWASMModuleFromVariant !== "function") throw new Error("QuickJS mapped to an empty module");
    return { core, variant };
  } catch (error) {
    throw new Error(QUICKJS_MISSING, { cause: error });
  }
}

async function importModule(): Promise<QuickJSWASMModule> {
  const { core, variant } = await importQuickJs();
  // The variant is CommonJS: Node and bundlers nest its default export differently, which the core unwraps.
  return core.newQuickJSWASMModuleFromVariant(Promise.resolve(variant));
}

/** Loads the WASM module once per process; a failed load is retried next call. */
function loadModule(): Promise<QuickJSWASMModule> {
  if (modulePromise === undefined) {
    modulePromise = importModule().catch((err) => {
      modulePromise = undefined;
      throw err;
    });
  }
  return modulePromise;
}

/**
 * Globals the script sees. `tools` is a lazy proxy so any name routes to the
 * host without the catalog living inside the VM; `search` is an ordinary tool
 * the host supplies. `console` hands lines to the host instead of printing.
 * Host `globals` arrive as JSON text and may not replace anything already
 * global.
 */
const PRELUDE = `
for (const [name, value] of Object.entries(JSON.parse(globalThis.__globals))) {
  if (name in globalThis || name === "tools" || name === "console" || name.startsWith("__")) {
    throw new Error("Global name is reserved: " + name);
  }
  globalThis[name] = value;
}
delete globalThis.__globals;
const __format = (value) => {
  if (typeof value === "string") return value;
  try {
    const json = JSON.stringify(value);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
};
const __consoleLog = (...args) => {
  __log(args.map(__format).join(" "));
};
const console = { log: __consoleLog, info: __consoleLog, warn: __consoleLog, error: __consoleLog, debug: __consoleLog };
const __enumerationError = () =>
  new Error('tools cannot be enumerated. Call tools.search({ query: "..." }) to find tools; an empty query lists them all.');
const tools = new Proxy({}, {
  get(_target, prop) {
    if (prop === "then" || typeof prop === "symbol") return undefined;
    const name = String(prop);
    return async (args) => {
      const json = JSON.stringify(args === undefined ? {} : args);
      if (json === undefined) throw new TypeError("Tool arguments must be JSON-serialisable");
      return JSON.parse(await __invokeTool(name, json));
    };
  },
  has() { return true; },
  ownKeys() { throw __enumerationError(); },
  getOwnPropertyDescriptor() { throw __enumerationError(); },
});
`;

function wrapScript(code: string): string {
  return `${PRELUDE}
(async () => {
${code}
})().then((value) => {
  let json;
  try {
    json = JSON.stringify(value === undefined ? null : value);
  } catch (err) {
    throw new Error("Return value is not JSON-serialisable: " + (err && err.message ? err.message : String(err)));
  }
  if (json === undefined) throw new Error("Return value is not JSON-serialisable: " + typeof value);
  return json;
});`;
}

/** Turns a value dumped out of the VM (usually a thrown Error) into one line. */
function describeThrown(dumped: JsonValue | undefined): string {
  if (isJsonObject(dumped) && typeof dumped.message === "string") {
    return typeof dumped.name === "string" && dumped.name !== "" ? `${dumped.name}: ${dumped.message}` : dumped.message;
  }
  if (typeof dumped === "string") return dumped;
  return JSON.stringify(dumped) ?? String(dumped);
}

function describeRejection(reason: Thrown): string {
  if (reason instanceof Error) return reason.message;
  return typeof reason === "string" ? reason : (JSON.stringify(reason) ?? String(reason));
}

/**
 * Runs `code` (the body of an async function) against `tools` inside a fresh
 * QuickJS runtime. Never throws: every failure, including a missing or broken
 * QuickJS install, is reported as an `ok: false` outcome.
 */
export async function runSandboxedScript(
  code: string,
  tools: readonly SandboxTool[],
  limitOverrides: Partial<ExecuteLimits> = {},
  options: SandboxOptions = {},
): Promise<ExecuteOutcome> {
  const limits: ExecuteLimits = { ...DEFAULT_EXECUTE_LIMITS, ...limitOverrides };
  const startedAt = Date.now();
  const deadline = startedAt + limits.deadlineMs;
  const calls: SandboxCallRecord[] = [];
  // Collected on the host as they are written, so a failed run still returns them.
  const logs: string[] = [];
  let droppedLogs = 0;
  const finish = (result: { ok: true; result: JsonValue } | { ok: false; error: string }): ExecuteOutcome => {
    const kept = droppedLogs > 0 ? [...logs, `… [${droppedLogs} more log lines truncated]`] : logs;
    return { ...result, logs: kept, calls, ms: Date.now() - startedAt };
  };
  const fail = (error: string) => finish({ ok: false, error });

  let quickJs: QuickJSWASMModule;
  try {
    quickJs = await loadModule();
  } catch (err) {
    return fail(`Sandbox unavailable: ${describeRejection(err)}`);
  }

  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const runtime = quickJs.newRuntime();
  runtime.setMemoryLimit(limits.memoryBytes);
  runtime.setMaxStackSize(limits.stackBytes);
  runtime.setInterruptHandler(() => Date.now() > deadline);
  const vm = runtime.newContext();

  const deferreds: QuickJSDeferredPromise[] = [];
  const pending = new Set<QuickJSDeferredPromise>();
  let totalCalls = 0;
  let mutatingCalls = 0;
  // Host handlers can settle after this function has returned (a deadline hit
  // while a slow tool is still running). Touching the vm then aborts the process.
  let alive = true;

  /** Asks `onCall`, then runs the tool unless it refused or stubbed the call. */
  const callTool = async (tool: SandboxTool, argsJson: string): Promise<{ json: string; skipped: boolean }> => {
    if (options.onCall !== undefined) {
      const args: JsonValue = JSON.parse(argsJson);
      const decision = await options.onCall({ name: tool.name, args, mutating: tool.mutating });
      if ("stub" in decision) return { json: JSON.stringify(decision.stub), skipped: true };
      if (!decision.allow) throw new Error(decision.error);
    }
    return { json: await tool.invoke(argsJson), skipped: false };
  };

  vm.newFunction("__log", (lineHandle) => {
    if (logs.length >= limits.maxLogLines) {
      droppedLogs += 1;
      return;
    }
    const line = vm.getString(lineHandle);
    logs.push(line.length > limits.maxLogLineChars ? `${line.slice(0, limits.maxLogLineChars)}… [truncated]` : line);
  }).consume((fn) => vm.setProp(vm.global, "__log", fn));

  vm.newFunction("__invokeTool", (nameHandle, argsHandle) => {
    const name = vm.getString(nameHandle);
    const argsJson = argsHandle === undefined ? "{}" : vm.getString(argsHandle);
    const deferred = vm.newPromise();
    deferreds.push(deferred);
    pending.add(deferred);
    void deferred.settled.then(() => pending.delete(deferred));
    const rejectWith = (message: string) => {
      vm.newError(message).consume((error) => deferred.reject(error));
    };

    const tool = byName.get(name);
    if (tool === undefined) {
      rejectWith(`Unknown tool: ${name}`);
      return deferred.handle;
    }
    if (totalCalls >= limits.maxCalls) {
      rejectWith(`Tool call limit (${limits.maxCalls}) reached`);
      return deferred.handle;
    }
    if (tool.mutating && mutatingCalls >= limits.maxMutatingCalls) {
      rejectWith(`Mutating tool call limit (${limits.maxMutatingCalls}) reached`);
      return deferred.handle;
    }
    // Counted before onCall, so refused and stubbed calls use up the caps like real ones.
    totalCalls += 1;
    if (tool.mutating) mutatingCalls += 1;

    const callStartedAt = Date.now();
    callTool(tool, argsJson).then(
      ({ json, skipped }) => {
        if (!alive) return;
        const ms = Date.now() - callStartedAt;
        calls.push(skipped ? { name, ms, ok: true, skipped: true } : { name, ms, ok: true });
        vm.newString(json).consume((value) => deferred.resolve(value));
      },
      (reason: Thrown) => {
        if (!alive) return;
        calls.push({ name, ms: Date.now() - callStartedAt, ok: false });
        rejectWith(describeRejection(reason));
      },
    );
    return deferred.handle;
  }).consume((fn) => vm.setProp(vm.global, "__invokeTool", fn));

  try {
    vm.newString(JSON.stringify(options.globals ?? {})).consume((json) => vm.setProp(vm.global, "__globals", json));
    const evaluated = vm.evalCode(wrapScript(code), "execute.js");
    if (evaluated.error) {
      const message = describeThrown(vm.dump(evaluated.error));
      evaluated.error.dispose();
      return fail(message);
    }
    const promise = evaluated.value;
    try {
      // Drive the VM: run microtasks, then either finish, wait for the next
      // host tool to settle, or give up at the deadline. Jobs are pumped before
      // the deadline check so an interrupt or OOM thrown inside the script
      // surfaces as its own message rather than the generic deadline one.
      for (;;) {
        const jobs = runtime.executePendingJobs();
        if (jobs.error) {
          const message = describeThrown(vm.dump(jobs.error));
          jobs.error.dispose();
          return fail(message);
        }
        const state = vm.getPromiseState(promise);
        if (state.type === "fulfilled") {
          const json = vm.getString(state.value);
          state.value.dispose();
          const result: JsonValue = JSON.parse(json);
          return finish({ ok: true, result });
        }
        if (state.type === "rejected") {
          const message = describeThrown(vm.dump(state.error));
          state.error.dispose();
          return fail(message);
        }
        // Pending: `state.error` is a plain host Error here, not a handle.
        if (Date.now() > deadline) {
          return fail(`Execution exceeded ${limits.deadlineMs}ms`);
        }
        if (jobs.value > 0) continue;
        if (pending.size === 0) {
          return fail("Execution stalled: the script's promise never settles");
        }
        let timer: ReturnType<typeof setTimeout> | undefined;
        const deadlineTimer = new Promise<void>((resolve) => {
          timer = setTimeout(resolve, Math.max(0, deadline - Date.now()));
        });
        try {
          await Promise.race([...[...pending].map((deferred) => deferred.settled), deadlineTimer]);
        } finally {
          if (timer !== undefined) clearTimeout(timer);
        }
      }
    } finally {
      promise.dispose();
    }
  } catch (err) {
    return fail(`Sandbox failure: ${describeRejection(err)}`);
  } finally {
    alive = false;
    for (const deferred of deferreds) if (deferred.alive) deferred.dispose();
    vm.dispose();
    runtime.dispose();
  }
}

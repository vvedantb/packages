import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  DEFAULT_EXECUTE_LIMITS,
  DEFAULT_RESULT_CHAR_CAP,
  runSandboxedScript,
  serializeExecuteOutcome,
  type ExecuteLimits,
  type SandboxCall,
  type SandboxOptions,
  type SandboxTool,
} from "@vvedantb/server";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const listArgs = z.object({ limit: z.number().default(3) });
const idArgs = z.object({ id: z.string() });
const searchArgs = z.object({ query: z.string().default("") });

let slowSettled = 0;
const invoked: string[] = [];

const fakeTools: SandboxTool[] = [
  {
    name: "list_entities",
    mutating: false,
    invoke: async (argsJson) => {
      const { limit } = listArgs.parse(JSON.parse(argsJson));
      return JSON.stringify({
        rows: Array.from({ length: limit }, (_, i) => ({ id: `e${i}`, status: i % 2 ? "active" : "closed" })),
      });
    },
  },
  {
    name: "get_state",
    mutating: false,
    invoke: async (argsJson) => {
      const { id } = idArgs.parse(JSON.parse(argsJson));
      await wait(5);
      return JSON.stringify({ id, isRunning: id === "e1" });
    },
  },
  {
    name: "slow",
    mutating: false,
    invoke: async () => {
      await wait(600);
      slowSettled += 1;
      return JSON.stringify("late");
    },
  },
  {
    name: "boom",
    mutating: false,
    invoke: async () => {
      throw new Error("handler failed");
    },
  },
  {
    name: "create_task",
    mutating: true,
    invoke: async (argsJson) => {
      invoked.push(`create_task ${argsJson}`);
      return JSON.stringify({ created: true });
    },
  },
  {
    name: "search",
    mutating: false,
    invoke: async (argsJson) => {
      const { query } = searchArgs.parse(JSON.parse(argsJson));
      return JSON.stringify(fakeTools.map((tool) => tool.name).filter((name) => name.includes(query)));
    },
  },
];

const run = (code: string, limits?: Partial<ExecuteLimits>, options?: SandboxOptions) =>
  runSandboxedScript(code, fakeTools, limits, options);

describe("runSandboxedScript", () => {
  test("defaults", () => {
    expect(DEFAULT_EXECUTE_LIMITS).toEqual({
      deadlineMs: 60_000,
      memoryBytes: 64 * 1024 * 1024,
      stackBytes: 1024 * 1024,
      maxCalls: 50,
      maxMutatingCalls: 10,
      maxLogLines: 200,
      maxLogLineChars: 2_000,
    });
    expect(DEFAULT_RESULT_CHAR_CAP).toBe(100_000);
  });

  test("happy path: parallel tool calls, filtering, logs and call records", async () => {
    const outcome = await run(`
      const { rows } = await tools.list_entities({ limit: 4 });
      const active = rows.filter((r) => r.status === "active");
      const states = await Promise.all(active.map((r) => tools.get_state({ id: r.id })));
      console.log("checked", states.length);
      return states.filter((s) => s.isRunning).map((s) => s.id);
    `);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result).toEqual(["e1"]);
    expect(outcome.logs).toEqual(["checked 2"]);
    expect(outcome.calls.map((c) => c.name)).toEqual(["list_entities", "get_state", "get_state"]);
    expect(outcome.calls.every((c) => c.ok && c.skipped === undefined)).toBe(true);
  });

  test("undefined becomes null and calls without arguments send {}", async () => {
    expect(await run(`await tools.list_entities(); return;`)).toMatchObject({ ok: true, result: null });
  });

  test("a rejected tool call is catchable inside the script", async () => {
    const outcome = await run(`try { await tools.boom({}); } catch (e) { return "caught: " + e.message; }`);
    expect(outcome).toMatchObject({ ok: true, result: "caught: handler failed" });
    expect(outcome.calls).toEqual([expect.objectContaining({ name: "boom", ok: false })]);
  });

  test("unknown tool names reject with a clear message", async () => {
    const outcome = await run(`return await tools.nope({});`);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toContain("Unknown tool: nope");
  });

  test("tools.search is an ordinary host tool", async () => {
    expect(await run(`return await tools.search({ query: "list" });`)).toMatchObject({
      ok: true,
      result: ["list_entities"],
    });
  });

  test("an infinite loop is interrupted at the deadline", async () => {
    const outcome = await run(`while (true) {}`, { deadlineMs: 300 });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toContain("interrupted");
  });

  test("a memory bomb hits the heap cap", async () => {
    // A doubling array reaches the cap in ~20 native concats. Filling
    // 1e6-element arrays took ~5s of interpreted work and timed out on slower
    // machines; a doubling string hits QuickJS's length limit first instead.
    const outcome = await run(`let a = [1]; while (true) a = a.concat(a); return 1;`, {
      memoryBytes: 16 * 1024 * 1024,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toContain("out of memory");
  });

  test("deep recursion hits the stack cap", async () => {
    const outcome = await run(`const f = (n) => f(n + 1) + 1; return f(0);`, { stackBytes: 64 * 1024 });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toMatch(/stack overflow/i);
  });

  test("host globals are not reachable", async () => {
    const outcome = await run(
      `return { p: typeof process, f: typeof fetch, r: typeof require, s: typeof setTimeout };`,
    );
    expect(outcome).toMatchObject({
      ok: true,
      result: { p: "undefined", f: "undefined", r: "undefined", s: "undefined" },
    });
  });

  test("syntax errors are reported", async () => {
    const outcome = await run(`return (;`);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toContain("SyntaxError");
  });

  test("thrown values map to one line", async () => {
    expect(await run(`throw new TypeError("bad");`)).toMatchObject({ ok: false, error: "TypeError: bad" });
    expect(await run(`throw "plain";`)).toMatchObject({ ok: false, error: "plain" });
    expect(await run(`throw { code: 7 };`)).toMatchObject({ ok: false, error: '{"code":7}' });
    expect(await run(`throw { message: "only message" };`)).toMatchObject({ ok: false, error: "only message" });
  });

  test("a promise that never settles is reported as stalled", async () => {
    const outcome = await run(`await new Promise(() => {}); return 1;`);
    expect(outcome).toMatchObject({ ok: false, error: "Execution stalled: the script's promise never settles" });
  });

  test("a slow tool past the deadline fails cleanly, is ignored when it settles, and the module stays healthy", async () => {
    const before = slowSettled;
    const outcome = await run(`console.log("waiting"); return await tools.slow({});`, { deadlineMs: 200 });
    expect(outcome).toMatchObject({ ok: false, error: "Execution exceeded 200ms", logs: ["waiting"] });
    // The tool settles after the VM was disposed; touching it then would abort the process.
    await wait(700);
    expect(slowSettled).toBe(before + 1);
    expect(outcome.calls).toEqual([]);
    expect(await run(`return 1 + 1;`)).toMatchObject({ ok: true, result: 2 });
  });

  test("the total call cap is enforced", async () => {
    const outcome = await run(
      `let n = 0;
       try { for (let i = 0; i < 100; i++) { await tools.list_entities({ limit: 1 }); n++; } }
       catch (e) { return { n, e: e.message }; }`,
      { maxCalls: 10 },
    );
    expect(outcome).toMatchObject({ ok: true, result: { n: 10, e: "Tool call limit (10) reached" } });
  });

  test("the mutating call cap is enforced separately", async () => {
    const outcome = await run(
      `const out = [];
       for (let i = 0; i < 3; i++) {
         try { out.push(await tools.create_task({})); } catch (e) { out.push(e.message); }
       }
       out.push((await tools.list_entities({ limit: 1 })).rows.length);
       return out;`,
      { maxMutatingCalls: 2 },
    );
    expect(outcome).toMatchObject({
      ok: true,
      result: [{ created: true }, { created: true }, "Mutating tool call limit (2) reached", 1],
    });
    expect(outcome.calls.filter((c) => c.ok)).toHaveLength(3);
  });

  test("the default mutating cap is 10", async () => {
    const outcome = await run(
      `let n = 0;
       try { for (;;) { await tools.create_task({}); n++; } } catch (e) { return { n, e: e.message }; }`,
    );
    expect(outcome).toMatchObject({ ok: true, result: { n: 10, e: "Mutating tool call limit (10) reached" } });
  });

  test("a fire-and-forget rejection does not crash the host", async () => {
    expect(await run(`tools.boom({}); return "done";`)).toMatchObject({ ok: true, result: "done" });
  });

  test("enumerating tools points at tools.search", async () => {
    const outcome = await run(`return Object.keys(tools);`);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toContain("tools.search");
  });

  test("non-serialisable return values and arguments are reported", async () => {
    const bigint = await run(`return { n: 10n };`);
    expect(bigint.ok).toBe(false);
    if (bigint.ok) return;
    expect(bigint.error).toContain("not JSON-serialisable");
    expect(await run(`return () => 1;`)).toMatchObject({ ok: false, error: expect.stringContaining("not JSON-serialisable") });
    expect(await run(`try { await tools.list_entities(() => 1); } catch (e) { return e.message; }`)).toMatchObject({
      ok: true,
      result: "Tool arguments must be JSON-serialisable",
    });
  });
});

describe("logs", () => {
  test("console methods format values and lines are capped in count and length", async () => {
    const outcome = await run(
      `console.info("a", 1, { b: 2 }, [3], null, undefined);
       console.warn("x".repeat(30));
       for (let i = 0; i < 10; i++) console.error(i);`,
      { maxLogLines: 4, maxLogLineChars: 10 },
    );
    expect(outcome.ok).toBe(true);
    expect(outcome.logs).toEqual([
      'a 1 {"b":2} [3] null undefined'.slice(0, 10) + "… [truncated]",
      "x".repeat(10) + "… [truncated]",
      "0",
      "1",
      "… [8 more log lines truncated]",
    ]);
  });

  test("default caps: 200 lines of 2000 characters", async () => {
    const outcome = await run(`for (let i = 0; i < 205; i++) console.log("y".repeat(2500));`);
    expect(outcome.logs).toHaveLength(201);
    expect(outcome.logs[0]).toBe(`${"y".repeat(2000)}… [truncated]`);
    expect(outcome.logs[200]).toBe("… [5 more log lines truncated]");
  });

  test("logs written before a failure are kept", async () => {
    expect(await run(`console.log("first"); throw new Error("then failed");`)).toMatchObject({
      ok: false,
      error: "Error: then failed",
      logs: ["first"],
    });
  });
});

describe("globals", () => {
  test("JSON values become VM globals", async () => {
    const outcome = await run(`return { args, n: limit * 2, t: typeof flag };`, undefined, {
      globals: { args: { ids: ["a", "b"], nested: { x: null } }, limit: 21, flag: false },
    });
    expect(outcome).toMatchObject({ ok: true, result: { args: { ids: ["a", "b"], nested: { x: null } }, n: 42, t: "boolean" } });
  });

  test("the injection channel is not left behind", async () => {
    expect(await run(`return typeof __globals;`, undefined, { globals: { a: 1 } })).toMatchObject({
      ok: true,
      result: "undefined",
    });
  });

  test("names that would replace an existing global are refused", async () => {
    for (const name of ["tools", "console", "JSON", "__invokeTool"]) {
      const outcome = await run(`return 1;`, undefined, { globals: { [name]: 1 } });
      expect(outcome).toMatchObject({ ok: false, error: `Error: Global name is reserved: ${name}` });
    }
  });
});

describe("onCall", () => {
  test("sees the name, parsed arguments and mutating flag of each call that passes the checks", async () => {
    const seen: SandboxCall[] = [];
    const outcome = await run(`await tools.list_entities({ limit: 1 }); await tools.create_task({ title: "t" }); return 1;`, undefined, {
      onCall: (call) => {
        seen.push(call);
        return { allow: true };
      },
    });
    expect(outcome).toMatchObject({ ok: true, result: 1 });
    expect(seen).toEqual([
      { name: "list_entities", args: { limit: 1 }, mutating: false },
      { name: "create_task", args: { title: "t" }, mutating: true },
    ]);
  });

  test("a refusal rejects the script's call and the tool does not run", async () => {
    invoked.length = 0;
    const outcome = await run(
      `try { await tools.create_task({}); } catch (e) { return e.message; }`,
      undefined,
      { onCall: async (call) => (call.mutating ? { allow: false, error: `${call.name} is not allowed` } : { allow: true }) },
    );
    expect(outcome).toMatchObject({ ok: true, result: "create_task is not allowed" });
    expect(outcome.calls).toEqual([expect.objectContaining({ name: "create_task", ok: false })]);
    expect(invoked).toEqual([]);
  });

  test("a throwing hook refuses the call with its message", async () => {
    const outcome = await run(`return await tools.list_entities({});`, undefined, {
      onCall: () => {
        throw new Error("policy down");
      },
    });
    expect(outcome).toMatchObject({ ok: false, error: "Error: policy down" });
  });

  test("a stub resolves the call without running the tool and is recorded as skipped", async () => {
    invoked.length = 0;
    const outcome = await run(
      `const made = await tools.create_task({ title: "t" });
       const { rows } = await tools.list_entities({ limit: 2 });
       return { made, rows: rows.length };`,
      undefined,
      { onCall: (call) => (call.mutating ? { stub: { dryRun: true, args: call.args } } : { allow: true }) },
    );
    expect(outcome).toMatchObject({ ok: true, result: { made: { dryRun: true, args: { title: "t" } }, rows: 2 } });
    expect(invoked).toEqual([]);
    expect(outcome.calls).toEqual([
      { name: "create_task", ms: expect.any(Number), ok: true, skipped: true },
      { name: "list_entities", ms: expect.any(Number), ok: true },
    ]);
  });

  test("refused and stubbed calls count against the caps", async () => {
    const outcome = await run(
      `const out = [];
       for (let i = 0; i < 3; i++) {
         try { out.push(await tools.create_task({})); } catch (e) { out.push(e.message); }
       }
       return out;`,
      { maxMutatingCalls: 2 },
      { onCall: () => ({ stub: "stubbed" }) },
    );
    expect(outcome).toMatchObject({
      ok: true,
      result: ["stubbed", "stubbed", "Mutating tool call limit (2) reached"],
    });
  });

  test("is not asked about unknown tools", async () => {
    let asked = 0;
    await run(`try { await tools.nope({}); } catch {} return 1;`, undefined, {
      onCall: () => {
        asked += 1;
        return { allow: true };
      },
    });
    expect(asked).toBe(0);
  });
});

describe("serializeExecuteOutcome", () => {
  test("small outcomes serialise in full", async () => {
    const outcome = await run(`console.log("hi"); return { a: 1 };`);
    expect(JSON.parse(serializeExecuteOutcome(outcome))).toEqual({
      result: { a: 1 },
      logs: ["hi"],
      calls: [],
      ms: outcome.ms,
    });
    const failed = await run(`throw new Error("x".repeat(200));`);
    expect(JSON.parse(serializeExecuteOutcome(failed, 50))).toMatchObject({ error: `Error: ${"x".repeat(200)}` });
  });

  test("results over the cap become a preview", async () => {
    const outcome = await run(`return "z".repeat(${DEFAULT_RESULT_CHAR_CAP + 10});`);
    const payload = JSON.parse(serializeExecuteOutcome(outcome));
    expect(payload).toMatchObject({ truncated: true, logs: [], calls: [] });
    expect(payload.result).toBeUndefined();
    expect(payload.note).toBe(
      `Result was ${DEFAULT_RESULT_CHAR_CAP + 12} characters; showing the first ${DEFAULT_RESULT_CHAR_CAP}. Filter or summarise inside the script instead.`,
    );
    expect(payload.resultPreview).toBe(`"${"z".repeat(DEFAULT_RESULT_CHAR_CAP - 1)}…`);
  });
});

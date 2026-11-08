import { defineTable } from "convex/server";
import { v } from "convex/values";
import { describe, expect, it, vi } from "vitest";
import {
  createExpoPushFunctions,
  EXPO_PUSH_BATCH_SIZE,
  EXPO_PUSH_RECEIPTS_URL,
  EXPO_PUSH_SEND_URL,
  EXPO_RECEIPT_DELAY_MS,
  fetchExpoPushReceipts,
  PUSH_TOKENS_TABLE,
  pushTokensFields,
  pushTokensTable,
  schedulePush,
  sendExpoPushMessages,
  tokensToRemoveFromReceipts,
  type ExpoPushCheckReceiptsRef,
  type ExpoPushListTokensRef,
  type ExpoPushRemoveTokensRef,
  type ExpoPushSendRef,
  type PushTokenDoc,
} from "@vvedantb/server";

// A fake Convex backend: the builders hand back each def, so tests call the
// handlers directly. The ctx serves by_user and by_token from an array.

type Doc = PushTokenDoc<string, string>;
type Bound = { field: string; eq: string };
type Json = Record<string, unknown>;

const ref = <T>(name: string) => ({ name }) as unknown as T;
const sendRef = ref<ExpoPushSendRef<string>>("send");
const listRef = ref<ExpoPushListTokensRef<string>>("list");
const removeRef = ref<ExpoPushRemoveTokensRef>("remove");
const checkRef = ref<ExpoPushCheckReceiptsRef>("check");

const A = "ExponentPushToken[aaa]";
const B = "ExpoPushToken[bbb]";

function createBackend(rows: Doc[] = [], currentUser = "alice", fetchImpl?: typeof fetch) {
  let nextId = rows.length;
  const scheduled: Array<{ delayMs: number; fn: unknown; args: unknown }> = [];
  const state = { user: currentUser };
  const ctx = {
    db: {
      query(table: string) {
        expect(table).toBe(PUSH_TOKENS_TABLE);
        return {
          withIndex(index: string, range: (q: { eq(f: string, x: string): Bound }) => Bound) {
            const bound = range({ eq: (field, eq) => ({ field, eq }) });
            const found = rows.filter((row) => (row as unknown as Json)[bound.field] === bound.eq);
            expect(index).toBe(bound.field === "userId" ? "by_user" : "by_token");
            return { first: async () => found[0] ?? null, collect: async () => found };
          },
        };
      },
      async insert(_table: string, value: Omit<Doc, "_id" | "_creationTime">) {
        const _id = `id${nextId++}`;
        rows.push({ ...value, _id, _creationTime: 0 });
        return _id;
      },
      async patch(id: string, value: Partial<Doc>) {
        Object.assign(rows.find((r) => r._id === id) as Doc, value);
      },
      async delete(id: string) {
        rows.splice(rows.findIndex((r) => r._id === id), 1);
      },
    },
    scheduler: {
      runAfter: async (delayMs: number, fn: unknown, args: unknown) => void scheduled.push({ delayMs, fn, args }),
    },
    runQuery: async (_ref: unknown, args: { userId: string }) =>
      rows.filter((r) => r.userId === args.userId).map((r) => r.token),
    runMutation: async (_ref: unknown, args: { tokens: string[] }) => {
      for (const t of args.tokens) {
        const i = rows.findIndex((r) => r.token === t);
        if (i >= 0) rows.splice(i, 1);
      }
    },
  };
  type Def = { handler: (ctx: never, args: never) => Promise<unknown> };
  const builder = (def: Def) => def;
  const fns = createExpoPushFunctions({
    v,
    userId: v.string(),
    mutation: builder as never,
    internalQuery: builder as never,
    internalMutation: builder as never,
    internalAction: builder as never,
    requireCurrentUserId: async () => state.user,
    listTokensRef: () => listRef,
    removeTokensRef: () => removeRef,
    sendRef: () => sendRef,
    checkReceiptsRef: () => checkRef,
    fetch: fetchImpl,
  } as never) as unknown as Record<string, Def> & {
    schedulePush: (ctx: never, params: { userId: string; title: string; data?: object }) => Promise<void>;
  };
  const call = (name: string, args: object, c: object = ctx) =>
    (fns[name] as Def).handler(c as never, args as never);
  return { rows, ctx, scheduled, state, fns, call };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe("schema helpers", () => {
  it("has the Eva fields and both indexes", () => {
    expect(PUSH_TOKENS_TABLE).toBe("pushTokens");
    expect(Object.keys(pushTokensFields(v))).toEqual(["userId", "token", "platform", "updatedAt"]);
    expect(pushTokensFields(v, v.id("users")).userId).toEqual(v.id("users"));
    expect(pushTokensFields(v).platform).toEqual(v.union(v.literal("android"), v.literal("ios")));
    const table = pushTokensTable(defineTable, v);
    expect(table[" indexes"]()).toEqual([
      { indexDescriptor: "by_user", fields: ["userId"] },
      { indexDescriptor: "by_token", fields: ["token"] },
    ]);
  });
});

describe("register and unregister", () => {
  it("upserts by token: one row, and a new user takes the token over", async () => {
    const { rows, call, state } = createBackend();
    await call("register", { token: A, platform: "ios" });
    await call("register", { token: A, platform: "ios" });
    expect(rows).toHaveLength(1);
    state.user = "bob";
    await call("register", { token: A, platform: "android" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: "bob", token: A, platform: "android" });
    await call("register", { token: B, platform: "ios" });
    expect(rows).toHaveLength(2);
  });

  it("rejects a token that is not an Expo token", async () => {
    const { rows, call } = createBackend();
    await expect(call("register", { token: "fcm:abc", platform: "ios" })).rejects.toThrow("Invalid push token");
    await expect(call("register", { token: "ExponentPushToken[]", platform: "ios" })).rejects.toThrow();
    expect(rows).toHaveLength(0);
  });

  it("unregister deletes only the caller's token", async () => {
    const { rows, call, state } = createBackend();
    await call("register", { token: A, platform: "ios" });
    state.user = "bob";
    await call("unregister", { token: A });
    expect(rows).toHaveLength(1);
    state.user = "alice";
    await call("unregister", { token: "ExpoPushToken[none]" });
    expect(rows).toHaveLength(1);
    await call("unregister", { token: A });
    expect(rows).toHaveLength(0);
  });
});

describe("sendExpoPushMessages", () => {
  const tokensOf = (n: number) => Array.from({ length: n }, (_, i) => `ExpoPushToken[t${i}]`);

  it("batches at 100 and keeps request order", async () => {
    expect(EXPO_PUSH_BATCH_SIZE).toBe(100);
    const sizes: number[] = [];
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      expect(url).toBe(EXPO_PUSH_SEND_URL);
      const messages = JSON.parse(String(init?.body)) as Array<Json>;
      sizes.push(messages.length);
      expect(messages[0]).toMatchObject({ title: "Hi", sound: "default", priority: "high", data: { x: 1 } });
      expect(messages[0]).not.toHaveProperty("body");
      return jsonResponse({ data: messages.map((m, i) => ({ status: "ok", id: `${m.to}-${i}` })) });
    });
    const results = await sendExpoPushMessages({
      tokens: tokensOf(250),
      title: "Hi",
      data: { x: 1 },
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sizes).toEqual([100, 100, 50]);
    expect(results).toHaveLength(250);
    expect(results[249]?.token).toBe("ExpoPushToken[t249]");
  });

  it("skips a failed batch and sends an access token when given", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let calls = 0;
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer secret");
      calls++;
      if (calls === 1) return jsonResponse({ errors: [] }, false, 500);
      const n = (JSON.parse(String(init?.body)) as unknown[]).length;
      return jsonResponse({ data: Array.from({ length: n }, () => ({ status: "ok", id: "r" })) });
    });
    const results = await sendExpoPushMessages({
      tokens: tokensOf(150),
      title: "Hi",
      accessToken: "secret",
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(results).toHaveLength(50);
  });
});

describe("send", () => {
  it("removes DeviceNotRegistered tokens and schedules a receipt check for the rest", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        data: [
          { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
          { status: "ok", id: "rcpt-b" },
          { status: "error", details: { error: "MessageRateExceeded" } },
        ],
      }),
    );
    const C = "ExpoPushToken[ccc]";
    const rows: Doc[] = [A, B, C].map((token, i) => ({
      _id: `id${i}`,
      _creationTime: 0,
      userId: "alice",
      token,
      platform: "ios",
      updatedAt: 1,
    }));
    const { call, scheduled } = createBackend(rows, "alice", fetchMock as unknown as typeof fetch);
    await call("send", { userId: "alice", title: "Hi", body: "there" });
    expect(rows.map((r) => r.token)).toEqual([B, C]);
    expect(scheduled).toEqual([
      { delayMs: EXPO_RECEIPT_DELAY_MS, fn: checkRef, args: { receipts: [{ id: "rcpt-b", token: B }] } },
    ]);
  });

  it("does nothing for a user with no tokens", async () => {
    const fetchMock = vi.fn();
    const { call, scheduled } = createBackend([], "alice", fetchMock as unknown as typeof fetch);
    await call("send", { userId: "alice", title: "Hi" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(scheduled).toEqual([]);
  });
});

describe("receipts", () => {
  it("removes tokens whose receipt says DeviceNotRegistered", async () => {
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      expect(url).toBe(EXPO_PUSH_RECEIPTS_URL);
      expect(JSON.parse(String(init?.body))).toEqual({ ids: ["r1", "r2", "r3"] });
      return jsonResponse({
        data: {
          r1: { status: "ok" },
          r2: { status: "error", details: { error: "DeviceNotRegistered" } },
          r3: { status: "error", details: { error: "InvalidCredentials" } },
        },
      });
    });
    const rows: Doc[] = ["ExpoPushToken[1]", "ExpoPushToken[2]", "ExpoPushToken[3]"].map((token, i) => ({
      _id: `id${i}`,
      _creationTime: 0,
      userId: "alice",
      token,
      platform: "android",
      updatedAt: 1,
    }));
    const { call } = createBackend(rows, "alice", fetchMock as unknown as typeof fetch);
    await call("checkReceipts", {
      receipts: [
        { id: "r1", token: "ExpoPushToken[1]" },
        { id: "r2", token: "ExpoPushToken[2]" },
        { id: "r3", token: "ExpoPushToken[3]" },
      ],
    });
    expect(rows.map((r) => r.token)).toEqual(["ExpoPushToken[1]", "ExpoPushToken[3]"]);
  });

  it("batches getReceipts at 1000 ids and ignores ids Expo has no receipt for", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: {} }));
    const ids = Array.from({ length: 2500 }, (_, i) => `r${i}`);
    expect(await fetchExpoPushReceipts(ids, { fetch: fetchMock as unknown as typeof fetch })).toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(tokensToRemoveFromReceipts({}, [{ id: "r1", token: A }])).toEqual([]);
  });
});

describe("schedulePush", () => {
  it("does not schedule when the user has no token", async () => {
    const { ctx, scheduled, fns } = createBackend();
    await fns.schedulePush(ctx as never, { userId: "alice", title: "Hi" });
    expect(scheduled).toEqual([]);
  });

  it("schedules send at 0 ms when the user has a token", async () => {
    const { ctx, scheduled, fns, call } = createBackend();
    await call("register", { token: A, platform: "ios" });
    await fns.schedulePush(ctx as never, { userId: "alice", title: "Hi", data: { a: 1 } });
    expect(scheduled).toEqual([{ delayMs: 0, fn: sendRef, args: { userId: "alice", title: "Hi", data: { a: 1 } } }]);
    // The standalone helper does the same.
    await schedulePush(ctx as never, { userId: "bob", title: "x" }, { sendRef, tableName: PUSH_TOKENS_TABLE });
    expect(scheduled).toHaveLength(1);
  });
});

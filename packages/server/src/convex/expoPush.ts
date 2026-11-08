/**
 * Expo push notifications for Convex apps: a device-token table, `register`
 * and `unregister` mutations, a batched send through the Expo Push API, and
 * push receipts that drop dead tokens.
 *
 * The package cannot own a Convex table and never imports `convex` at
 * runtime, so the app defines the table in its own schema and passes in `v`,
 * its function builders and `requireCurrentUserId`. The HTTP side
 * (`sendExpoPushMessages`, `fetchExpoPushReceipts` and the token-cleanup
 * helpers) is plain TypeScript that runs in Node and tests with no Convex.
 */
import type {
  defineTable as convexDefineTable,
  FunctionReference,
  IndexRange,
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server";
import type { v as convexV, GenericId, Validator } from "convex/values";

/** The default table name. */
export const PUSH_TOKENS_TABLE = "pushTokens";
export const PUSH_TOKENS_USER_INDEX = "by_user";
export const PUSH_TOKENS_TOKEN_INDEX = "by_token";

export const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";
export const EXPO_PUSH_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
/** Messages per send request. Expo rejects larger batches. */
export const EXPO_PUSH_BATCH_SIZE = 100;
/** Receipt ids per `getReceipts` request. Expo accepts up to 1000. */
export const EXPO_RECEIPT_BATCH_SIZE = 1000;
/** Default wait before `send` checks receipts. Expo advises about 15 minutes. */
export const EXPO_RECEIPT_DELAY_MS = 15 * 60 * 1000;
/** `ExponentPushToken[...]` or `ExpoPushToken[...]`. */
export const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[.+\]$/;

export type PushPlatform = "android" | "ios";
/** The `data` object a push carries to the app. Expo needs a JSON object. */
export type ExpoPushData = Record<string, unknown>;

type ConvexV = typeof convexV;

export function isExpoPushToken(token: string): boolean {
  return EXPO_PUSH_TOKEN_PATTERN.test(token);
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

/** A row to write. `UserId` is the app's user id type, for example `Id<"users">`. */
export type PushTokenRow<UserId = string> = {
  userId: UserId;
  token: string;
  platform: PushPlatform;
  updatedAt: number;
};

/**
 * The table's fields: `userId` (pass `v.id("users")` for your users table, or
 * leave it as `v.string()`), `token`, `platform` (`"android"` | `"ios"`) and
 * `updatedAt` (ms).
 *
 * Do not import in `convex/schema.ts` (NoImportModuleInSchema). Use in tests to
 * check your local table matches. See `docs/convex.md`.
 */
export function pushTokensFields(v: ConvexV, userId: Validator<any, "required", string> = v.string()) {
  return {
    userId,
    token: v.string(),
    platform: v.union(v.literal("android"), v.literal("ios")),
    updatedAt: v.number(),
  };
}

/**
 * The table with both indexes (`by_user`, `by_token`).
 *
 * @deprecated Do not call in `convex/schema.ts`: a schema cannot import the
 * package (NoImportModuleInSchema). Define the table locally and use this in
 * tests to check your local table matches. See `docs/convex.md`.
 */
export function pushTokensTable(
  defineTable: typeof convexDefineTable,
  v: ConvexV,
  userId: Validator<any, "required", string> = v.string(),
) {
  return defineTable(pushTokensFields(v, userId))
    .index(PUSH_TOKENS_USER_INDEX, ["userId"])
    .index(PUSH_TOKENS_TOKEN_INDEX, ["token"]);
}

// ---------------------------------------------------------------------------
// Expo Push API: pure helpers
// ---------------------------------------------------------------------------

export type ExpoPushMessage = {
  to: string;
  title: string;
  body?: string;
  sound: "default";
  priority: "high";
  data?: ExpoPushData;
};

type ExpoErrorDetails = { error?: string };

/** A ticket, in request order. An `ok` ticket carries the receipt `id`. */
export type ExpoPushTicket =
  | { status: "ok"; id?: string }
  | { status: "error"; message?: string; details?: ExpoErrorDetails };

/** A receipt, keyed by ticket id in the `getReceipts` response. */
export type ExpoPushReceipt =
  | { status: "ok" }
  | { status: "error"; message?: string; details?: ExpoErrorDetails };

/** A token with the ticket Expo returned for it. */
export type ExpoPushSendResult = { token: string; ticket: ExpoPushTicket };

/** A receipt id with the token it was issued for. */
export type ExpoPushReceiptRef = { id: string; token: string };

export type ExpoPushHttpOptions = {
  /** Default: the global `fetch`, read at call time. */
  fetch?: typeof fetch;
  /** Expo access token, when the project enforces enhanced push security. */
  accessToken?: string;
};

export type SendExpoPushMessagesOptions = ExpoPushHttpOptions & {
  tokens: readonly string[];
  title: string;
  body?: string;
  data?: ExpoPushData;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDetails(value: unknown): ExpoErrorDetails | undefined {
  if (!isRecord(value)) return undefined;
  return typeof value.error === "string" ? { error: value.error } : {};
}

function parseOutcome(value: unknown): ExpoPushTicket | null {
  if (!isRecord(value)) return null;
  if (value.status === "ok") {
    return typeof value.id === "string" ? { status: "ok", id: value.id } : { status: "ok" };
  }
  if (value.status === "error") {
    const message = typeof value.message === "string" ? value.message : undefined;
    return { status: "error", message, details: parseDetails(value.details) };
  }
  return null;
}

/** The `data` array of a send response, or `null` when it is not one ticket per message. */
export function parseExpoTickets(json: unknown, expected: number): ExpoPushTicket[] | null {
  if (!isRecord(json) || !Array.isArray(json.data) || json.data.length !== expected) return null;
  const tickets: ExpoPushTicket[] = [];
  for (const item of json.data) {
    const ticket = parseOutcome(item);
    if (ticket === null) return null;
    tickets.push(ticket);
  }
  return tickets;
}

/** The `data` map of a `getReceipts` response. Entries that do not parse are skipped. */
export function parseExpoReceipts(json: unknown): Record<string, ExpoPushReceipt> | null {
  if (!isRecord(json) || !isRecord(json.data)) return null;
  const receipts: Record<string, ExpoPushReceipt> = {};
  for (const [id, item] of Object.entries(json.data)) {
    const receipt = parseOutcome(item);
    if (receipt !== null) receipts[id] = receipt.status === "ok" ? { status: "ok" } : receipt;
  }
  return receipts;
}

function headers(accessToken: string | undefined): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function postJson(url: string, payload: unknown, options: ExpoPushHttpOptions): Promise<unknown | null> {
  const doFetch = options.fetch ?? globalThis.fetch;
  try {
    const response = await doFetch(url, {
      method: "POST",
      headers: headers(options.accessToken),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`[expoPush] ${url} failed: ${response.status} ${await response.text()}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`[expoPush] ${url} failed:`, err instanceof Error ? err.message : "unknown error");
    return null;
  }
}

/**
 * Sends one message per token, in batches of `EXPO_PUSH_BATCH_SIZE`. Returns
 * a ticket for each token Expo answered for. A batch that fails (network
 * error, non-2xx or an unexpected body) is logged and left out, so the other
 * batches still count.
 */
export async function sendExpoPushMessages(options: SendExpoPushMessagesOptions): Promise<ExpoPushSendResult[]> {
  const { tokens, title, body, data } = options;
  const results: ExpoPushSendResult[] = [];
  for (const batch of chunk(tokens, EXPO_PUSH_BATCH_SIZE)) {
    const messages: ExpoPushMessage[] = batch.map((to) => ({
      to,
      title,
      ...(body === undefined ? {} : { body }),
      sound: "default",
      priority: "high",
      ...(data === undefined ? {} : { data }),
    }));
    const tickets = parseExpoTickets(await postJson(EXPO_PUSH_SEND_URL, messages, options), batch.length);
    if (tickets === null) continue;
    // Tickets come back in request order.
    tickets.forEach((ticket, index) => results.push({ token: batch[index] as string, ticket }));
  }
  return results;
}

/**
 * Fetches receipts for the given ids, in batches of `EXPO_RECEIPT_BATCH_SIZE`.
 * Ids Expo has no receipt for yet are missing from the result. A failed batch
 * is logged and left out.
 */
export async function fetchExpoPushReceipts(
  ids: readonly string[],
  options: ExpoPushHttpOptions = {},
): Promise<Record<string, ExpoPushReceipt>> {
  const receipts: Record<string, ExpoPushReceipt> = {};
  for (const batch of chunk(ids, EXPO_RECEIPT_BATCH_SIZE)) {
    const parsed = parseExpoReceipts(await postJson(EXPO_PUSH_RECEIPTS_URL, { ids: batch }, options));
    if (parsed !== null) Object.assign(receipts, parsed);
  }
  return receipts;
}

/** `DeviceNotRegistered`: the app was uninstalled or the token expired, so stop sending to it. */
export function isDeviceNotRegistered(outcome: ExpoPushTicket | ExpoPushReceipt): boolean {
  return outcome.status === "error" && outcome.details?.error === "DeviceNotRegistered";
}

/**
 * Tokens whose ticket says `DeviceNotRegistered`, without duplicates. Other
 * errors (`MessageTooBig`, `MessageRateExceeded`, `InvalidCredentials`) say
 * nothing about the token, so they never remove one.
 */
export function tokensToRemoveFromTickets(results: readonly ExpoPushSendResult[]): string[] {
  return [...new Set(results.filter((r) => isDeviceNotRegistered(r.ticket)).map((r) => r.token))];
}

/** The receipt ids of `ok` tickets, each with its token. */
export function receiptRefsFromTickets(results: readonly ExpoPushSendResult[]): ExpoPushReceiptRef[] {
  const refs: ExpoPushReceiptRef[] = [];
  for (const { token, ticket } of results) {
    if (ticket.status === "ok" && ticket.id) refs.push({ id: ticket.id, token });
  }
  return refs;
}

/** Tokens whose receipt says `DeviceNotRegistered`, without duplicates. */
export function tokensToRemoveFromReceipts(
  receipts: Record<string, ExpoPushReceipt>,
  refs: readonly ExpoPushReceiptRef[],
): string[] {
  const dead = refs.filter((ref) => {
    const receipt = receipts[ref.id];
    return receipt !== undefined && isDeviceNotRegistered(receipt);
  });
  return [...new Set(dead.map((ref) => ref.token))];
}

// ---------------------------------------------------------------------------
// Convex wiring
// ---------------------------------------------------------------------------

/** A push token document. */
export type PushTokenDoc<UserId, Id> = PushTokenRow<UserId> & { _id: Id; _creationTime: number };

type PushTokenPatch<UserId> = Omit<PushTokenRow<UserId>, "token">;

type PushIndexes<UserId, Doc, Range> = {
  withIndex(
    index: typeof PUSH_TOKENS_USER_INDEX,
    range: (q: { eq(field: "userId", value: UserId): Range }) => Range,
  ): { first(): Promise<Doc | null>; collect(): Promise<Doc[]> };
  withIndex(
    index: typeof PUSH_TOKENS_TOKEN_INDEX,
    range: (q: { eq(field: "token", value: string): Range }) => Range,
  ): { first(): Promise<Doc | null> };
};

export type PushQueryCtx<Table extends string, UserId, Id = GenericId<Table>, Range = IndexRange> = {
  db: { query(table: Table): PushIndexes<UserId, PushTokenDoc<UserId, Id>, Range> };
};

export type PushMutationCtx<Table extends string, UserId, Id = GenericId<Table>, Range = IndexRange> = {
  db: {
    query(table: Table): PushIndexes<UserId, PushTokenDoc<UserId, Id>, Range>;
    insert(table: Table, value: PushTokenRow<UserId>): Promise<Id>;
    patch(id: Id, value: PushTokenPatch<UserId>): Promise<void>;
    delete(id: Id): Promise<void>;
  };
};

export type PushSendParams<UserId> = { userId: UserId; title: string; body?: string; data?: ExpoPushData };
type RegisterArgs = { token: string; platform: PushPlatform };
type UnregisterArgs = { token: string };
type ListTokensArgs<UserId> = { userId: UserId };
type RemoveTokensArgs = { tokens: string[] };
type CheckReceiptsArgs = { receipts: ExpoPushReceiptRef[] };

/**
 * `internal.<module>.send`. Annotate the thunk with it: an unannotated thunk
 * makes `internal` refer to itself (TS7022).
 */
export type ExpoPushSendRef<UserId> = FunctionReference<"action", "internal", PushSendParams<UserId>>;
export type ExpoPushListTokensRef<UserId> = FunctionReference<"query", "internal", ListTokensArgs<UserId>, string[]>;
export type ExpoPushRemoveTokensRef = FunctionReference<"mutation", "internal", RemoveTokensArgs>;
export type ExpoPushCheckReceiptsRef = FunctionReference<"action", "internal", CheckReceiptsArgs>;

/** What `schedulePush` needs of a mutation ctx: `ctx.db` reads and `ctx.scheduler`. */
export type SchedulePushCtx<Table extends string, UserId, Id = GenericId<Table>, Range = IndexRange> = PushQueryCtx<
  Table,
  UserId,
  Id,
  Range
> & {
  scheduler: { runAfter(delayMs: number, fn: ExpoPushSendRef<UserId>, args: PushSendParams<UserId>): Promise<unknown> };
};

/**
 * Queues a push to every device of `params.userId`. Skips the action when the
 * user has no token. Call it from a mutation; the factory also returns it
 * with `sendRef` and `tableName` already bound.
 */
export async function schedulePush<Table extends string, UserId, Id, Range>(
  ctx: SchedulePushCtx<Table, UserId, Id, Range>,
  params: PushSendParams<UserId>,
  options: { sendRef: ExpoPushSendRef<UserId>; tableName: Table },
): Promise<void> {
  const hasToken = await ctx.db
    .query(options.tableName)
    .withIndex(PUSH_TOKENS_USER_INDEX, (q) => q.eq("userId", params.userId))
    .first();
  if (hasToken === null) return;
  await ctx.scheduler.runAfter(0, options.sendRef, params);
}

type ActionRunCtx<UserId> = {
  runQuery(ref: ExpoPushListTokensRef<UserId>, args: ListTokensArgs<UserId>): Promise<string[]>;
  runMutation(ref: ExpoPushRemoveTokensRef, args: RemoveTokensArgs): Promise<unknown>;
  scheduler: { runAfter(delayMs: number, fn: ExpoPushCheckReceiptsRef, args: CheckReceiptsArgs): Promise<unknown> };
};

type Req<T> = Validator<T, "required", string>;
type Opt<T> = Validator<T | undefined, "optional", string>;
type PlatformValidator = Req<PushPlatform>;

type RegisterDef<Ctx> = {
  args: { token: Req<string>; platform: PlatformValidator };
  returns: Req<null>;
  handler: (ctx: Ctx, args: RegisterArgs) => Promise<null>;
};
type UnregisterDef<Ctx> = {
  args: { token: Req<string> };
  returns: Req<null>;
  handler: (ctx: Ctx, args: UnregisterArgs) => Promise<null>;
};
type ListTokensDef<Ctx, UserId> = {
  args: { userId: Req<UserId> };
  returns: Req<string[]>;
  handler: (ctx: Ctx, args: ListTokensArgs<UserId>) => Promise<string[]>;
};
type RemoveTokensDef<Ctx> = {
  args: { tokens: Req<string[]> };
  returns: Req<null>;
  handler: (ctx: Ctx, args: RemoveTokensArgs) => Promise<null>;
};
type SendDef<Ctx, UserId> = {
  args: { userId: Req<UserId>; title: Req<string>; body: Opt<string>; data: Opt<ExpoPushData> };
  returns: Req<null>;
  handler: (ctx: Ctx, args: PushSendParams<UserId>) => Promise<null>;
};
type CheckReceiptsDef<Ctx> = {
  args: { receipts: Req<ExpoPushReceiptRef[]> };
  returns: Req<null>;
  handler: (ctx: Ctx, args: CheckReceiptsArgs) => Promise<null>;
};

export type ExpoPushFunctionsConfig<
  Table extends string,
  UserId,
  Id,
  Range,
  MutationCtx extends PushMutationCtx<Table, UserId, Id, Range>,
  ActionCtx extends ActionRunCtx<UserId>,
> = {
  v: ConvexV;
  /** The validator for user ids, for example `v.id("users")`. It sets `UserId`. */
  userId: Req<UserId>;
  /** The app's public `mutation`, narrowed to the two calls made here. */
  mutation: ((def: RegisterDef<MutationCtx>) => RegisteredMutation<"public", RegisterArgs, Promise<null>>) &
    ((def: UnregisterDef<MutationCtx>) => RegisteredMutation<"public", UnregisterArgs, Promise<null>>);
  internalQuery: (
    def: ListTokensDef<PushQueryCtx<NoInfer<Table>, UserId, Id, Range>, UserId>,
  ) => RegisteredQuery<"internal", ListTokensArgs<UserId>, Promise<string[]>>;
  internalMutation: (
    def: RemoveTokensDef<PushMutationCtx<NoInfer<Table>, UserId, Id, Range>>,
  ) => RegisteredMutation<"internal", RemoveTokensArgs, Promise<null>>;
  internalAction: ((
    def: SendDef<ActionCtx, UserId>,
  ) => RegisteredAction<"internal", PushSendParams<UserId>, Promise<null>>) &
    ((def: CheckReceiptsDef<ActionCtx>) => RegisteredAction<"internal", CheckReceiptsArgs, Promise<null>>);
  /**
   * The signed-in user's id, throwing when there is none. Annotate the ctx
   * with your `MutationCtx`: `(ctx: MutationCtx) => userAuth.requireCurrentUserId(ctx)`.
   */
  requireCurrentUserId: (ctx: MutationCtx) => Promise<UserId>;
  /** `(): ExpoPushListTokensRef<Id<"users">> => internal.push.listTokensForUser`. */
  listTokensRef: () => ExpoPushListTokensRef<UserId>;
  removeTokensRef: () => ExpoPushRemoveTokensRef;
  sendRef: () => ExpoPushSendRef<UserId>;
  checkReceiptsRef: () => ExpoPushCheckReceiptsRef;
  /** The tokens table. Default `"pushTokens"`; it needs both indexes. */
  tableName?: Table;
  /** Wait before receipts are checked. Default `EXPO_RECEIPT_DELAY_MS` (15 minutes). */
  receiptDelayMs?: number;
  /** For `fetch` in tests. Default: the global `fetch`. */
  fetch?: typeof fetch;
  /** Read at send time, so it can come from `process.env`. Sent as a bearer token. */
  accessToken?: () => string | undefined;
};

/**
 * The push functions. Export them from one module, here `convex/push.ts`:
 *
 * ```ts
 * export const { register, unregister, listTokensForUser, removeTokens, send, checkReceipts, schedulePush } =
 *   createExpoPushFunctions({
 *     v,
 *     userId: v.id("users"),
 *     mutation,
 *     internalQuery,
 *     internalMutation,
 *     internalAction,
 *     requireCurrentUserId: (ctx: MutationCtx) => userAuth.requireCurrentUserId(ctx),
 *     listTokensRef: (): ExpoPushListTokensRef<Id<"users">> => internal.push.listTokensForUser,
 *     removeTokensRef: (): ExpoPushRemoveTokensRef => internal.push.removeTokens,
 *     sendRef: (): ExpoPushSendRef<Id<"users">> => internal.push.send,
 *     checkReceiptsRef: (): ExpoPushCheckReceiptsRef => internal.push.checkReceipts,
 *   });
 * ```
 *
 * `send` lists the user's tokens, sends in batches, removes tokens whose
 * ticket says `DeviceNotRegistered`, then schedules `checkReceipts` to do the
 * same for receipts. `schedulePush` is the bound helper to call from your
 * mutations.
 */
export function createExpoPushFunctions<
  Table extends string = typeof PUSH_TOKENS_TABLE,
  UserId = string,
  Id = GenericId<Table>,
  Range = IndexRange,
  MutationCtx extends PushMutationCtx<Table, UserId, Id, Range> = PushMutationCtx<Table, UserId, Id, Range>,
  ActionCtx extends ActionRunCtx<UserId> = ActionRunCtx<UserId>,
>(config: ExpoPushFunctionsConfig<Table, UserId, Id, Range, MutationCtx, ActionCtx>) {
  const built = buildExpoPushFunctions<UserId, Id, Range, MutationCtx, ActionCtx>(
    config as unknown as ExpoPushFunctionsConfig<string, UserId, Id, Range, MutationCtx, ActionCtx>,
  );
  // The builders only check `Table` here; `schedulePush` takes the app's real ctx, so type it with `Table`.
  return {
    ...built,
    schedulePush: built.schedulePush as (
      ctx: SchedulePushCtx<Table, UserId, Id, Range>,
      params: PushSendParams<UserId>,
    ) => Promise<void>,
  };
}

function buildExpoPushFunctions<
  UserId,
  Id,
  Range,
  MutationCtx extends PushMutationCtx<string, UserId, Id, Range>,
  ActionCtx extends ActionRunCtx<UserId>,
>(config: ExpoPushFunctionsConfig<string, UserId, Id, Range, MutationCtx, ActionCtx>) {
  const { v, userId, requireCurrentUserId } = config;
  const table = config.tableName ?? PUSH_TOKENS_TABLE;
  const platform = v.union(v.literal("android"), v.literal("ios"));
  const httpOptions = (): ExpoPushHttpOptions => ({ fetch: config.fetch, accessToken: config.accessToken?.() });

  const register = config.mutation({
    args: { token: v.string(), platform },
    returns: v.null(),
    handler: async (ctx, args) => {
      if (!isExpoPushToken(args.token)) throw new Error("Invalid push token");
      const currentUserId = await requireCurrentUserId(ctx);
      const existing = await ctx.db
        .query(table)
        .withIndex(PUSH_TOKENS_TOKEN_INDEX, (q) => q.eq("token", args.token))
        .first();
      const fields = { userId: currentUserId, platform: args.platform, updatedAt: Date.now() };
      if (existing) {
        // A token moves with the device, so a new sign-in takes it over.
        await ctx.db.patch(existing._id, fields);
      } else {
        await ctx.db.insert(table, { token: args.token, ...fields });
      }
      return null;
    },
  });

  const unregister = config.mutation({
    args: { token: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
      const currentUserId = await requireCurrentUserId(ctx);
      const existing = await ctx.db
        .query(table)
        .withIndex(PUSH_TOKENS_TOKEN_INDEX, (q) => q.eq("token", args.token))
        .first();
      if (existing && existing.userId === currentUserId) await ctx.db.delete(existing._id);
      return null;
    },
  });

  const listTokensForUser = config.internalQuery({
    args: { userId },
    returns: v.array(v.string()),
    handler: async (ctx, args) => {
      const rows = await ctx.db
        .query(table)
        .withIndex(PUSH_TOKENS_USER_INDEX, (q) => q.eq("userId", args.userId))
        .collect();
      return rows.map((row) => row.token);
    },
  });

  const removeTokens = config.internalMutation({
    args: { tokens: v.array(v.string()) },
    returns: v.null(),
    handler: async (ctx, args) => {
      for (const token of args.tokens) {
        const row = await ctx.db
          .query(table)
          .withIndex(PUSH_TOKENS_TOKEN_INDEX, (q) => q.eq("token", token))
          .first();
        if (row) await ctx.db.delete(row._id);
      }
      return null;
    },
  });

  const send = config.internalAction({
    args: { userId, title: v.string(), body: v.optional(v.string()), data: v.optional(v.record(v.string(), v.any())) },
    returns: v.null(),
    handler: async (ctx, args) => {
      const tokens = await ctx.runQuery(config.listTokensRef(), { userId: args.userId });
      if (tokens.length === 0) return null;
      const results = await sendExpoPushMessages({
        tokens,
        title: args.title,
        body: args.body,
        data: args.data,
        ...httpOptions(),
      });
      const dead = tokensToRemoveFromTickets(results);
      if (dead.length > 0) await ctx.runMutation(config.removeTokensRef(), { tokens: dead });
      // Dead tokens are gone already; only check receipts for the rest.
      const receipts = receiptRefsFromTickets(results).filter((ref) => !dead.includes(ref.token));
      if (receipts.length > 0) {
        await ctx.scheduler.runAfter(config.receiptDelayMs ?? EXPO_RECEIPT_DELAY_MS, config.checkReceiptsRef(), {
          receipts,
        });
      }
      return null;
    },
  });

  const checkReceipts = config.internalAction({
    args: { receipts: v.array(v.object({ id: v.string(), token: v.string() })) },
    returns: v.null(),
    handler: async (ctx, args) => {
      const found = await fetchExpoPushReceipts(
        args.receipts.map((ref) => ref.id),
        httpOptions(),
      );
      const dead = tokensToRemoveFromReceipts(found, args.receipts);
      if (dead.length > 0) await ctx.runMutation(config.removeTokensRef(), { tokens: dead });
      return null;
    },
  });

  const boundSchedulePush = (
    ctx: SchedulePushCtx<string, UserId, Id, Range>,
    params: PushSendParams<UserId>,
  ): Promise<void> => schedulePush(ctx, params, { sendRef: config.sendRef(), tableName: table });

  return {
    register,
    unregister,
    listTokensForUser,
    removeTokens,
    send,
    checkReceipts,
    schedulePush: boundSchedulePush,
  };
}

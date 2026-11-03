import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
  type GenericActionCtx,
  type GenericMutationCtx,
  type GenericQueryCtx,
} from "convex/server";
import { v, type Infer } from "convex/values";
import { expectTypeOf } from "vitest";
import {
  activePlanSlugs,
  createVProModule,
  parseClerkBillingEvent,
  verifyClerkWebhook,
  type ClerkBillingChange,
} from "@vvedantb/server";

// Type-only checks, run by `pnpm typecheck` (not vitest: the ctx values are declared, not built).
// A real Convex schema: the generated ctx types must fit the structural ones with no cast.
const schema = defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    planSlugs: v.optional(v.array(v.string())),
  }).index("by_clerk_id", ["clerkId"]),
  accounts: defineTable({
    clerkUserId: v.string(),
    billingPlanSlugs: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_user", ["clerkUserId"]),
});
type DataModel = DataModelFromSchemaDefinition<typeof schema>;
type QueryCtx = GenericQueryCtx<DataModel>;
type MutationCtx = GenericMutationCtx<DataModel>;
type ActionCtx = GenericActionCtx<DataModel>;
type UserDoc = DataModel["users"]["document"];

const users = createVProModule<DataModel>()({
  table: "users",
  index: "by_clerk_id",
  clerkIdField: "clerkId",
  planSlugsField: "planSlugs",
});

const accounts = createVProModule<DataModel>()({
  table: "accounts",
  index: "by_clerk_user",
  clerkIdField: "clerkUserId",
  planSlugsField: "billingPlanSlugs",
  lookup: "unique",
});

// The args validator an app's internal mutation would take.
const changeValidator = v.union(
  v.object({ kind: v.literal("replace"), clerkId: v.string(), planSlugs: v.array(v.string()) }),
  v.object({ kind: v.literal("item"), clerkId: v.string(), status: v.string(), slug: v.string() }),
);

// The shape of `verifyWebhook` from `@clerk/backend/webhooks` (not installed here).
type ClerkEvent =
  | { object: "event"; type: "subscription.active"; data: { payer: { user_id?: string }; items: { status: "active"; plan: { slug: string } }[] } }
  | { object: "event"; type: "user.created"; data: { id: string } };
declare function verifyWebhook(request: Request, options?: { signingSecret?: string }): Promise<ClerkEvent>;

declare const queryCtx: QueryCtx;
declare const mutationCtx: MutationCtx;
declare const actionCtx: ActionCtx;
declare const user: UserDoc;
declare const request: Request;

export function vProModuleTypeChecks(): void {
  // a MutationCtx fits the writer; the change validator's type is a ClerkBillingChange
  {
    const change: Infer<typeof changeValidator> = { kind: "item", clerkId: "user_a", status: "ended", slug: "v_pro" };
    expectTypeOf(users.writeBillingChange(mutationCtx, change)).resolves.toEqualTypeOf<boolean>();
    expectTypeOf(accounts.writeBillingChange(mutationCtx, change)).resolves.toEqualTypeOf<boolean>();
    expectTypeOf<Infer<typeof changeValidator>>().toExtend<ClerkBillingChange>();
  }

  // rows, patches and the plan check use the configured fields
  {
    expectTypeOf(users.planSlugsOf(user)).toEqualTypeOf<string[]>();
    expectTypeOf(users.userHasVPro(user, { identity: null, compIds: [] })).toEqualTypeOf<boolean>();
    expectTypeOf(accounts.planSlugsPatch(["v_pro"]).billingPlanSlugs).toEqualTypeOf<string[]>();
    void mutationCtx.db.patch(user._id, users.planSlugsPatch(users.nextPlanSlugs(user, { kind: "replace", clerkId: "user_a", planSlugs: [] })));
  }

  // the verified event type comes from the injected verifyWebhook and feeds the parser
  {
    const verified = verifyClerkWebhook(verifyWebhook, request);
    expectTypeOf(verified).resolves.toEqualTypeOf<
      { ok: true; event: ClerkEvent } | { ok: false; reason: "missing-secret" | "invalid"; error: string }
    >();
    void verified.then((result) => (result.ok ? parseClerkBillingEvent(result.event) : null));
  }

  // the parser and slug helpers take real-looking Clerk shapes
  {
    expectTypeOf(activePlanSlugs([{ status: "active", plan: { slug: "v_pro" } }])).toEqualTypeOf<string[]>();
    expectTypeOf(parseClerkBillingEvent({ type: "user.created", data: {} })).toEqualTypeOf<ClerkBillingChange | null>();
  }

  // rejects wrong contexts and configs
  {
    const change: ClerkBillingChange = { kind: "replace", clerkId: "user_a", planSlugs: [] };
    // @ts-expect-error a query ctx cannot patch
    void users.writeBillingChange(queryCtx, change);
    // @ts-expect-error an action ctx has no db
    void users.writeBillingChange(actionCtx, change);
    // @ts-expect-error the slugs field must hold a string array
    createVProModule<DataModel>()({ table: "users", index: "by_clerk_id", clerkIdField: "clerkId", planSlugsField: "email" });
    // @ts-expect-error the slugs field must be on the table
    createVProModule<DataModel>()({ table: "users", index: "by_clerk_id", clerkIdField: "clerkId", planSlugsField: "billingPlanSlugs" });
    // @ts-expect-error unknown table
    createVProModule<DataModel>()({ table: "people", index: "by_clerk_id", clerkIdField: "clerkId", planSlugsField: "planSlugs" });
    // @ts-expect-error index not on the table
    createVProModule<DataModel>()({ table: "users", index: "by_clerk_user", clerkIdField: "clerkId", planSlugsField: "planSlugs" });
    // @ts-expect-error clerk id field is not the index's first field
    createVProModule<DataModel>()({ table: "users", index: "by_clerk_id", clerkIdField: "email", planSlugsField: "planSlugs" });
    // @ts-expect-error a change needs its kind's fields
    void users.nextPlanSlugs(user, { kind: "item", clerkId: "user_a", planSlugs: [] });
  }
}

import {
  actionGeneric,
  defineSchema,
  defineTable,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  mutationGeneric,
  type DataModelFromSchemaDefinition,
  type GenericMutationCtx,
} from "convex/server";
import { v, type GenericId } from "convex/values";
import {
  createClerkUserAuth,
  createExpoPushFunctions,
  type ExpoPushCheckReceiptsRef,
  type ExpoPushListTokensRef,
  type ExpoPushRemoveTokensRef,
  type ExpoPushSendRef,
} from "@vvedantb/server";

// Type-only checks, run by `pnpm typecheck`: the factory accepts the real Convex builders and
// `createClerkUserAuth(...).requireCurrentUserId` with no cast.
const schema = defineSchema({
  users: defineTable({ clerkId: v.string() }).index("by_clerk_id", ["clerkId"]),
  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.union(v.literal("android"), v.literal("ios")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),
});
type DataModel = DataModelFromSchemaDefinition<typeof schema>;
type MutationCtx = GenericMutationCtx<DataModel>;
type UserId = GenericId<"users">;

const userAuth = createClerkUserAuth<DataModel>()({ table: "users", index: "by_clerk_id", field: "clerkId" });

declare const sendRef: ExpoPushSendRef<UserId>;
declare const listRef: ExpoPushListTokensRef<UserId>;
declare const removeRef: ExpoPushRemoveTokensRef;
declare const checkRef: ExpoPushCheckReceiptsRef;

export const push = createExpoPushFunctions({
  v,
  userId: v.id("users"),
  mutation: mutationGeneric as never as import("convex/server").MutationBuilder<DataModel, "public">,
  internalQuery: internalQueryGeneric as never as import("convex/server").QueryBuilder<DataModel, "internal">,
  internalMutation: internalMutationGeneric as never as import("convex/server").MutationBuilder<DataModel, "internal">,
  internalAction: internalActionGeneric as never as import("convex/server").ActionBuilder<DataModel, "internal">,
  requireCurrentUserId: (ctx: MutationCtx) => userAuth.requireCurrentUserId(ctx),
  listTokensRef: () => listRef,
  removeTokensRef: () => removeRef,
  sendRef: () => sendRef,
  checkReceiptsRef: () => checkRef,
});

void actionGeneric;
export async function check(ctx: MutationCtx): Promise<void> {
  await push.schedulePush(ctx, { userId: "u" as UserId, title: "t", data: { a: 1 } });
}

import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
  type GenericActionCtx,
  type GenericMutationCtx,
  type GenericQueryCtx,
} from "convex/server";
import { v, type GenericId } from "convex/values";
import { expectTypeOf } from "vitest";
import { createClerkUserAuth } from "@vvedantb/server";

// Type-only checks, run by `pnpm typecheck` (not vitest: the ctx values are declared, not built).
// A real Convex schema: the generated ctx types must fit the structural ones with no cast.
const schema = defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    admin: v.optional(v.boolean()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),
  accounts: defineTable({
    clerkUserId: v.string(),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_clerk_user", ["clerkUserId"]),
});
type DataModel = DataModelFromSchemaDefinition<typeof schema>;
type QueryCtx = GenericQueryCtx<DataModel>;
type MutationCtx = GenericMutationCtx<DataModel>;
type ActionCtx = GenericActionCtx<DataModel>;
type UserDoc = DataModel["users"]["document"];

const userAuth = createClerkUserAuth<DataModel>()({
  table: "users",
  index: "by_clerk_id",
  field: "clerkId",
  adminField: "admin",
});

const accountAuth = createClerkUserAuth<DataModel>()({
  table: "accounts",
  index: "by_clerk_user",
  field: "clerkUserId",
  lookup: "unique",
});

declare const queryCtx: QueryCtx;
declare const mutationCtx: MutationCtx;
declare const eitherCtx: QueryCtx | MutationCtx;
declare const actionCtx: ActionCtx;

export function clerkUserAuthTypeChecks(): void {
  // accepts QueryCtx, MutationCtx and their union
  {
    expectTypeOf(userAuth.getCurrentUserId(queryCtx)).resolves.toEqualTypeOf<GenericId<"users"> | null>();
    expectTypeOf(userAuth.getCurrentUserId(mutationCtx)).resolves.toEqualTypeOf<GenericId<"users"> | null>();
    expectTypeOf(userAuth.getCurrentUserId(eitherCtx)).resolves.toEqualTypeOf<GenericId<"users"> | null>();
    expectTypeOf(userAuth.requireCurrentUserId(eitherCtx)).resolves.toEqualTypeOf<GenericId<"users">>();
    expectTypeOf(userAuth.getCurrentUser(queryCtx)).resolves.toEqualTypeOf<UserDoc | null>();
    expectTypeOf(userAuth.getUserByClerkId(queryCtx, "user_1")).resolves.toEqualTypeOf<UserDoc | null>();
    expectTypeOf(userAuth.isCurrentUserAdmin(queryCtx)).resolves.toEqualTypeOf<boolean>();
    expectTypeOf(accountAuth.getCurrentUserId(queryCtx)).resolves.toEqualTypeOf<GenericId<"accounts"> | null>();
  }

  // ensureUser takes a MutationCtx, the real identity type and insert fields
  {
    expectTypeOf(
      userAuth.ensureUser(mutationCtx, (identity) => ({ clerkId: identity.subject, email: identity.email }), {
        patch: (existing, identity) =>
          identity.email !== undefined && existing.email !== identity.email ? { email: identity.email } : undefined,
      }),
    ).resolves.toEqualTypeOf<{ userId: GenericId<"users">; wasCreated: boolean }>();
  }

  // rejects wrong contexts and configs
  {
    // @ts-expect-error an action ctx has no db
    void userAuth.getCurrentUserId(actionCtx);
    // @ts-expect-error a query ctx cannot insert
    void userAuth.ensureUser(queryCtx, (identity) => ({ clerkId: identity.subject }));
    // @ts-expect-error insert fields must match the table
    void userAuth.ensureUser(mutationCtx, (identity) => ({ clerkUserId: identity.subject }));
    // @ts-expect-error unknown table
    createClerkUserAuth<DataModel>()({ table: "people", index: "by_clerk_id", field: "clerkId" });
    // @ts-expect-error index not on the table
    createClerkUserAuth<DataModel>()({ table: "users", index: "by_clerk_user", field: "clerkId" });
    // @ts-expect-error field is not the index's first field
    createClerkUserAuth<DataModel>()({ table: "users", index: "by_clerk_id", field: "email" });
    // @ts-expect-error admin field not on the document
    createClerkUserAuth<DataModel>()({ table: "users", index: "by_clerk_id", field: "clerkId", adminField: "isAdmin" });
  }
}

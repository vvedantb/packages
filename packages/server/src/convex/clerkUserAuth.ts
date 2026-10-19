/**
 * Clerk-user lookups for Convex functions: the caller's identity `subject`
 * resolved to a row through one index. Typed structurally, so the package
 * never imports `convex`; a real `QueryCtx` or `MutationCtx` fits the ctx
 * types below without a cast.
 */

/** The part of a Convex table's type info this helper reads (`DataModel[table]`). */
export type ClerkUserTableInfoLike = {
  document: { _id: string };
  indexes: Record<string, string[]>;
};

/** The part of a Convex `DataModel` this helper reads. Pass your generated `DataModel`. */
export type ClerkUserDataModelLike = Record<string, ClerkUserTableInfoLike>;

/** The part of Convex's `UserIdentity` this helper reads. */
export type ClerkUserIdentityLike = { readonly subject: string };

/** The index range builder after `q`: one `eq` on the Clerk id field. */
export type ClerkUserIndexRange<Field extends string, Range> = {
  eq(field: Field, value: string): Range;
};

/** `ctx.db` reads: one index lookup that ends in `.first()` or `.unique()`. */
export type ClerkUserDbReader<
  Table extends string,
  Index extends string,
  Field extends string,
  Doc,
  Range,
> = {
  query(table: Table): {
    withIndex(
      index: Index,
      range: (q: ClerkUserIndexRange<Field, Range>) => Range,
    ): { first(): Promise<Doc | null>; unique(): Promise<Doc | null> };
  };
};

/** A Convex `QueryCtx` or `MutationCtx`, structurally. */
export type ClerkUserQueryCtx<
  Table extends string,
  Index extends string,
  Field extends string,
  Doc,
  Range,
  Identity extends ClerkUserIdentityLike = ClerkUserIdentityLike,
> = {
  auth: { getUserIdentity(): Promise<Identity | null> };
  db: ClerkUserDbReader<Table, Index, Field, Doc, Range>;
};

/** A row to insert: the document without Convex's system fields. */
export type ClerkUserInsert<Doc> = Omit<Doc, "_id" | "_creationTime">;

/** A Convex `MutationCtx`, structurally. */
export type ClerkUserMutationCtx<
  Table extends string,
  Index extends string,
  Field extends string,
  Doc extends { _id: string },
  Range,
  Identity extends ClerkUserIdentityLike = ClerkUserIdentityLike,
> = {
  auth: { getUserIdentity(): Promise<Identity | null> };
  db: ClerkUserDbReader<Table, Index, Field, Doc, Range> & {
    insert(table: Table, value: ClerkUserInsert<Doc>): Promise<Doc["_id"]>;
    patch(id: Doc["_id"], value: Partial<ClerkUserInsert<Doc>>): Promise<void>;
  };
};

export type ClerkUserAuthConfig<
  Table extends string,
  Index extends string,
  Field extends string,
  AdminField extends string,
> = {
  /** The users table, for example `"users"`. */
  table: Table;
  /** The index on the Clerk id field, for example `"by_clerk_id"`. */
  index: Index;
  /** The indexed field that holds the identity `subject`, for example `"clerkId"`. */
  field: Field;
  /** A boolean field; `isCurrentUserAdmin` is true only when it is `=== true`. */
  adminField?: AdminField;
  /** How the index lookup ends. Default `"first"`; `"unique"` throws on duplicate rows. */
  lookup?: "first" | "unique";
  /** Thrown by `requireCurrentUserId` and `ensureUser`. Default `"Not authenticated"`. */
  unauthenticatedMessage?: string;
};

export type EnsureClerkUserOptions<Doc, Identity> = {
  /**
   * Fields to patch on an existing row, or `undefined` to leave it alone.
   * Only called when the row exists.
   */
  patch?: (existing: Doc, identity: Identity) => Partial<ClerkUserInsert<Doc>> | undefined;
  /** Thrown when there is no identity. Default: the config's `unauthenticatedMessage`. */
  unauthenticatedMessage?: string;
  /** Thrown when the identity has an empty `subject`. Default `"Clerk user ID is required"`. */
  missingSubjectMessage?: string;
};

export type EnsureClerkUserResult<Id> = { userId: Id; wasCreated: boolean };

const DEFAULT_UNAUTHENTICATED_MESSAGE = "Not authenticated";
const DEFAULT_MISSING_SUBJECT_MESSAGE = "Clerk user ID is required";

/**
 * Build Clerk-user helpers for one users table. Curried so `DataModel` can be
 * given while the config keys are inferred (and checked against it):
 *
 * ```ts
 * const userAuth = createClerkUserAuth<DataModel>()({
 *   table: "users",
 *   index: "by_clerk_id",
 *   field: "clerkId",
 *   adminField: "admin",
 * });
 * ```
 */
export function createClerkUserAuth<DataModel extends ClerkUserDataModelLike>() {
  return function configure<
    const Table extends keyof DataModel & string,
    const Index extends keyof DataModel[Table]["indexes"] & string,
    const Field extends DataModel[Table]["indexes"][Index][0],
    const AdminField extends keyof DataModel[Table]["document"] & string = never,
  >(config: ClerkUserAuthConfig<Table, Index, Field, AdminField>) {
    type Doc = DataModel[Table]["document"];
    type Id = Doc["_id"];
    const unauthenticatedMessage =
      config.unauthenticatedMessage ?? DEFAULT_UNAUTHENTICATED_MESSAGE;

    function getUserByClerkId<Range>(
      ctx: { db: ClerkUserDbReader<Table, Index, Field, Doc, Range> },
      clerkId: string,
    ): Promise<Doc | null> {
      const query = ctx.db
        .query(config.table)
        .withIndex(config.index, (q) => q.eq(config.field, clerkId));
      return config.lookup === "unique" ? query.unique() : query.first();
    }

    /** The caller's row, or `null` with no identity, an empty `subject`, or no row. */
    async function getCurrentUser<Range>(
      ctx: ClerkUserQueryCtx<Table, Index, Field, Doc, Range>,
    ): Promise<Doc | null> {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.subject) return null;
      return getUserByClerkId(ctx, identity.subject);
    }

    async function getCurrentUserId<Range>(
      ctx: ClerkUserQueryCtx<Table, Index, Field, Doc, Range>,
    ): Promise<Id | null> {
      const user = await getCurrentUser(ctx);
      return user?._id ?? null;
    }

    /** `getCurrentUserId`, throwing `new Error(message)` where that returns `null`. */
    async function requireCurrentUserId<Range>(
      ctx: ClerkUserQueryCtx<Table, Index, Field, Doc, Range>,
      message: string = unauthenticatedMessage,
    ): Promise<Id> {
      const userId = await getCurrentUserId(ctx);
      if (userId === null) throw new Error(message);
      return userId;
    }

    async function isCurrentUserAdmin<Range>(
      ctx: ClerkUserQueryCtx<Table, Index, Field, Doc, Range>,
    ): Promise<boolean> {
      const adminField = config.adminField;
      if (adminField === undefined) {
        throw new Error("createClerkUserAuth: set adminField to use isCurrentUserAdmin");
      }
      const user = await getCurrentUser(ctx);
      return user !== null && user[adminField] === true;
    }

    /**
     * The ensure-user mutation core: throws without an identity or `subject`,
     * patches an existing row when `options.patch` returns fields, otherwise
     * inserts `buildFields(identity)` (which must set the Clerk id field).
     */
    async function ensureUser<Range, Identity extends ClerkUserIdentityLike>(
      ctx: ClerkUserMutationCtx<Table, Index, Field, Doc, Range, Identity>,
      buildFields: (identity: Identity) => ClerkUserInsert<Doc>,
      options: EnsureClerkUserOptions<Doc, Identity> = {},
    ): Promise<EnsureClerkUserResult<Id>> {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error(options.unauthenticatedMessage ?? unauthenticatedMessage);
      }
      if (!identity.subject) {
        throw new Error(options.missingSubjectMessage ?? DEFAULT_MISSING_SUBJECT_MESSAGE);
      }
      const existing = await getUserByClerkId(ctx, identity.subject);
      if (existing) {
        const patch = options.patch?.(existing, identity);
        if (patch !== undefined) await ctx.db.patch(existing._id, patch);
        return { userId: existing._id, wasCreated: false };
      }
      const userId = await ctx.db.insert(config.table, buildFields(identity));
      return { userId, wasCreated: true };
    }

    return {
      getUserByClerkId,
      getCurrentUser,
      getCurrentUserId,
      requireCurrentUserId,
      isCurrentUserAdmin,
      ensureUser,
    };
  };
}

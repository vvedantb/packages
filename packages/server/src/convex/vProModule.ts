import {
  applyBillingChange,
  parseClerkBillingEvent,
  type ClerkBillingChange,
  type ClerkBillingOptions,
  type ClerkWebhookEventLike,
} from "./clerkBilling.js";
import {
  createClerkUserAuth,
  type ClerkUserDataModelLike,
  type ClerkUserDbReader,
  type ClerkUserInsert,
} from "./clerkUserAuth.js";
import { hasVPro } from "./vPlan.js";

/**
 * V Pro helpers bound to one users table and its field names, so an app keeps
 * its stored field (`planSlugs`, `billingPlanSlugs`, ...) with no data
 * migration. Typed structurally like `createClerkUserAuth`: no `convex` import.
 */

/** Document fields that can hold a `string[]` (optional ones too). */
export type VProPlanSlugsFieldOf<Doc> = {
  [K in keyof Doc & string]-?: string[] extends Doc[K] ? K : never;
}[keyof Doc & string];

/** `ctx.db` for `createUser`: one insert. A Convex `MutationCtx` fits. */
export type VProCreateUserCtx<Table extends string, Doc extends { _id: string }> = {
  db: { insert(table: Table, value: ClerkUserInsert<Doc>): Promise<Doc["_id"]> };
};

/**
 * Inserts the users row when a billing event arrives before the row exists.
 * The app owns the other fields (for example `createdAt`, `lastSeenAt`).
 */
export type VProCreateUser<Table extends string, Doc extends { _id: string }> = (
  ctx: VProCreateUserCtx<Table, Doc>,
  args: { clerkId: string; planSlugs: string[] },
) => Promise<unknown>;

/** What `writeBillingChange` does when there is no row: skip it, or call `createUser`. */
export type VProMissingUserConfig<Table extends string, Doc extends { _id: string }> =
  | {
      /** Default `"noop"`: no write, `writeBillingChange` returns `false`. */
      onMissingUser?: "noop";
      createUser?: undefined;
    }
  | {
      /** `"create"` (implied by `createUser`): call `createUser`, then return `true`. */
      onMissingUser?: "create";
      /** Inserts the missing row with the given slugs. Required for `"create"`. */
      createUser: VProCreateUser<Table, Doc>;
    };

export type VProModuleConfig<
  Table extends string,
  Index extends string,
  ClerkIdField extends string,
  PlanSlugsField extends string,
  Doc extends { _id: string } = { _id: string },
> = VProMissingUserConfig<Table, Doc> & {
  /** The users table, for example `"users"`. */
  table: Table;
  /** The index on the Clerk id field, for example `"by_clerk_id"`. */
  index: Index;
  /** The indexed field that holds the Clerk user id, for example `"clerkId"`. */
  clerkIdField: ClerkIdField;
  /** The `string[]` field that stores granting plan slugs, for example `"planSlugs"`. */
  planSlugsField: PlanSlugsField;
  /** How the index lookup ends. Default `"first"`; `"unique"` throws on duplicate rows. */
  lookup?: "first" | "unique";
  /**
   * Item statuses that grant their plan, for `nextPlanSlugs`,
   * `writeBillingChange` and `parseBillingEvent`. Default
   * `GRANTING_ITEM_STATUSES` (`active`, `past_due`, `canceled`).
   */
  grantingStatuses?: readonly string[];
  /** Event type matching for `parseBillingEvent`. Default `"exact"`. See `ClerkBillingOptions`. */
  eventMatch?: "exact" | "prefix";
  /**
   * Extra fields for the `writeBillingChange` patch of an existing row, for
   * example `{ billingPlansUpdatedAt: Date.now() }`. The slugs field always
   * wins. Not used by `planSlugsPatch` or `createUser`.
   */
  extraPatch?: (planSlugs: string[]) => Partial<ClerkUserInsert<Doc>>;
};

/** `ctx.db` for `writeBillingChange`: one index lookup and a patch. A Convex `MutationCtx` fits. */
export type VProWriterCtx<
  Table extends string,
  Index extends string,
  ClerkIdField extends string,
  Doc extends { _id: string },
  Range,
> = {
  db: ClerkUserDbReader<Table, Index, ClerkIdField, Doc, Range> & {
    patch(id: Doc["_id"], value: Partial<ClerkUserInsert<Doc>>): Promise<void>;
    /** Needed only with `createUser`; a `MutationCtx` has it. */
    insert?(table: Table, value: ClerkUserInsert<Doc>): Promise<Doc["_id"]>;
  };
};

export type UserHasVProOptions = {
  /** The caller's identity, for the session `pla` claim. */
  identity?: unknown;
  /** Clerk user ids that get V Pro without a paid plan. */
  compIds?: readonly string[] | null;
};

/**
 * Build V Pro helpers for one users table. Curried so `DataModel` can be given
 * while the config keys are inferred (and checked against it):
 *
 * ```ts
 * const vPro = createVProModule<DataModel>()({
 *   table: "users",
 *   index: "by_clerk_id",
 *   clerkIdField: "clerkId",
 *   planSlugsField: "planSlugs",
 * });
 * ```
 */
export function createVProModule<DataModel extends ClerkUserDataModelLike>() {
  return function configure<
    const Table extends keyof DataModel & string,
    const Index extends keyof DataModel[Table]["indexes"] & string,
    const ClerkIdField extends DataModel[Table]["indexes"][Index][0],
    const PlanSlugsField extends VProPlanSlugsFieldOf<DataModel[Table]["document"]>,
  >(config: VProModuleConfig<Table, Index, ClerkIdField, PlanSlugsField, DataModel[Table]["document"]>) {
    type Doc = DataModel[Table]["document"];
    const { createUser } = config;
    if (config.onMissingUser === "create" && !createUser) {
      throw new Error('createVProModule: onMissingUser "create" needs a createUser callback');
    }
    const billingOptions: ClerkBillingOptions = {
      grantingStatuses: config.grantingStatuses,
      eventMatch: config.eventMatch,
    };
    const userAuth = createClerkUserAuth<DataModel>()({
      table: config.table,
      index: config.index,
      field: config.clerkIdField,
      lookup: config.lookup,
    });

    /** The stored slugs; `[]` for no user, a missing field or a non-array value. */
    function planSlugsOf(user: Pick<Doc, PlanSlugsField> | null | undefined): string[] {
      const value: unknown = user?.[config.planSlugsField];
      return Array.isArray(value) ? value.filter((slug) => typeof slug === "string") : [];
    }

    /** The slugs to store after `change`. */
    function nextPlanSlugs(
      user: Pick<Doc, PlanSlugsField> | null | undefined,
      change: ClerkBillingChange,
    ): string[] {
      return applyBillingChange(planSlugsOf(user), change, billingOptions);
    }

    /** `parseClerkBillingEvent` with this module's `grantingStatuses` and `eventMatch`. */
    function parseBillingEvent(event: ClerkWebhookEventLike | null | undefined): ClerkBillingChange | null {
      return parseClerkBillingEvent(event, billingOptions);
    }

    /** `{ [planSlugsField]: planSlugs }`, for `ctx.db.patch`. */
    function planSlugsPatch(
      planSlugs: readonly string[],
    ): Record<PlanSlugsField, string[]> & Partial<ClerkUserInsert<Doc>> {
      const patch: Partial<Record<string, string[]>> = { [config.planSlugsField]: [...planSlugs] };
      return patch as Record<PlanSlugsField, string[]> & Partial<ClerkUserInsert<Doc>>;
    }

    /** `hasVPro` over the row's stored slugs and Clerk id, plus the given identity and comp ids. */
    function userHasVPro(
      user: (Pick<Doc, PlanSlugsField> & Partial<Record<ClerkIdField, unknown>>) | null | undefined,
      options: UserHasVProOptions = {},
    ): boolean {
      const clerkId: unknown = user?.[config.clerkIdField];
      return hasVPro({
        identity: options.identity,
        planSlugs: planSlugsOf(user),
        compIds: options.compIds,
        clerkId: typeof clerkId === "string" ? clerkId : undefined,
      });
    }

    /**
     * The webhook writer's body: find the row by `change.clerkId` and patch
     * the new slugs (plus `extraPatch`). With no row: returns `false` with no
     * write (the next event or a backfill fills it in), or, with
     * `createUser`, calls it with the slugs and returns `true`.
     */
    async function writeBillingChange<Range>(
      ctx: VProWriterCtx<Table, Index, ClerkIdField, Doc, Range>,
      change: ClerkBillingChange,
    ): Promise<boolean> {
      const user = await userAuth.getUserByClerkId(ctx, change.clerkId);
      if (!user) {
        if (!createUser) return false;
        const { insert } = ctx.db;
        if (!insert) throw new Error("writeBillingChange: createUser needs ctx.db.insert (a MutationCtx)");
        await createUser({ db: { insert: insert.bind(ctx.db) } }, { clerkId: change.clerkId, planSlugs: nextPlanSlugs(null, change) });
        return true;
      }
      const planSlugs = nextPlanSlugs(user, change);
      const patch = config.extraPatch
        ? { ...config.extraPatch([...planSlugs]), ...planSlugsPatch(planSlugs) }
        : planSlugsPatch(planSlugs);
      await ctx.db.patch(user._id, patch);
      return true;
    }

    return { planSlugsOf, nextPlanSlugs, planSlugsPatch, parseBillingEvent, userHasVPro, writeBillingChange };
  };
}

import { applyBillingChange, type ClerkBillingChange } from "./clerkBilling.js";
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

export type VProModuleConfig<
  Table extends string,
  Index extends string,
  ClerkIdField extends string,
  PlanSlugsField extends string,
> = {
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
  >(config: VProModuleConfig<Table, Index, ClerkIdField, PlanSlugsField>) {
    type Doc = DataModel[Table]["document"];
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
      return applyBillingChange(planSlugsOf(user), change);
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
     * the new slugs. Returns `false` with no write when there is no row (the
     * next event or a backfill fills it in), otherwise `true`.
     */
    async function writeBillingChange<Range>(
      ctx: VProWriterCtx<Table, Index, ClerkIdField, Doc, Range>,
      change: ClerkBillingChange,
    ): Promise<boolean> {
      const user = await userAuth.getUserByClerkId(ctx, change.clerkId);
      if (!user) return false;
      await ctx.db.patch(user._id, planSlugsPatch(nextPlanSlugs(user, change)));
      return true;
    }

    return { planSlugsOf, nextPlanSlugs, planSlugsPatch, userHasVPro, writeBillingChange };
  };
}

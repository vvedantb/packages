/**
 * Authenticated Convex function builders, built on convex-helpers
 * `customFunctions`. Each app wires its own generated `query`/`mutation`/
 * `action` builders and its user-lookup into one place, and gets back
 * `authQuery`/`authMutation`/`authAction` whose handlers receive `ctx.userId`
 * and which reject an unauthenticated caller before the handler runs.
 *
 * convex-helpers is an optional peer: this module imports only its *types*
 * (`import type`, erased at build), and the app passes the runtime functions
 * (`customQuery`, `customMutation`, `customAction`, `customCtx`) in. So, like
 * the rest of this package, importing `@vvedantb/server` never forces a
 * consumer to install convex or convex-helpers.
 *
 * Internal variants: call `createAuthFunctions` a second time with the
 * `internalQuery`/`internalMutation`/`internalAction` builders (and no
 * `beforeEach`), then rename the result:
 *
 * ```ts
 * export const { authQuery, authMutation, authAction } = createAuthFunctions({
 *   customFunctions: { customQuery, customMutation, customAction, customCtx },
 *   query, mutation, action,
 *   resolveUserId: (ctx) => userAuth.requireCurrentUserId(ctx),
 *   resolveActionUserId: (ctx) => resolveActionUserId(ctx),
 *   beforeEach: () => assertNotInMaintenance(), // optional
 * });
 *
 * export const {
 *   authQuery: internalAuthQuery,
 *   authMutation: internalAuthMutation,
 *   authAction: internalAuthAction,
 * } = createAuthFunctions({
 *   customFunctions: { customQuery, customMutation, customAction, customCtx },
 *   query: internalQuery, mutation: internalMutation, action: internalAction,
 *   resolveUserId: (ctx) => userAuth.requireCurrentUserId(ctx),
 *   resolveActionUserId: (ctx) => resolveActionUserId(ctx),
 * });
 * ```
 */
import type {
  ActionBuilder,
  FunctionVisibility,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  MutationBuilder,
  QueryBuilder,
} from "convex/server";
import type {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";

/** The four convex-helpers runtime functions the app injects. */
export type AuthCustomFunctions = {
  customQuery: typeof customQuery;
  customMutation: typeof customMutation;
  customAction: typeof customAction;
  customCtx: typeof customCtx;
};

/** A query or mutation context — either one can resolve the current user. */
export type AuthReadCtx<DataModel extends GenericDataModel> =
  | GenericQueryCtx<DataModel>
  | GenericMutationCtx<DataModel>;

export type CreateAuthFunctionsConfig<
  DataModel extends GenericDataModel,
  UserId,
  Visibility extends FunctionVisibility = "public",
> = {
  /** The convex-helpers builders, imported and passed by the app. */
  customFunctions: AuthCustomFunctions;
  /** The app's generated query builder (public or internal). */
  query: QueryBuilder<DataModel, Visibility>;
  /** The app's generated mutation builder (public or internal). */
  mutation: MutationBuilder<DataModel, Visibility>;
  /** The app's generated action builder (public or internal). */
  action: ActionBuilder<DataModel, Visibility>;
  /**
   * Resolve the current user's id in a query or mutation. Throw to reject an
   * unauthenticated caller (for example `userAuth.requireCurrentUserId`, which
   * throws `"Not authenticated"`).
   */
  resolveUserId: (ctx: AuthReadCtx<DataModel>) => Promise<UserId>;
  /**
   * Resolve the current user's id in an action. An action has no `ctx.auth`
   * database access, so this usually runs a query (`ctx.runQuery(api.auth.me)`)
   * and throws when it returns null.
   */
  resolveActionUserId: (ctx: GenericActionCtx<DataModel>) => Promise<UserId>;
  /**
   * An optional gate that runs before the user is resolved, on every call.
   * Throw to block the call (for example a maintenance-mode check). Omit it for
   * internal builders that should run during maintenance.
   */
  beforeEach?: (ctx: AuthReadCtx<DataModel> | GenericActionCtx<DataModel>) => void | Promise<void>;
};

/**
 * Build `authQuery`, `authMutation` and `authAction` from the app's builders.
 * Each wrapper runs `beforeEach` (if given), resolves the user id, and adds it
 * to the handler's `ctx` as `userId`.
 */
export function createAuthFunctions<
  DataModel extends GenericDataModel,
  UserId,
  Visibility extends FunctionVisibility = "public",
>(config: CreateAuthFunctionsConfig<DataModel, UserId, Visibility>) {
  const { customQuery, customMutation, customAction, customCtx } = config.customFunctions;

  const queryInput = customCtx(async (ctx: GenericQueryCtx<DataModel>) => {
    if (config.beforeEach) await config.beforeEach(ctx);
    return { userId: await config.resolveUserId(ctx) };
  });
  const mutationInput = customCtx(async (ctx: GenericMutationCtx<DataModel>) => {
    if (config.beforeEach) await config.beforeEach(ctx);
    return { userId: await config.resolveUserId(ctx) };
  });
  const actionInput = customCtx(async (ctx: GenericActionCtx<DataModel>) => {
    if (config.beforeEach) await config.beforeEach(ctx);
    return { userId: await config.resolveActionUserId(ctx) };
  });

  return {
    authQuery: customQuery(config.query, queryInput),
    authMutation: customMutation(config.mutation, mutationInput),
    authAction: customAction(config.action, actionInput),
  };
}

export type AuthFunctions<
  DataModel extends GenericDataModel,
  UserId,
  Visibility extends FunctionVisibility = "public",
> = ReturnType<typeof createAuthFunctions<DataModel, UserId, Visibility>>;

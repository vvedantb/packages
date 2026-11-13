import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { describe, expect, it, vi } from "vitest";
import { createAuthFunctions, type AuthCustomFunctions } from "@vvedantb/server";

// The real convex-helpers builders, wired to stub base builders that hand back
// the wrapped definition so a test can run its handler directly. This exercises
// the real wrapping path: customCtx -> customFnBuilder -> our injected ctx.

type Def = { handler: (ctx: unknown, args: unknown) => unknown };
const identityBuilder = ((def: Def) => def) as never;

const customFunctions: AuthCustomFunctions = {
  customQuery,
  customMutation,
  customAction,
  customCtx,
};

function runHandler(def: unknown, ctx: unknown): Promise<unknown> {
  return (def as Def).handler(ctx, {}) as Promise<unknown>;
}

describe("createAuthFunctions", () => {
  it("adds the resolved userId to the query handler ctx", async () => {
    const { authQuery } = createAuthFunctions({
      customFunctions,
      query: identityBuilder,
      mutation: identityBuilder,
      action: identityBuilder,
      resolveUserId: async () => "user_1",
      resolveActionUserId: async () => "user_1",
    });

    const def = authQuery({ handler: async (ctx: { userId: string }) => ctx.userId });
    expect(await runHandler(def, { db: {} })).toBe("user_1");
  });

  it("resolves the user for mutations and actions too", async () => {
    const { authMutation, authAction } = createAuthFunctions({
      customFunctions,
      query: identityBuilder,
      mutation: identityBuilder,
      action: identityBuilder,
      resolveUserId: async () => "reader",
      resolveActionUserId: async () => "actor",
    });

    const mDef = authMutation({ handler: async (ctx: { userId: string }) => ctx.userId });
    const aDef = authAction({ handler: async (ctx: { userId: string }) => ctx.userId });
    expect(await runHandler(mDef, { db: {} })).toBe("reader");
    expect(await runHandler(aDef, { runQuery: async () => null })).toBe("actor");
  });

  it("runs beforeEach before resolving the user, and blocks when it throws", async () => {
    const order: string[] = [];
    const resolveUserId = vi.fn(async () => {
      order.push("resolve");
      return "u";
    });
    const { authQuery } = createAuthFunctions({
      customFunctions,
      query: identityBuilder,
      mutation: identityBuilder,
      action: identityBuilder,
      resolveUserId,
      resolveActionUserId: async () => "u",
      beforeEach: () => {
        order.push("gate");
      },
    });

    const def = authQuery({ handler: async (ctx: { userId: string }) => ctx.userId });
    await runHandler(def, { db: {} });
    expect(order).toEqual(["gate", "resolve"]);

    // A throwing gate blocks the handler and never resolves the user.
    resolveUserId.mockClear();
    const { authQuery: gated } = createAuthFunctions({
      customFunctions,
      query: identityBuilder,
      mutation: identityBuilder,
      action: identityBuilder,
      resolveUserId,
      resolveActionUserId: async () => "u",
      beforeEach: () => {
        throw new Error("Service is in maintenance");
      },
    });
    const gatedDef = gated({ handler: async () => "ran" });
    await expect(runHandler(gatedDef, { db: {} })).rejects.toThrow("Service is in maintenance");
    expect(resolveUserId).not.toHaveBeenCalled();
  });

  it("propagates an authentication rejection from resolveUserId", async () => {
    const { authQuery } = createAuthFunctions({
      customFunctions,
      query: identityBuilder,
      mutation: identityBuilder,
      action: identityBuilder,
      resolveUserId: async () => {
        throw new Error("Not authenticated");
      },
      resolveActionUserId: async () => "u",
    });

    const def = authQuery({ handler: async () => "ran" });
    await expect(runHandler(def, { db: {} })).rejects.toThrow("Not authenticated");
  });

  it("supports internal builders through a second call (no gate)", async () => {
    const {
      authQuery: internalAuthQuery,
    } = createAuthFunctions({
      customFunctions,
      query: identityBuilder,
      mutation: identityBuilder,
      action: identityBuilder,
      resolveUserId: async () => "internal_user",
      resolveActionUserId: async () => "internal_user",
    });

    const def = internalAuthQuery({ handler: async (ctx: { userId: string }) => ctx.userId });
    expect(await runHandler(def, { db: {} })).toBe("internal_user");
  });
});

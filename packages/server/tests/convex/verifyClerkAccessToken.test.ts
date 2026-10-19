// Differential tests: each app's verifyAccessToken core, ported under a
// neutral name, against the same logic rebuilt on verifyClerkAccessToken.
// Same fake Clerk client, same token: return value and every console.error
// call must match.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consoleClerkVerifyLogger,
  verifyClerkAccessToken,
  type ClerkAuthLike,
  type ClerkLike,
  type ClerkRequestStateLike,
  type ClerkTokenType,
  type ClerkVerifyRejection,
} from "@vvedantb/server";

type Scenario =
  | { kind: "state"; state: ClerkRequestStateLike<ClerkAuthLike> }
  | { kind: "throw"; error: Error | string }
  | { kind: "client-throws" };

type Calls = { acceptsToken: ClerkTokenType[]; authorization: string | null; url: string }[];

function fakeClerk(scenario: Scenario, calls: Calls = []): ClerkLike<ClerkAuthLike> {
  if (scenario.kind === "client-throws") {
    // Stands in for getClerkClient throwing on missing env.
    throw new Error("CLERK_SECRET_KEY is not set in Convex env");
  }
  return {
    authenticateRequest: async (request, options) => {
      calls.push({
        acceptsToken: options.acceptsToken,
        authorization: request.headers.get("Authorization"),
        url: request.url,
      });
      if (scenario.kind === "throw") throw scenario.error;
      return scenario.state;
    },
  };
}

function signedIn(auth: ClerkAuthLike): Scenario {
  return { kind: "state", state: { isAuthenticated: true, toAuth: () => auth } };
}

const SCENARIOS: Record<string, { scenario: Scenario; token?: string }> = {
  "oauth token": { scenario: signedIn({ isAuthenticated: true, tokenType: "oauth_token", userId: "user_1" }) },
  "session token": { scenario: signedIn({ isAuthenticated: true, tokenType: "session_token", userId: "user_2" }) },
  unauthenticated: {
    scenario: {
      kind: "state",
      state: { isAuthenticated: false, reason: "token-invalid", message: "Invalid JWT form." },
    },
  },
  "toAuth not authenticated": {
    scenario: signedIn({ isAuthenticated: false, tokenType: "oauth_token", userId: "user_1" }),
  },
  "api key token type": { scenario: signedIn({ isAuthenticated: true, tokenType: "api_key", userId: "user_1" }) },
  "null token type": { scenario: signedIn({ isAuthenticated: true, tokenType: null, userId: "user_1" }) },
  "null user": { scenario: signedIn({ isAuthenticated: true, tokenType: "oauth_token", userId: null }) },
  "empty user": { scenario: signedIn({ isAuthenticated: true, tokenType: "session_token", userId: "" }) },
  "Clerk throws an Error": { scenario: { kind: "throw", error: new Error("network down") } },
  "Clerk throws a string": { scenario: { kind: "throw", error: "boom" } },
  "client factory throws": { scenario: { kind: "client-throws" } },
  "token not a valid header": {
    scenario: signedIn({ isAuthenticated: true, tokenType: "oauth_token", userId: "user_1" }),
    token: "bad\ntoken",
  },
};

type Verify = (getClerk: () => ClerkLike<ClerkAuthLike>, token: string) => Promise<{ clerkUserId: string } | null>;

// --- References: each app's code today, with getClerkClient injected. ---

// app-a and app-c (identical apart from the token-type helper app-a calls).
const refLogging: Verify = async (getClerk, token) => {
  try {
    const clerk = getClerk();
    const request = new Request("https://mcp.local/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const state = await clerk.authenticateRequest(request, {
      acceptsToken: ["oauth_token", "session_token"],
    });
    if (!state.isAuthenticated) {
      console.error("[MCP][verifyAccessToken] authenticateRequest failed:", state.reason, state.message);
      return null;
    }
    const auth = state.toAuth();
    if (!auth.isAuthenticated || (auth.tokenType !== "oauth_token" && auth.tokenType !== "session_token")) {
      return null;
    }
    if (typeof auth.userId !== "string" || auth.userId.length === 0) {
      return null;
    }
    return { clerkUserId: auth.userId };
  } catch (err) {
    console.error("[MCP][verifyAccessToken] threw:", err instanceof Error ? err.message : err);
    return null;
  }
};

// app-b: no log for an unauthenticated state (its Pro claim is derived from the raw token, outside this core).
const refQuiet: Verify = async (getClerk, token) => {
  try {
    const clerk = getClerk();
    const request = new Request("https://mcp.local/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const state = await clerk.authenticateRequest(request, {
      acceptsToken: ["oauth_token", "session_token"],
    });
    if (!state.isAuthenticated) {
      return null;
    }
    const auth = state.toAuth();
    if (!auth.isAuthenticated || (auth.tokenType !== "oauth_token" && auth.tokenType !== "session_token")) {
      return null;
    }
    if (typeof auth.userId !== "string" || auth.userId.length === 0) {
      return null;
    }
    return { clerkUserId: auth.userId };
  } catch (err) {
    console.error("[MCP][verifyAccessToken] threw:", err instanceof Error ? err.message : err);
    return null;
  }
};

// app-d: the Clerk path is a helper without its own try; the caller's try logs throws.
// (The legacy-JWT branch and the user upsert after it are app code and stay.)
async function refSplitInner(getClerk: () => ClerkLike<ClerkAuthLike>, token: string): Promise<string | null> {
  const clerk = getClerk();
  const request = new Request("https://mcp.local/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const state = await clerk.authenticateRequest(request, {
    acceptsToken: ["oauth_token", "session_token"],
  });
  if (!state.isAuthenticated) {
    console.error("[MCP][verifyAccessToken] authenticateRequest failed:", state.reason, state.message);
    return null;
  }
  const auth = state.toAuth();
  if (!auth.isAuthenticated || (auth.tokenType !== "oauth_token" && auth.tokenType !== "session_token")) {
    return null;
  }
  if (typeof auth.userId !== "string" || auth.userId.length === 0) {
    return null;
  }
  return auth.userId;
}
const refSplit: Verify = async (getClerk, token) => {
  try {
    const clerkUserId = await refSplitInner(getClerk, token);
    if (!clerkUserId) return null;
    return { clerkUserId };
  } catch (err) {
    console.error("[MCP][verifyAccessToken] threw:", err instanceof Error ? err.message : err);
    return null;
  }
};

// app-e: tries each Clerk instance in turn; silent; any failure moves on.
function refMulti(getClerks: (() => ClerkLike<ClerkAuthLike>)[]) {
  return async (token: string): Promise<{ clerkUserId: string } | null> => {
    for (const getClerk of getClerks) {
      try {
        const clerk = getClerk();
        const request = new Request("https://mcp.local/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const state = await clerk.authenticateRequest(request, {
          acceptsToken: ["oauth_token", "session_token"],
        });
        if (!state.isAuthenticated) continue;
        const auth = state.toAuth();
        if (!auth.isAuthenticated) continue;
        if (auth.tokenType !== "oauth_token" && auth.tokenType !== "session_token") {
          continue;
        }
        if (typeof auth.userId !== "string" || auth.userId.length === 0) {
          continue;
        }
        return { clerkUserId: auth.userId };
      } catch {
        // try the next Clerk app
      }
    }
    return null;
  };
}

// --- The same, on the kit. ---

const kitLogging: Verify = async (getClerk, token) => {
  const verified = await verifyClerkAccessToken(getClerk, token, consoleClerkVerifyLogger);
  return verified ? { clerkUserId: verified.userId } : null;
};

const kitQuiet: Verify = async (getClerk, token) => {
  const verified = await verifyClerkAccessToken(getClerk, token, {
    onError: consoleClerkVerifyLogger.onError,
  });
  return verified ? { clerkUserId: verified.userId } : null;
};

const kitSplit: Verify = async (getClerk, token) => {
  try {
    const verified = await verifyClerkAccessToken(getClerk, token, consoleClerkVerifyLogger);
    const clerkUserId = verified?.userId;
    if (!clerkUserId) return null;
    return { clerkUserId };
  } catch (err) {
    console.error("[MCP][verifyAccessToken] threw:", err instanceof Error ? err.message : err);
    return null;
  }
};

function kitMulti(getClerks: (() => ClerkLike<ClerkAuthLike>)[]) {
  return async (token: string): Promise<{ clerkUserId: string } | null> => {
    for (const getClerk of getClerks) {
      const verified = await verifyClerkAccessToken(getClerk, token);
      if (verified) return { clerkUserId: verified.userId };
    }
    return null;
  };
}

const errorSpy = vi.spyOn(console, "error");
beforeEach(() => {
  errorSpy.mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockReset();
});

async function capture(run: () => Promise<{ clerkUserId: string } | null>) {
  errorSpy.mockClear();
  const result = await run();
  return { result, logs: errorSpy.mock.calls.map((args) => [...args]) };
}

describe.each([
  { app: "app-a", ref: refLogging, kit: kitLogging },
  { app: "app-b", ref: refQuiet, kit: kitQuiet },
  { app: "app-c", ref: refLogging, kit: kitLogging },
  { app: "app-d", ref: refSplit, kit: kitSplit },
])("$app parity", ({ ref, kit }) => {
  it.each(Object.entries(SCENARIOS))("%s", async (_name, { scenario, token = "tok" }) => {
    const getClerk = () => fakeClerk(scenario);
    const expected = await capture(() => ref(getClerk, token));
    const actual = await capture(() => kit(getClerk, token));
    expect(actual).toEqual(expected);
  });
});

describe("app-e parity (two Clerk instances, silent)", () => {
  const entries = Object.entries(SCENARIOS);
  for (const [firstName, first] of entries) {
    for (const [secondName, second] of entries) {
      it(`${firstName} then ${secondName}`, async () => {
        const getClerks = [() => fakeClerk(first.scenario), () => fakeClerk(second.scenario)];
        const expected = await capture(() => refMulti(getClerks)("tok"));
        const actual = await capture(() => kitMulti(getClerks)("tok"));
        expect(actual).toEqual(expected);
        expect(actual.logs).toEqual([]);
      });
    }
  }
});

describe("verifyClerkAccessToken", () => {
  it("sends the token on a synthetic request and returns userId, tokenType and auth", async () => {
    const calls: Calls = [];
    const auth = { isAuthenticated: true, tokenType: "oauth_token", userId: "user_1", extra: "claim" };
    const clerk = fakeClerk(signedIn(auth), calls);
    expect(await verifyClerkAccessToken(clerk, "abc")).toEqual({
      userId: "user_1",
      tokenType: "oauth_token",
      auth,
    });
    expect(calls).toEqual([
      { acceptsToken: ["oauth_token", "session_token"], authorization: "Bearer abc", url: "https://mcp.local/" },
    ]);
  });

  it("accepts a client or a factory", async () => {
    const scenario = signedIn({ isAuthenticated: true, tokenType: "session_token", userId: "u" });
    expect(await verifyClerkAccessToken(fakeClerk(scenario), "t")).not.toBeNull();
    expect(await verifyClerkAccessToken(() => fakeClerk(scenario), "t")).not.toBeNull();
  });

  it("uses acceptsToken for the request and for the token-type check", async () => {
    const calls: Calls = [];
    const apiKey = fakeClerk(signedIn({ isAuthenticated: true, tokenType: "api_key", userId: "u" }), calls);
    expect(await verifyClerkAccessToken(apiKey, "t", { acceptsToken: ["api_key"] })).toMatchObject({
      tokenType: "api_key",
    });
    expect(calls[0]?.acceptsToken).toEqual(["api_key"]);
    const oauth = fakeClerk(signedIn({ isAuthenticated: true, tokenType: "oauth_token", userId: "u" }));
    expect(await verifyClerkAccessToken(oauth, "t", { acceptsToken: ["session_token"] })).toBeNull();
  });

  it("reports each rejection once and is silent by default", async () => {
    const cases: [Scenario, ClerkVerifyRejection][] = [
      [
        { kind: "state", state: { isAuthenticated: false, reason: "r", message: "m" } },
        { kind: "unauthenticated", reason: "r", message: "m" },
      ],
      [signedIn({ isAuthenticated: true, tokenType: "m2m_token", userId: "u" }), { kind: "wrong-token", tokenType: "m2m_token" }],
      [signedIn({ isAuthenticated: false, tokenType: "oauth_token" }), { kind: "wrong-token", tokenType: "oauth_token" }],
      [signedIn({ isAuthenticated: true, tokenType: "oauth_token" }), { kind: "no-user" }],
    ];
    for (const [scenario, rejection] of cases) {
      const onReject = vi.fn();
      const onError = vi.fn();
      expect(await verifyClerkAccessToken(fakeClerk(scenario), "t", { onReject, onError })).toBeNull();
      expect(onReject.mock.calls).toEqual([[rejection]]);
      expect(onError).not.toHaveBeenCalled();
      errorSpy.mockClear();
      expect(await verifyClerkAccessToken(fakeClerk(scenario), "t")).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
    }
  });

  it("passes anything thrown to onError and returns null", async () => {
    const error = new Error("down");
    const onError = vi.fn();
    expect(await verifyClerkAccessToken(fakeClerk({ kind: "throw", error }), "t", { onError })).toBeNull();
    expect(onError.mock.calls).toEqual([[error]]);
  });
});

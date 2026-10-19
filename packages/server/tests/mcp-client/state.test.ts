import { describe, expect, it } from "vitest";
import { z } from "zod";
import { z as z3 } from "zod3";
import { createMcpOAuthStateSchema, type McpOAuthState } from "@vvedantb/server";

const stored = {
  tokens: { access_token: "a", token_type: "Bearer", refresh_token: "r", expires_in: 60, obtained_at: 5, issuer: "https://as.test", extra: 1 },
  clientInformation: { client_id: "c", redirect_uris: ["http://127.0.0.1:1/callback"], issuer: "https://as.test", client_id_issued_at: 9 },
  identity: { email: "a@example.test", name: "A", picture: "x" },
  unknown: true,
};

const expected: McpOAuthState = {
  tokens: stored.tokens,
  clientInformation: stored.clientInformation,
  identity: { email: "a@example.test", name: "A" },
};

const malformed = [
  { tokens: { access_token: "a" } },
  { tokens: { access_token: "a", token_type: "Bearer", obtained_at: "now" } },
  { clientInformation: { redirect_uris: [] } },
];

describe("createMcpOAuthStateSchema (zod 4)", () => {
  const schema = createMcpOAuthStateSchema(z);

  it("keeps unknown token and client keys and strips the rest", () => {
    const parsed: McpOAuthState = schema.parse(stored);
    expect(parsed).toEqual(expected);
  });

  it("accepts an empty state and rejects malformed parts", () => {
    expect(schema.parse({})).toEqual({});
    for (const bad of malformed) expect(schema.safeParse(bad).success).toBe(false);
  });

  it("composes with the app's own schemas", () => {
    const settings = z.object({ auth: z.string().optional(), oauth: schema.optional() });
    expect(settings.parse({ oauth: { tokens: { access_token: "a", token_type: "Bearer" } } }).oauth?.tokens?.access_token).toBe("a");
    expect(settings.parse({}).oauth).toBeUndefined();
  });
});

// This file compiles against zod 4 types; a zod 3.25 app's own types are checked in tests-node/esm-exports.mjs.
describe("createMcpOAuthStateSchema (zod 3.25)", () => {
  // @ts-expect-error zod 3's namespace type differs from the zod 4 types this test file compiles against
  const schema = createMcpOAuthStateSchema(z3);

  it("keeps unknown token and client keys and strips the rest", () => {
    expect(schema.parse(stored)).toEqual(expected);
  });

  it("accepts an empty state and rejects malformed parts", () => {
    expect(schema.parse({})).toEqual({});
    for (const bad of malformed) expect(schema.safeParse(bad).success).toBe(false);
  });

  it("composes with the app's own schemas", () => {
    // @ts-expect-error the schema is typed with zod 4 in this file
    const settings = z3.object({ auth: z3.string().optional(), oauth: schema.optional() });
    expect(settings.parse({ oauth: { tokens: { access_token: "a", token_type: "Bearer" } } })).toEqual({
      oauth: { tokens: { access_token: "a", token_type: "Bearer" } },
    });
    expect(settings.parse({})).toEqual({});
  });
});

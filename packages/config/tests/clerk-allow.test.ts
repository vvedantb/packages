import { describe, expect, it } from "vitest";
import { CLERK_INSTANCE_URL, runClerkAllow, type ClerkAllowFetch } from "../src/clerk-allow.js";

const ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${ID}`;
const SECRET = "sk_test_DoNotPrintThis0123456789";

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };
type Reply = { status: number; body?: unknown } | Error;

/** A fetch stand-in that answers with `replies` in order and records each call. */
function fakeFetch(replies: Reply[]) {
  const calls: Call[] = [];
  const fetch: ClerkAllowFetch = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, ...(init.body === undefined ? {} : { body: JSON.parse(init.body) }) });
    const reply = replies.shift();
    if (!reply) throw new Error("unexpected request");
    if (reply instanceof Error) throw reply;
    const text = reply.body === undefined ? "" : typeof reply.body === "string" ? reply.body : JSON.stringify(reply.body);
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, text: async () => text };
  };
  return { fetch, calls };
}

async function run(argv: string[], replies: Reply[] = [], env: Record<string, string | undefined> = { CLERK_SECRET_KEY: SECRET }) {
  const out: string[] = [];
  const err: string[] = [];
  const { fetch, calls } = fakeFetch(replies);
  const code = await runClerkAllow(argv, { log: (m) => out.push(m), error: (m) => err.push(m), env, fetch });
  // No path may print the secret.
  for (const line of [...out, ...err]) expect(line).not.toContain(SECRET);
  return { code, out, err, calls };
}

describe("arguments and environment", () => {
  it("prints usage for --help", async () => {
    const result = await run(["--help"]);
    expect(result.code).toBe(0);
    expect(result.out[0]).toMatch(/^Usage: vvedantb-clerk-allow <extension-id>/);
    expect(result.calls).toEqual([]);
  });

  it("exits 2 without an ID, with two IDs or with an option", async () => {
    for (const [argv, message] of [
      [[], /^Missing the extension ID\.\nUsage:/],
      [[ID, ID], /^Pass one extension ID\.\nUsage:/],
      [["--yes", ID], /^Unknown option: --yes\nUsage:/],
    ] as const) {
      const result = await run([...argv]);
      expect(result.code).toBe(2);
      expect(result.err[0]).toMatch(message);
      expect(result.calls).toEqual([]);
    }
  });

  it("exits 2 on an ID that is not 32 letters a-p, without echoing it", async () => {
    for (const bad of ["abc", `${ID}a`, ID.toUpperCase(), ID.replace("a", "z"), `chrome-extension://${ID}`, SECRET]) {
      const result = await run([bad]);
      expect(result.code).toBe(2);
      expect(result.err).toEqual(["The extension ID must be 32 letters from a to p, as shown in chrome://extensions."]);
      expect(result.calls).toEqual([]);
    }
  });

  it("exits 2 when CLERK_SECRET_KEY is missing, empty or not a secret key", async () => {
    expect(await run([ID], [], {})).toMatchObject({ code: 2, err: ["CLERK_SECRET_KEY is not set."], calls: [] });
    expect(await run([ID], [], { CLERK_SECRET_KEY: "" })).toMatchObject({ code: 2, err: ["CLERK_SECRET_KEY is not set."], calls: [] });
    const publishable = await run([ID], [], { CLERK_SECRET_KEY: "pk_test_publishable" });
    expect(publishable).toMatchObject({ code: 2, err: ["CLERK_SECRET_KEY does not hold a Clerk secret key (sk_...)."], calls: [] });
    expect(publishable.err[0]).not.toContain("pk_test_publishable");
  });
});

describe("Clerk Backend API", () => {
  it("reads the instance, adds the origin to the list and PATCHes the whole list", async () => {
    const result = await run([ID], [
      { status: 200, body: { object: "instance", environment_type: "production", allowed_origins: ["https://app.example.com"] } },
      { status: 204 },
    ]);
    expect(result.code).toBe(0);
    expect(result.err).toEqual([]);
    expect(result.out).toEqual([`Added ${ORIGIN} to the allowed origins of the production instance (2 in total).`]);
    const headers = { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };
    expect(result.calls).toEqual([
      { url: CLERK_INSTANCE_URL, method: "GET", headers },
      { url: CLERK_INSTANCE_URL, method: "PATCH", headers, body: { allowed_origins: ["https://app.example.com", ORIGIN] } },
    ]);
    expect(CLERK_INSTANCE_URL).toBe("https://api.clerk.com/v1/instance");
  });

  it("treats null allowed_origins as an empty list", async () => {
    const result = await run([ID], [{ status: 200, body: { allowed_origins: null } }, { status: 200, body: {} }]);
    expect(result.code).toBe(0);
    expect(result.out).toEqual([`Added ${ORIGIN} to the allowed origins of the instance (1 in total).`]);
    expect(result.calls[1]?.body).toEqual({ allowed_origins: [ORIGIN] });
  });

  it("does not PATCH when the origin is already allowed", async () => {
    const result = await run([ID], [{ status: 200, body: { environment_type: "development", allowed_origins: [ORIGIN] } }]);
    expect(result).toMatchObject({ code: 0, out: [`${ORIGIN} is already allowed on the development instance.`], err: [] });
    expect(result.calls.map((c) => c.method)).toEqual(["GET"]);
  });

  it("changes nothing when the instance has no allowed_origins list", async () => {
    for (const body of [{ object: "instance" }, { allowed_origins: "https://app.example.com" }, { allowed_origins: [1] }, "<html>"]) {
      const result = await run([ID], [{ status: 200, body }]);
      expect(result.code).toBe(1);
      expect(result.err[0]).toMatch(/^Clerk API: GET \/v1\/instance (returned no allowed_origins list|did not return JSON)\. Nothing was changed\.$/);
      expect(result.calls.map((c) => c.method)).toEqual(["GET"]);
    }
  });

  it("exits 1 with the status and Clerk's message when GET fails", async () => {
    const result = await run([ID], [
      { status: 401, body: { errors: [{ message: "Unauthorized", long_message: "The secret key is invalid.", code: "authentication_invalid" }] } },
    ]);
    expect(result).toMatchObject({ code: 1, out: [], err: ["Clerk API: GET /v1/instance failed with HTTP 401: The secret key is invalid."] });
    expect(result.calls.map((c) => c.method)).toEqual(["GET"]);
  });

  it("exits 1 when PATCH fails, without a body when it is not Clerk's JSON", async () => {
    const result = await run([ID], [{ status: 200, body: { allowed_origins: [] } }, { status: 500, body: "<html>oops</html>" }]);
    expect(result).toMatchObject({ code: 1, out: [], err: ["Clerk API: PATCH /v1/instance failed with HTTP 500"] });
  });

  it("redacts the secret from a network error", async () => {
    const result = await run([ID], [new Error(`connect ECONNREFUSED (Authorization: Bearer ${SECRET})`)]);
    expect(result).toMatchObject({ code: 1, err: ["Clerk API: connect ECONNREFUSED (Authorization: Bearer [redacted])"] });
  });

  it("redacts the secret if Clerk's error message echoes it", async () => {
    const result = await run([ID], [{ status: 400, body: { errors: [{ message: `bad key ${SECRET}` }] } }]);
    expect(result.err).toEqual(["Clerk API: GET /v1/instance failed with HTTP 400: bad key [redacted]"]);
  });
});

// HMAC-SHA256 and the GitHub-style `sha256=<hex>` signature. Three checks:
//   1. A published vector (RFC 4231) and a cross-check against Node's crypto,
//      an independent implementation, for string and byte messages and UTF-8.
//   2. The `sha256=` signer and verifier: prefix, trim, null, wrong signature,
//      and that a string message equals the same bytes.
//   3. Each app's wrapper, ported under a neutral name with its own hex encoder
//      (Node Buffer, not the kit), must produce byte-identical output.
import { Buffer } from "node:buffer";
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  githubStyleSignature,
  hmacSha256,
  hmacSha256Hex,
  verifyGithubStyleSignature,
} from "@vvedantb/server";

const text = (value: string) => new TextEncoder().encode(value);

function nodeHmacHex(secret: string, message: string | Uint8Array): string {
  const data = typeof message === "string" ? Buffer.from(message, "utf8") : Buffer.from(message);
  return createHmac("sha256", Buffer.from(secret, "utf8")).update(data).digest("hex");
}

describe("hmacSha256Hex (RFC 4231 test case 2)", () => {
  // The only RFC 4231 case with an ASCII (string) key, so it fits the string
  // key API directly. The binary-key cases are covered by the Node cross-check.
  it("key 'Jefe'", async () => {
    expect(await hmacSha256Hex("Jefe", "what do ya want for nothing?")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });
});

describe("hmacSha256Hex matches Node crypto", () => {
  // The secret is always non-empty: WebCrypto rejects a zero-length HMAC key,
  // and a real webhook secret is never empty, so there is nothing to test there.
  const cases: [string, string | Uint8Array][] = [
    ["secret", ""],
    ["secret", "hello world"],
    ["🔑", "héllo wörld 🔐"],
    ["key", text("raw bytes as a message")],
    ["key", Uint8Array.from([0, 1, 2, 250, 255])],
    ["x".repeat(100), "y".repeat(1000)],
  ];
  it.each(cases)("secret %j", async (secret, message) => {
    expect(await hmacSha256Hex(secret, message)).toBe(nodeHmacHex(secret, message));
  });

  it("hmacSha256 returns the raw bytes of the hex", async () => {
    const bytes = await hmacSha256("secret", "message");
    expect(bytes).toHaveLength(32);
    expect(Buffer.from(bytes).toString("hex")).toBe(await hmacSha256Hex("secret", "message"));
  });

  it("takes a string as its UTF-8 bytes", async () => {
    expect(await hmacSha256Hex("k", "é")).toBe(await hmacSha256Hex("k", text("é")));
  });
});

describe("githubStyleSignature", () => {
  it("prefixes sha256= to the hex", async () => {
    const hex = await hmacSha256Hex("secret", "payload");
    expect(await githubStyleSignature("secret", "payload")).toBe(`sha256=${hex}`);
  });

  it("signs a string and the same bytes identically", async () => {
    expect(await githubStyleSignature("s", "payload")).toBe(await githubStyleSignature("s", text("payload")));
  });
});

describe("verifyGithubStyleSignature", () => {
  it("accepts a correct signature", async () => {
    const sig = await githubStyleSignature("secret", "payload");
    expect(await verifyGithubStyleSignature("secret", "payload", sig)).toBe(true);
  });

  it("rejects a null header, a wrong secret and a tampered signature", async () => {
    const sig = await githubStyleSignature("secret", "payload");
    expect(await verifyGithubStyleSignature("secret", "payload", null)).toBe(false);
    expect(await verifyGithubStyleSignature("wrong", "payload", sig)).toBe(false);
    expect(await verifyGithubStyleSignature("secret", "tampered", sig)).toBe(false);
    expect(await verifyGithubStyleSignature("secret", "payload", `${sig}00`)).toBe(false);
  });

  it("trims surrounding whitespace on the header", async () => {
    const sig = await githubStyleSignature("secret", "payload");
    expect(await verifyGithubStyleSignature("secret", "payload", `  ${sig}\n`)).toBe(true);
  });

  it("verifies a byte-message signature", async () => {
    const body = Uint8Array.from([1, 2, 3, 4, 5]);
    const sig = await githubStyleSignature("secret", body);
    expect(await verifyGithubStyleSignature("secret", body, sig)).toBe(true);
  });
});

// --- App wrapper equivalence -------------------------------------------------
// The signer/verifier each app ships today, ported under a neutral name with a
// Node Buffer hex encoder (not the kit's bytesToHex), so the reference shares no
// code with the code under test. Output must be byte-identical.

// app-b (triggerEvents): signs raw request bytes, GitHub `sha256=` format, trims the header.
async function refGithubSignature(secret: string, body: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new Uint8Array(body));
  return `sha256=${Buffer.from(new Uint8Array(signature)).toString("hex")}`;
}
async function refVerifyGithubSignature(secret: string, body: Uint8Array, header: string | null): Promise<boolean> {
  if (header === null) return false;
  return (await refGithubSignature(secret, body)) === header.trim();
}

// app-c/app-e webhook: signs the body string, compares `sha256=<hmac hex>`.
async function refHmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Buffer.from(new Uint8Array(sig)).toString("hex");
}

describe("matches the app wrappers byte for byte", () => {
  const secret = "webhook-secret";
  const bodies = ["", '{"action":"opened"}', "héllo 🔐", "x".repeat(2000)];

  it.each(bodies)("app-b githubSignature on %j", async (body) => {
    const bytes = text(body);
    expect(await githubStyleSignature(secret, bytes)).toBe(await refGithubSignature(secret, bytes));
    const header = await refGithubSignature(secret, bytes);
    expect(await verifyGithubStyleSignature(secret, bytes, header)).toBe(true);
    expect(await refVerifyGithubSignature(secret, bytes, header)).toBe(true);
  });

  it.each(bodies)("app-c/app-e hmacSha256Hex and webhook verify on %j", async (body) => {
    expect(await hmacSha256Hex(secret, body)).toBe(await refHmacSha256Hex(secret, body));
    // The webhook verifier compares `sha256=<hex>` to the header; the kit's
    // githubStyleSignature produces exactly that string.
    const header = `sha256=${await refHmacSha256Hex(secret, body)}`;
    expect(await githubStyleSignature(secret, body)).toBe(header);
    expect(await verifyGithubStyleSignature(secret, body, header)).toBe(true);
  });
});

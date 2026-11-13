import { bytesToHex } from "./encoding.js";
import { timingSafeEqual } from "./timingSafeEqual.js";

/** The message to sign: a string (taken as UTF-8) or raw bytes. */
export type HmacMessage = string | Uint8Array;

function messageBytes(message: HmacMessage): Uint8Array<ArrayBuffer> {
  return typeof message === "string" ? new TextEncoder().encode(message) : new Uint8Array(message);
}

/**
 * HMAC-SHA256 of `message` under `secret`, as raw bytes. `secret` is taken as
 * UTF-8; `message` is a string (UTF-8) or bytes. The key is imported on each
 * call. Runs in the Convex default runtime (WebCrypto, no `node:crypto`).
 */
export async function hmacSha256(secret: string, message: HmacMessage): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, messageBytes(message));
  return new Uint8Array(signature);
}

/** HMAC-SHA256 of `message` under `secret`, as lowercase hex. */
export async function hmacSha256Hex(secret: string, message: HmacMessage): Promise<string> {
  return bytesToHex(await hmacSha256(secret, message));
}

/**
 * A GitHub-style `sha256=<hex>` signature of `message` under `secret`. This is
 * the `X-Hub-Signature-256` format GitHub webhooks send, and the shape Clerk,
 * Svix and others compare against.
 */
export async function githubStyleSignature(secret: string, message: HmacMessage): Promise<string> {
  return `sha256=${await hmacSha256Hex(secret, message)}`;
}

/**
 * Verify a `sha256=<hex>` signature header against `message`, in constant time.
 * Returns `false` for a `null` header (so a missing header is a plain reject).
 * The header is trimmed before the compare, so trailing whitespace does not
 * fail an otherwise valid signature.
 */
export async function verifyGithubStyleSignature(
  secret: string,
  message: HmacMessage,
  signature: string | null,
): Promise<boolean> {
  if (signature === null) return false;
  const computed = await githubStyleSignature(secret, message);
  return timingSafeEqual(computed, signature.trim());
}

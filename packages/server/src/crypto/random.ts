import { bytesToBase64, bytesToBase64Url, bytesToHex } from "./encoding.js";

/** `n` bytes from `crypto.getRandomValues` (which throws above 65536). */
export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** `"base64url"` is unpadded. */
export type RandomTokenEncoding = "hex" | "base64" | "base64url";

/** `bytes` random bytes as text: 24 hex gives 48 chars, 32 base64url gives 43. */
export function randomToken(bytes: number, encoding: RandomTokenEncoding): string {
  const raw = randomBytes(bytes);
  switch (encoding) {
    case "hex":
      return bytesToHex(raw);
    case "base64":
      return bytesToBase64(raw);
    case "base64url":
      return bytesToBase64Url(raw);
  }
}

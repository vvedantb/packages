import { bytesToHex } from "./encoding.js";

/** SHA-256 of the UTF-8 bytes of `value`, as lowercase hex. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

// Byte <-> text encodings on `btoa`/`atob`, which the Convex default runtime
// and Node 20+ both have. Output matches `Buffer` and `@scure/base` byte for byte.

export type Base64DecodeOptions = {
  /**
   * Only accept canonical padded RFC 4648 text: the exact string
   * `bytesToBase64` would produce (no whitespace, padding required, zero pad
   * bits), like `@scure/base`'s `base64.decode`. Throws `Error("Invalid base64")`
   * otherwise. Default `false`: `atob`'s forgiving decode (whitespace ignored,
   * padding optional, `DOMException` on bad characters).
   */
  strict?: boolean;
};

export type Base64UrlEncodeOptions = {
  /** Keep `=` padding, like `@scure/base`'s `base64url`. Default `false` (RFC 7515, `Buffer`'s `"base64url"`). */
  padding?: boolean;
};

function binaryToBytes(binary: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Standard padded base64. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Standard base64 to bytes. See `Base64DecodeOptions.strict`. */
export function base64ToBytes(
  value: string,
  options: Base64DecodeOptions = {},
): Uint8Array<ArrayBuffer> {
  if (!options.strict) return binaryToBytes(atob(value));
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = binaryToBytes(atob(value));
  } catch {
    throw new Error("Invalid base64");
  }
  // Canonical iff it round-trips: rejects whitespace, missing padding and stray pad bits.
  if (bytesToBase64(bytes) !== value) throw new Error("Invalid base64");
  return bytes;
}

/** URL-safe base64 (`-`, `_`), unpadded unless `padding: true`. */
export function bytesToBase64Url(
  bytes: Uint8Array,
  options: Base64UrlEncodeOptions = {},
): string {
  const url = bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_");
  return options.padding ? url : url.replace(/=+$/, "");
}

/**
 * URL-safe base64 to bytes. Padding is optional and the standard alphabet
 * (`+`, `/`) is also accepted, like `Buffer.from(value, "base64url")`.
 * Invalid text throws `atob`'s `DOMException`.
 */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  return binaryToBytes(atob(value.replace(/-/g, "+").replace(/_/g, "/")));
}

/** Lowercase hex, two characters per byte. */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Hex (either case, even length) to bytes. Throws `Error("Invalid hex")` otherwise. */
export function hexToBytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[0-9a-fA-F]{2})*$/.test(value)) throw new Error("Invalid hex");
  return Uint8Array.from(value.match(/../g) ?? [], (pair) => parseInt(pair, 16));
}

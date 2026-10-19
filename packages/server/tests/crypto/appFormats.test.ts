// Each app's storage wrapper, ported under a neutral name with its random IV
// replaced by a parameter, against the same wrapper rebuilt on the kit
// primitives. Same key, IV and plaintext: the stored strings must be equal,
// and each side must decrypt the other's output.
//
// The references use their own encoders (the btoa loops the apps have, and
// Buffer where an app uses @scure/base), so they do not share code with the kit.
import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  base64ToBytes,
  base64UrlToBytes,
  bytesToBase64,
  bytesToBase64Url,
  bytesToHex,
  hexToBytes,
  sha256Hex,
  timingSafeEqual,
} from "@vvedantb/server";

const IV_A = Uint8Array.from({ length: 12 }, (_, i) => i + 1);
const IV_B = Uint8Array.from({ length: 12 }, (_, i) => 200 - i);
const KEY_32 = Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + 3) % 256);
const KEY_32_B64 = Buffer.from(KEY_32).toString("base64");
const PLAINTEXTS = ["", "token", "héllo wörld 🔐", "x".repeat(1000)];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// --- Format 1: "v1:<iv b64>:<ciphertext b64>", no AAD, key from a base64 env value. ---

// Reference (the app decodes with @scure/base; Buffer stands in for the padded RFC 4648 encode).
async function refV1Key(keyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", Uint8Array.from(Buffer.from(keyB64, "base64")), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}
async function refV1Encrypt(keyB64: string, token: string, iv: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await refV1Key(keyB64);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return `v1:${Buffer.from(iv).toString("base64")}:${Buffer.from(new Uint8Array(encrypted)).toString("base64")}`;
}
async function refV1Decrypt(keyB64: string, encryptedToken: string): Promise<string> {
  const [version, ivB64, encB64, ...rest] = encryptedToken.split(":");
  if (rest.length > 0 || version !== "v1" || !ivB64 || !encB64) {
    throw new Error("Invalid encrypted token format");
  }
  const key = await refV1Key(keyB64);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.from(Buffer.from(ivB64, "base64")) },
    key,
    Uint8Array.from(Buffer.from(encB64, "base64")),
  );
  return new TextDecoder().decode(decrypted);
}

// On the kit. `strict: true` keeps @scure/base's canonical-only decode.
async function kitV1Encrypt(keyB64: string, token: string, iv?: Uint8Array): Promise<string> {
  const sealed = await aesGcmEncrypt(base64ToBytes(keyB64, { strict: true }), token, { iv });
  return `v1:${bytesToBase64(sealed.iv)}:${bytesToBase64(sealed.ciphertext)}`;
}
async function kitV1Decrypt(keyB64: string, encryptedToken: string): Promise<string> {
  const [version, ivB64, encB64, ...rest] = encryptedToken.split(":");
  if (rest.length > 0 || version !== "v1" || !ivB64 || !encB64) {
    throw new Error("Invalid encrypted token format");
  }
  const plain = await aesGcmDecrypt(base64ToBytes(keyB64, { strict: true }), {
    iv: base64ToBytes(ivB64, { strict: true }),
    ciphertext: base64ToBytes(encB64, { strict: true }),
  });
  return decoder.decode(plain);
}

describe('format "v1:" (no AAD, base64 key)', () => {
  it.each(PLAINTEXTS)("is byte-identical for %j", async (plaintext) => {
    const ref = await refV1Encrypt(KEY_32_B64, plaintext, Uint8Array.from(IV_A));
    const kit = await kitV1Encrypt(KEY_32_B64, plaintext, IV_A);
    expect(kit).toBe(ref);
    expect(await kitV1Decrypt(KEY_32_B64, ref)).toBe(plaintext);
    expect(await refV1Decrypt(KEY_32_B64, await kitV1Encrypt(KEY_32_B64, plaintext))).toBe(plaintext);
  });

  it("also accepts a 16-byte key", async () => {
    const key16 = Buffer.from(KEY_32.slice(0, 16)).toString("base64");
    expect(await kitV1Encrypt(key16, "t", IV_A)).toBe(await refV1Encrypt(key16, "t", Uint8Array.from(IV_A)));
  });
});

// --- Format 2: master-key "enc:<version>:<iv>:<ct>" and per-user "enc2:<iv>:<ct>" with
// AAD labels, plus a wrapped data key record. btoa/atob encoders, 128-bit tag. ---

function refBytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function refB64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
function refMasterKeyBytes(raw: string): Uint8Array<ArrayBuffer> {
  const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  if (bytes.byteLength !== 32) throw new Error("must decode to 32 bytes (AES-256)");
  return bytes;
}
async function refAesKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function refEncrypt(key: CryptoKey, plaintext: Uint8Array<ArrayBuffer>, aad: string, iv: Uint8Array<ArrayBuffer>) {
  const packed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(aad), tagLength: 128 },
    key,
    plaintext,
  );
  return { ciphertext: refBytesToB64(new Uint8Array(packed)), iv: refBytesToB64(iv) };
}
async function refDecrypt(key: CryptoKey, blob: { ciphertext: string; iv: string }, aad: string) {
  const packed = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: refB64ToBytes(blob.iv), additionalData: encoder.encode(aad), tagLength: 128 },
    key,
    refB64ToBytes(blob.ciphertext),
  );
  return new Uint8Array(packed);
}
const refDekAad = (ownerId: string, dekVersion = 1) => `dek:${ownerId}:${dekVersion}`;

async function refEncryptField(masterB64: string, version: number, plaintext: string, aad: string, iv: Uint8Array<ArrayBuffer>) {
  const blob = await refEncrypt(await refAesKey(refMasterKeyBytes(masterB64)), encoder.encode(plaintext), aad, iv);
  return `enc:${version}:${blob.iv}:${blob.ciphertext}`;
}
async function refEncryptFieldDek(dek: Uint8Array<ArrayBuffer>, plaintext: string, aad: string, iv: Uint8Array<ArrayBuffer>) {
  const blob = await refEncrypt(await refAesKey(dek), encoder.encode(plaintext), aad, iv);
  return `enc2:${blob.iv}:${blob.ciphertext}`;
}
async function refDecryptField(stored: string, aad: string, masterB64: string, dek: Uint8Array<ArrayBuffer>) {
  if (stored.startsWith("enc2:")) {
    const rest = stored.slice("enc2:".length);
    const split = rest.indexOf(":");
    if (split <= 0) throw new Error("Encrypted field is malformed");
    const blob = { iv: rest.slice(0, split), ciphertext: rest.slice(split + 1) };
    return decoder.decode(await refDecrypt(await refAesKey(dek), blob, aad));
  }
  if (!stored.startsWith("enc:")) return stored;
  const rest = stored.slice("enc:".length);
  const first = rest.indexOf(":");
  const second = rest.indexOf(":", first + 1);
  if (first <= 0 || second <= first) throw new Error("Encrypted field is malformed");
  const blob = { iv: rest.slice(first + 1, second), ciphertext: rest.slice(second + 1) };
  return decoder.decode(await refDecrypt(await refAesKey(refMasterKeyBytes(masterB64)), blob, aad));
}
async function refWrapDek(dek: Uint8Array<ArrayBuffer>, ownerId: string, masterB64: string, masterVersion: number, iv: Uint8Array<ArrayBuffer>) {
  const blob = await refEncrypt(await refAesKey(refMasterKeyBytes(masterB64)), dek, refDekAad(ownerId), iv);
  return { wrapped: blob.ciphertext, iv: blob.iv, masterVersion, dekVersion: 1 };
}

// On the kit. The app keeps prefixes, AAD labels, key versions and length checks.
function kitMasterKeyBytes(raw: string): Uint8Array {
  const bytes = base64ToBytes(raw);
  if (bytes.byteLength !== 32) throw new Error("must decode to 32 bytes (AES-256)");
  return bytes;
}
async function kitEncryptField(masterB64: string, version: number, plaintext: string, aad: string, iv?: Uint8Array) {
  const sealed = await aesGcmEncrypt(kitMasterKeyBytes(masterB64), plaintext, { iv, aad });
  return `enc:${version}:${bytesToBase64(sealed.iv)}:${bytesToBase64(sealed.ciphertext)}`;
}
async function kitEncryptFieldDek(dek: Uint8Array, plaintext: string, aad: string, iv?: Uint8Array) {
  const sealed = await aesGcmEncrypt(dek, plaintext, { iv, aad });
  return `enc2:${bytesToBase64(sealed.iv)}:${bytesToBase64(sealed.ciphertext)}`;
}
async function kitDecryptField(stored: string, aad: string, masterB64: string, dek: Uint8Array) {
  const open = async (key: Uint8Array, iv: string, ciphertext: string) =>
    decoder.decode(
      await aesGcmDecrypt(key, { iv: base64ToBytes(iv), ciphertext: base64ToBytes(ciphertext) }, { aad }),
    );
  if (stored.startsWith("enc2:")) {
    const rest = stored.slice("enc2:".length);
    const split = rest.indexOf(":");
    if (split <= 0) throw new Error("Encrypted field is malformed");
    return open(dek, rest.slice(0, split), rest.slice(split + 1));
  }
  if (!stored.startsWith("enc:")) return stored;
  const rest = stored.slice("enc:".length);
  const first = rest.indexOf(":");
  const second = rest.indexOf(":", first + 1);
  if (first <= 0 || second <= first) throw new Error("Encrypted field is malformed");
  return open(kitMasterKeyBytes(masterB64), rest.slice(first + 1, second), rest.slice(second + 1));
}
async function kitWrapDek(dek: Uint8Array, ownerId: string, masterB64: string, masterVersion: number, iv?: Uint8Array) {
  const sealed = await aesGcmEncrypt(kitMasterKeyBytes(masterB64), dek, { iv, aad: refDekAad(ownerId) });
  return { wrapped: bytesToBase64(sealed.ciphertext), iv: bytesToBase64(sealed.iv), masterVersion, dekVersion: 1 };
}
async function kitUnwrapDek(record: { wrapped: string; iv: string; dekVersion: number }, ownerId: string, masterB64: string) {
  return aesGcmDecrypt(
    kitMasterKeyBytes(masterB64),
    { iv: base64ToBytes(record.iv), ciphertext: base64ToBytes(record.wrapped) },
    { aad: refDekAad(ownerId, record.dekVersion) },
  );
}

describe('formats "enc:" / "enc2:" (AAD labels, key versions, wrapped data key)', () => {
  const dek = Uint8Array.from({ length: 32 }, (_, i) => 255 - i);
  const aad = "oauth:conn_1:access";

  it.each(PLAINTEXTS)("master-key field is byte-identical for %j", async (plaintext) => {
    const ref = await refEncryptField(KEY_32_B64, 3, plaintext, aad, Uint8Array.from(IV_A));
    expect(await kitEncryptField(KEY_32_B64, 3, plaintext, aad, IV_A)).toBe(ref);
    expect(await kitDecryptField(ref, aad, KEY_32_B64, dek)).toBe(plaintext);
    const kit = await kitEncryptField(KEY_32_B64, 3, plaintext, aad);
    expect(await refDecryptField(kit, aad, KEY_32_B64, Uint8Array.from(dek))).toBe(plaintext);
  });

  it.each(PLAINTEXTS)("data-key field is byte-identical for %j", async (plaintext) => {
    const ref = await refEncryptFieldDek(Uint8Array.from(dek), plaintext, aad, Uint8Array.from(IV_B));
    expect(await kitEncryptFieldDek(dek, plaintext, aad, IV_B)).toBe(ref);
    expect(await kitDecryptField(ref, aad, KEY_32_B64, dek)).toBe(plaintext);
    const kit = await kitEncryptFieldDek(dek, plaintext, aad);
    expect(await refDecryptField(kit, aad, KEY_32_B64, Uint8Array.from(dek))).toBe(plaintext);
  });

  it("wrapped data key record is identical and unwraps both ways", async () => {
    const ref = await refWrapDek(Uint8Array.from(dek), "owner_1", KEY_32_B64, 2, Uint8Array.from(IV_A));
    expect(await kitWrapDek(dek, "owner_1", KEY_32_B64, 2, IV_A)).toEqual(ref);
    expect(await kitUnwrapDek(ref, "owner_1", KEY_32_B64)).toEqual(Uint8Array.from(dek));
    const kit = await kitWrapDek(dek, "owner_1", KEY_32_B64, 2);
    const key = await refAesKey(refMasterKeyBytes(KEY_32_B64));
    expect(await refDecrypt(key, { ciphertext: kit.wrapped, iv: kit.iv }, refDekAad("owner_1"))).toEqual(
      Uint8Array.from(dek),
    );
  });

  it("rejects a value sealed under a different AAD label", async () => {
    const stored = await kitEncryptField(KEY_32_B64, 1, "secret", "secret:owner:a");
    await expect(refDecryptField(stored, "secret:owner:b", KEY_32_B64, Uint8Array.from(dek))).rejects.toThrow();
  });

  it("passes plain values through", async () => {
    expect(await kitDecryptField("plain", aad, KEY_32_B64, dek)).toBe("plain");
  });
});

// --- Format 3: { ciphertext, nonce } base64 pair, no AAD, key from 64 hex chars or 32 raw bytes. ---

const HEX_KEY = /^[0-9a-fA-F]{64}$/;
function refSecretBytes(secret: string): Uint8Array<ArrayBuffer> {
  const trimmed = secret.trim();
  if (HEX_KEY.test(trimmed)) {
    return Uint8Array.from(trimmed.match(/../g) ?? [], (pair) => parseInt(pair, 16));
  }
  const raw = new TextEncoder().encode(trimmed);
  if (raw.length !== 32) throw new Error("must be 64 hex characters or 32 raw bytes.");
  return Uint8Array.from(raw);
}
async function refSeal(secret: string, plaintext: string, iv: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey("raw", refSecretBytes(secret), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { ciphertext: refBytesToB64(new Uint8Array(sealed)), nonce: refBytesToB64(iv) };
}
async function refUnseal(secret: string, ciphertext: string, nonce: string) {
  const key = await crypto.subtle.importKey("raw", refSecretBytes(secret), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: refB64ToBytes(nonce) }, key, refB64ToBytes(ciphertext));
  return new TextDecoder().decode(plain);
}

function kitSecretBytes(secret: string): Uint8Array {
  const trimmed = secret.trim();
  if (HEX_KEY.test(trimmed)) return hexToBytes(trimmed);
  const raw = encoder.encode(trimmed);
  if (raw.length !== 32) throw new Error("must be 64 hex characters or 32 raw bytes.");
  return raw;
}
async function kitSeal(secret: string, plaintext: string, iv?: Uint8Array) {
  const sealed = await aesGcmEncrypt(kitSecretBytes(secret), plaintext, { iv });
  return { ciphertext: bytesToBase64(sealed.ciphertext), nonce: bytesToBase64(sealed.iv) };
}
async function kitUnseal(secret: string, ciphertext: string, nonce: string) {
  const plain = await aesGcmDecrypt(kitSecretBytes(secret), {
    iv: base64ToBytes(nonce),
    ciphertext: base64ToBytes(ciphertext),
  });
  return decoder.decode(plain);
}

describe("format { ciphertext, nonce } (hex or raw 32-byte secret)", () => {
  const secrets = [bytesToHex(KEY_32), bytesToHex(KEY_32).toUpperCase(), ` ${bytesToHex(KEY_32)} `, "0123456789abcdefghijklmnopqrstuv"];

  it.each(secrets)("is byte-identical with secret %j", async (secret) => {
    for (const plaintext of PLAINTEXTS) {
      const ref = await refSeal(secret, plaintext, Uint8Array.from(IV_B));
      expect(await kitSeal(secret, plaintext, IV_B)).toEqual(ref);
      expect(await kitUnseal(secret, ref.ciphertext, ref.nonce)).toBe(plaintext);
      const kit = await kitSeal(secret, plaintext);
      expect(await refUnseal(secret, kit.ciphertext, kit.nonce)).toBe(plaintext);
    }
  });
});

// --- Hashes, tokens and comparison. ---

describe("hashes and tokens", () => {
  it("API key hash (sha256 of the raw key, lowercase hex) matches", async () => {
    for (const rawKey of ["", "prefix_sk_abc", "héllo"]) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
      const refHex = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      expect(await sha256Hex(rawKey)).toBe(refHex);
    }
  });

  it("token encodings match each app's encoder for the same bytes", () => {
    for (const length of [12, 24, 32]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 53 + 7) % 256);
      // hex tokens: map/padStart/join
      expect(bytesToHex(bytes)).toBe(Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
      // unpadded base64url: btoa + replace
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const refUrl = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      expect(bytesToBase64Url(bytes)).toBe(refUrl);
      expect(base64UrlToBytes(refUrl)).toEqual(Uint8Array.from(bytes));
      // padded base64url (@scure/base `base64url`); same text when length % 3 === 0
      expect(bytesToBase64Url(bytes, { padding: true })).toBe(
        Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_"),
      );
    }
  });
});

describe("timingSafeEqual matches both app copies", () => {
  function refA(a: string, b: string): boolean {
    const left = new TextEncoder().encode(a);
    const right = new TextEncoder().encode(b);
    if (left.length !== right.length) return false;
    let diff = 0;
    for (let index = 0; index < left.length; index++) {
      diff |= left[index] ^ right[index];
    }
    return diff === 0;
  }
  function refB(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const bufA = encoder.encode(a);
    const bufB = encoder.encode(b);
    if (bufA.byteLength !== bufB.byteLength) return false;
    let mismatch = 0;
    for (let i = 0; i < bufA.byteLength; i++) {
      mismatch |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
    }
    return mismatch === 0;
  }
  const values = ["", "a", "b", "ab", "sha256=abc", "MCPBootstrap s3cret", "é", "é", "\ud800", "\udfff", "😀"];

  it("for every pair", () => {
    for (const a of values) {
      for (const b of values) {
        expect(timingSafeEqual(a, b), `${a} vs ${b}`).toBe(refA(a, b));
        expect(timingSafeEqual(a, b), `${a} vs ${b}`).toBe(refB(a, b));
      }
    }
  });
});

// AES-GCM on WebCrypto with a 128-bit tag. Storage formats (prefixes, AAD
// labels, key versions, base64 flavour) stay in the app.

/** Raw key bytes (16 or 32; imported on each call) or an imported AES-GCM key. */
export type AesGcmKey = Uint8Array | CryptoKey;

/** Bytes, or a string taken as its UTF-8 bytes. */
export type BytesOrText = Uint8Array | string;

/** `ciphertext` is WebCrypto's output: the encrypted bytes followed by the 16-byte tag. */
export type AesGcmSealed = {
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: Uint8Array<ArrayBuffer>;
};

export type AesGcmEncryptOptions = {
  /** Default 12 random bytes. Pass a fixed IV only in tests. */
  iv?: Uint8Array;
  /** Additional authenticated data. Omitted and empty are the same in GCM. */
  aad?: BytesOrText;
};

export type AesGcmDecryptOptions = { aad?: BytesOrText };

function toBytes(value: BytesOrText): Uint8Array<ArrayBuffer> {
  return typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
}

async function importKey(key: AesGcmKey): Promise<CryptoKey> {
  if (!(key instanceof Uint8Array)) return key;
  return crypto.subtle.importKey("raw", new Uint8Array(key), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function params(iv: Uint8Array, aad: BytesOrText | undefined): AesGcmParams {
  const base = { name: "AES-GCM", iv: new Uint8Array(iv), tagLength: 128 };
  return aad === undefined ? base : { ...base, additionalData: toBytes(aad) };
}

export async function aesGcmEncrypt(
  key: AesGcmKey,
  plaintext: BytesOrText,
  options: AesGcmEncryptOptions = {},
): Promise<AesGcmSealed> {
  const iv = new Uint8Array(options.iv ?? crypto.getRandomValues(new Uint8Array(12)));
  const sealed = await crypto.subtle.encrypt(
    params(iv, options.aad),
    await importKey(key),
    toBytes(plaintext),
  );
  return { iv, ciphertext: new Uint8Array(sealed) };
}

/** Throws WebCrypto's `OperationError` when the key, IV, AAD or tag do not match. */
export async function aesGcmDecrypt(
  key: AesGcmKey,
  sealed: { iv: Uint8Array; ciphertext: Uint8Array },
  options: AesGcmDecryptOptions = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const plain = await crypto.subtle.decrypt(
    params(sealed.iv, options.aad),
    await importKey(key),
    new Uint8Array(sealed.ciphertext),
  );
  return new Uint8Array(plain);
}

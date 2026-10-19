# Crypto primitives (`@vvedantb/server`)

Byte encodings, hashing, random tokens, string comparison and AES-GCM on WebCrypto and `btoa`/`atob` only. They work in the Convex default runtime (no `"use node"`) and in Node 20+. No dependencies.

The primitives hold no storage format. Prefixes, AAD labels, key versions, wrapped-key records and env var names stay in each app, built on these with byte-identical output (see [Per-app wrappers](#per-app-wrappers)).

```ts
import { aesGcmEncrypt, base64ToBytes, bytesToBase64, sha256Hex, randomToken } from "@vvedantb/server";

const key = base64ToBytes(requiredEnv("ENCRYPTION_KEY"), { strict: true });
const { iv, ciphertext } = await aesGcmEncrypt(key, token);
const stored = `v1:${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;

const keyHash = await sha256Hex(rawKey);
const secret = randomToken(24, "hex");
```

## API

| Export | What it does |
| --- | --- |
| `bytesToBase64(bytes)` | Standard padded base64. Same text as `Buffer`, `btoa` loops and `@scure/base` `base64`. |
| `base64ToBytes(value, { strict? })` | Default: `atob`'s forgiving decode (ASCII whitespace ignored, padding optional, non-zero pad bits ignored; `DOMException` on bad characters). `strict: true`: only the exact text `bytesToBase64` would produce, like `@scure/base` `base64.decode`; throws `Error("Invalid base64")`. |
| `bytesToBase64Url(bytes, { padding? })` | `-`/`_` alphabet. Unpadded by default (`Buffer`'s `"base64url"`); `padding: true` matches `@scure/base` `base64url`. |
| `base64UrlToBytes(value)` | Forgiving: padding optional, `+`/`/` also accepted (as `Buffer`). |
| `bytesToHex(bytes)`, `hexToBytes(value)` | Lowercase hex out; either case in, even length, else `Error("Invalid hex")`. |
| `sha256Hex(value)` | SHA-256 of the UTF-8 bytes, lowercase hex. |
| `randomBytes(n)` | `crypto.getRandomValues(new Uint8Array(n))` (throws above 65536). |
| `randomToken(bytes, encoding)` | `encoding`: `"hex"`, `"base64"` or `"base64url"` (unpadded). |
| `timingSafeEqual(a, b)` | Compares UTF-8 bytes with an OR-accumulated XOR. See below. |
| `aesGcmEncrypt(key, plaintext, { iv?, aad? })` | Returns `{ iv, ciphertext }`. `ciphertext` is WebCrypto's output: encrypted bytes then the 16-byte tag. `iv` defaults to 12 random bytes. |
| `aesGcmDecrypt(key, { iv, ciphertext }, { aad? })` | Plaintext bytes. Throws WebCrypto's `OperationError` on a wrong key, IV, AAD or tag. |

- `key` is raw bytes (imported on each call; WebCrypto accepts 16 or 32 bytes, Node also 24) or an imported `CryptoKey`. Length policy (for example "must be 32 bytes") stays in the app.
- `plaintext` and `aad` are bytes or a string (taken as UTF-8). An empty AAD and no AAD give the same output in GCM.
- The tag is always 128 bits, as every app uses.
- Inputs are copied, so returned bytes never alias caller buffers. Returned arrays are `Uint8Array<ArrayBuffer>`, so they pass to WebCrypto without a `BufferSource` cast.

### `timingSafeEqual` semantics

The two app copies are the same: encode both strings as UTF-8, return `false` at once if the byte lengths differ, else XOR every byte pair and compare the accumulator with 0. One uses `.length` and indexes directly; the other uses `.byteLength` and `?? 0`. On a `Uint8Array` with equal lengths those are identical. Consequences, kept as they are:

- Unequal lengths return early, so the length is not hidden.
- Lone surrogates become U+FFFD when encoded, so `"\ud800"` equals `"\udfff"`.

## Per-app wrappers

`tests/crypto/appFormats.test.ts` ports each wrapper under a neutral name with its random IV made a parameter, and rebuilds it on these primitives. With the same key, IV and plaintext the stored text is equal, and each side decrypts the other's output. `tests/crypto/primitives.test.ts` has the published vectors (RFC 4648, FIPS 180-2, the GCM paper's AES-128 and AES-256 test cases).

| App | File | Format | Built on |
| --- | --- | --- | --- |
| app-a | `convex/lib/crypto.ts` | `v1:<iv b64>:<ct b64>`, no AAD; key `ENCRYPTION_KEY` base64 | `aesGcmEncrypt(base64ToBytes(env, { strict: true }), token)` + `bytesToBase64` |
| app-a | `convex/lib/base64.ts` | `@scure/base` `base64`, `base64url` (padded) | `bytesToBase64`, `base64ToBytes(v, { strict: true })`, `bytesToBase64Url(b, { padding: true })` |
| app-a | `convex/apiKeys.ts` | `<prefix>_sk_<base64url of 24 bytes>`; hash `hex(sha256(key))` | `randomToken(24, "base64url")` (24 bytes never pads), `sha256Hex` |
| app-e | `convex/crypto.ts` | `enc:<version>:<iv>:<ct>` (master key, versioned env), `enc2:<iv>:<ct>` (per-user data key), wrapped key `{ wrapped, iv, masterVersion, dekVersion }`; AAD labels on all; btoa/atob | `aesGcmEncrypt(key, text, { aad })` + `bytesToBase64`/`base64ToBytes`; `randomBytes(32)` for a data key; `sha256Hex`; `randomToken(24, "hex")` |
| app-b | `convex/vhubCredentials/seal.ts` | `{ ciphertext, nonce }` base64, no AAD; key 64 hex chars or 32 raw UTF-8 bytes | `hexToBytes` for the hex form, `aesGcmEncrypt` + `bytesToBase64` |
| app-b | `convex/routines/triggerEvents.ts` | trigger secret base64url (unpadded) of 32 bytes; event boundary hex of 12; `sha256Hex`; `timingSafeEqual` | `randomToken(32, "base64url")`, `randomToken(12, "hex")`, `sha256Hex`, `timingSafeEqual` |
| app-c | `convex/http.ts` | `timingSafeEqual` for a bootstrap header | `timingSafeEqual` |

### Differences between the app copies

- **base64 decode.** app-a decodes with `@scure/base`: strict RFC 4648 (padding required, no whitespace, zero pad bits). app-b and app-e use `atob`, which is forgiving. So an env key with a trailing newline is rejected by app-a and accepted by the others. Use `strict: true` for app-a. The error differs: `Error("Invalid base64")` rather than `@scure/base`'s messages. A fuzz run of 200,000 random strings against `@scure/base` 2.2.0 gave the same accept/reject result and bytes in every case.
- **base64url padding.** app-a's `@scure/base` `base64url` pads; app-b's local encoder strips `=`. app-a only encodes 24-byte keys, which never need padding, so both give the same text there. For other lengths use `padding: true` to match app-a.
- **AAD and tag.** app-e always passes AAD and an explicit 128-bit tag. app-a and app-b pass no AAD and the default tag (128). Same bytes as the kit with and without `aad`.
- **Key checks.** app-e requires exactly 32 bytes for master and data keys; app-b requires 64 hex chars or exactly 32 raw bytes after `trim()`; app-a accepts whatever `importKey` accepts. The kit does not check length, so each app keeps its own check.
- **hex.** All copies emit lowercase hex. app-b's hex key parse accepts either case after its own regex; `hexToBytes` does too.
- **`timingSafeEqual`.** Identical semantics in both copies (see above). There is no stricter variant to choose.

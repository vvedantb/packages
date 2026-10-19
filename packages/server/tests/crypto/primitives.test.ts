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
  randomBytes,
  randomToken,
  sha256Hex,
  timingSafeEqual,
  type RandomTokenEncoding,
} from "@vvedantb/server";

const text = (value: string) => new TextEncoder().encode(value);

// Deterministic bytes 0..n-1 (mod 256), shifted so every length hits all pad cases.
function sample(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, i) => (i * 37 + length * 11) % 256);
}

describe("base64 (RFC 4648 section 10 vectors)", () => {
  const vectors: [string, string][] = [
    ["", ""],
    ["f", "Zg=="],
    ["fo", "Zm8="],
    ["foo", "Zm9v"],
    ["foob", "Zm9vYg=="],
    ["fooba", "Zm9vYmE="],
    ["foobar", "Zm9vYmFy"],
  ];
  it.each(vectors)("%j <-> %j", (plain, encoded) => {
    expect(bytesToBase64(text(plain))).toBe(encoded);
    expect(base64ToBytes(encoded)).toEqual(text(plain));
    expect(base64ToBytes(encoded, { strict: true })).toEqual(text(plain));
  });

  it("matches Buffer for every length 0..96, both alphabets", () => {
    for (let length = 0; length <= 96; length++) {
      const bytes = sample(length);
      const buffer = Buffer.from(bytes);
      expect(bytesToBase64(bytes)).toBe(buffer.toString("base64"));
      expect(bytesToBase64Url(bytes)).toBe(buffer.toString("base64url"));
      expect(bytesToBase64Url(bytes, { padding: true })).toBe(
        buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_"),
      );
      expect(base64ToBytes(buffer.toString("base64"), { strict: true })).toEqual(Uint8Array.from(bytes));
      expect(base64UrlToBytes(buffer.toString("base64url"))).toEqual(Uint8Array.from(bytes));
      expect(bytesToHex(bytes)).toBe(buffer.toString("hex"));
      expect(hexToBytes(buffer.toString("hex"))).toEqual(Uint8Array.from(bytes));
    }
  });

  it("uses the URL alphabet", () => {
    const bytes = Uint8Array.from([0xfb, 0xff]);
    expect(bytesToBase64(bytes)).toBe("+/8=");
    expect(bytesToBase64Url(bytes)).toBe("-_8");
    expect(bytesToBase64Url(bytes, { padding: true })).toBe("-_8=");
    expect(base64UrlToBytes("-_8")).toEqual(bytes);
    expect(base64UrlToBytes("-_8=")).toEqual(bytes);
    expect(base64UrlToBytes("+/8")).toEqual(bytes);
  });

  it("decodes forgivingly by default, like atob", () => {
    expect(base64ToBytes("Zm8")).toEqual(text("fo"));
    expect(base64ToBytes(" Zm9v\nYmFy ")).toEqual(text("foobar"));
    expect(base64ToBytes("Zh==")).toEqual(text("f"));
    expect(() => base64ToBytes("Zm9v!")).toThrow();
    expect(() => base64ToBytes("Z")).toThrow();
  });

  it("rejects non-canonical text in strict mode", () => {
    for (const bad of ["Zm8", " Zm9v", "Zm9v\n", "Zh==", "Zm9=", "Zm9v!", "Z", "Zg=", "Zg==="]) {
      expect(() => base64ToBytes(bad, { strict: true }), bad).toThrow("Invalid base64");
    }
  });

  it("rejects bad hex", () => {
    expect(hexToBytes("00FFaa")).toEqual(Uint8Array.from([0, 255, 170]));
    for (const bad of ["0", "0g", " 00", "0x00"]) {
      expect(() => hexToBytes(bad), bad).toThrow("Invalid hex");
    }
  });
});

describe("sha256Hex (FIPS 180-2 vectors)", () => {
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
  ])("%j", async (input, digest) => {
    expect(await sha256Hex(input)).toBe(digest);
  });

  it("hashes UTF-8", async () => {
    expect(await sha256Hex("é")).toBe(
      Buffer.from(await crypto.subtle.digest("SHA-256", Buffer.from("é", "utf8"))).toString("hex"),
    );
  });
});

describe("random", () => {
  it("returns n bytes", () => {
    expect(randomBytes(0)).toHaveLength(0);
    expect(randomBytes(32)).toHaveLength(32);
    expect(bytesToHex(randomBytes(16))).not.toBe(bytesToHex(randomBytes(16)));
  });

  const tokens: [number, RandomTokenEncoding, RegExp][] = [
    [24, "hex", /^[0-9a-f]{48}$/],
    [12, "hex", /^[0-9a-f]{24}$/],
    [32, "base64url", /^[A-Za-z0-9_-]{43}$/],
    [24, "base64url", /^[A-Za-z0-9_-]{32}$/],
    [32, "base64", /^[A-Za-z0-9+/]{43}=$/],
  ];
  it.each(tokens)("%i bytes as %s", (bytes, encoding, pattern) => {
    expect(randomToken(bytes, encoding)).toMatch(pattern);
  });
});

describe("timingSafeEqual", () => {
  it.each([
    ["", "", true],
    ["abc", "abc", true],
    ["abc", "abd", false],
    ["abc", "abcd", false],
    ["é", "é", true],
    ["é", "é", false],
    // Lone surrogates both encode to U+FFFD.
    ["\ud800", "\udfff", true],
  ])("%j vs %j", (a, b, equal) => {
    expect(timingSafeEqual(a, b)).toBe(equal);
  });
});

function hex(value: string): Uint8Array {
  return hexToBytes(value);
}

// The Galois/Counter Mode of Operation (McGrew and Viega), test cases 1-4 and 13-16
// (the 96-bit IV cases). ciphertext here is C || T, as WebCrypto returns it.
const GCM_VECTORS = [
  {
    name: "AES-128 test case 1 (empty)",
    key: "00000000000000000000000000000000",
    iv: "000000000000000000000000",
    plaintext: "",
    aad: undefined,
    sealed: "58e2fccefa7e3061367f1d57a4e7455a",
  },
  {
    name: "AES-128 test case 2",
    key: "00000000000000000000000000000000",
    iv: "000000000000000000000000",
    plaintext: "00000000000000000000000000000000",
    aad: undefined,
    sealed: "0388dace60b6a392f328c2b971b2fe78ab6e47d42cec13bdf53a67b21257bddf",
  },
  {
    name: "AES-128 test case 4 (AAD)",
    key: "feffe9928665731c6d6a8f9467308308",
    iv: "cafebabefacedbaddecaf888",
    plaintext:
      "d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39",
    aad: "feedfacedeadbeeffeedfacedeadbeefabaddad2",
    sealed:
      "42831ec2217774244b7221b784d0d49ce3aa212f2c02a4e035c17e2329aca12e21d514b25466931c7d8f6a5aac84aa051ba30b396a0aac973d58e091" +
      "5bc94fbc3221a5db94fae95ae7121a47",
  },
  {
    name: "AES-256 test case 13 (empty)",
    key: "0000000000000000000000000000000000000000000000000000000000000000",
    iv: "000000000000000000000000",
    plaintext: "",
    aad: undefined,
    sealed: "530f8afbc74536b9a963b4f1c4cb738b",
  },
  {
    name: "AES-256 test case 16 (AAD)",
    key: "feffe9928665731c6d6a8f9467308308feffe9928665731c6d6a8f9467308308",
    iv: "cafebabefacedbaddecaf888",
    plaintext:
      "d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39",
    aad: "feedfacedeadbeeffeedfacedeadbeefabaddad2",
    sealed:
      "522dc1f099567d07f47f37a32a84427d643a8cdcbfe5c0c97598a2bd2555d1aa8cb08e48590dbb3da7b08b1056828838c5f61e6393ba7a0abcc9f662" +
      "76fc6ece0f4e1768cddf8853bb2d551b",
  },
];

describe("AES-GCM (published vectors)", () => {
  it.each(GCM_VECTORS)("$name", async (v) => {
    const aad = v.aad === undefined ? undefined : hex(v.aad);
    const sealed = await aesGcmEncrypt(hex(v.key), hex(v.plaintext), { iv: hex(v.iv), aad });
    expect(bytesToHex(sealed.iv)).toBe(v.iv);
    expect(bytesToHex(sealed.ciphertext)).toBe(v.sealed);
    expect(bytesToHex(await aesGcmDecrypt(hex(v.key), sealed, { aad }))).toBe(v.plaintext);
  });
});

describe("AES-GCM", () => {
  const key = hex("feffe9928665731c6d6a8f9467308308feffe9928665731c6d6a8f9467308308");

  it("uses a fresh 12-byte IV by default", async () => {
    const a = await aesGcmEncrypt(key, "same");
    const b = await aesGcmEncrypt(key, "same");
    expect(a.iv).toHaveLength(12);
    expect(bytesToHex(a.iv)).not.toBe(bytesToHex(b.iv));
    expect(a.ciphertext).toHaveLength(4 + 16);
  });

  it("takes strings as UTF-8 and an imported CryptoKey", async () => {
    const iv = hex("000102030405060708090a0b");
    const cryptoKey = await crypto.subtle.importKey("raw", Uint8Array.from(key), "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
    const fromText = await aesGcmEncrypt(key, "héllo", { iv, aad: "label" });
    const fromBytes = await aesGcmEncrypt(cryptoKey, text("héllo"), { iv, aad: text("label") });
    expect(fromText).toEqual(fromBytes);
    expect(new TextDecoder().decode(await aesGcmDecrypt(cryptoKey, fromText, { aad: "label" }))).toBe("héllo");
  });

  it("treats an empty AAD like none", async () => {
    const iv = hex("000102030405060708090a0b");
    expect(await aesGcmEncrypt(key, "x", { iv, aad: "" })).toEqual(await aesGcmEncrypt(key, "x", { iv }));
  });

  it("fails on a wrong AAD, key or tampered ciphertext", async () => {
    const sealed = await aesGcmEncrypt(key, "secret", { aad: "a" });
    await expect(aesGcmDecrypt(key, sealed, { aad: "b" })).rejects.toThrow();
    await expect(aesGcmDecrypt(key, sealed)).rejects.toThrow();
    await expect(aesGcmDecrypt(randomBytes(32), sealed, { aad: "a" })).rejects.toThrow();
    const tampered = Uint8Array.from(sealed.ciphertext);
    tampered[0] = (tampered[0] ?? 0) ^ 1;
    await expect(aesGcmDecrypt(key, { iv: sealed.iv, ciphertext: tampered }, { aad: "a" })).rejects.toThrow();
  });

  it("does not keep references to caller buffers", async () => {
    const iv = hex("000102030405060708090a0b");
    const sealed = await aesGcmEncrypt(key, "x", { iv });
    iv.fill(0);
    expect(bytesToHex(sealed.iv)).toBe("000102030405060708090a0b");
  });
});

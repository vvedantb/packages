import { describe, expect, it } from "vitest";
import { extractBearerToken } from "../src/bearerToken.js";

describe("extractBearerToken", () => {
  it("returns null when the header is missing or malformed", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken("Token abc")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken("Bearer token extra")).toBeNull();
  });

  it("returns the token for a valid Bearer header", () => {
    expect(extractBearerToken("Bearer sk_test_token")).toBe("sk_test_token");
    expect(extractBearerToken("bearer sk_test_token")).toBe("sk_test_token");
  });
});

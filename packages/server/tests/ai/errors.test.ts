import { createGateway } from "@ai-sdk/gateway";
import {
  GatewayAuthenticationError,
  GatewayError,
  GatewayForbiddenError,
  GatewayInternalServerError,
  GatewayInvalidRequestError,
  GatewayModelNotFoundError,
  GatewayRateLimitError,
} from "@ai-sdk/gateway";
import { AISDKError, generateText, InvalidArgumentError, InvalidResponseDataError, NoSuchModelError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { classifyGatewayError, errorMessageOf, type GatewayFailure } from "../../src/ai/index.js";

// @ai-sdk/gateway does not export GatewayTimeoutError; this matches it the way the SDK builds it (name and type).
class GatewayTimeoutError extends GatewayError {
  readonly name = "GatewayTimeoutError";
  readonly type = "timeout_error";
  constructor(message: string) {
    super({ message, statusCode: 408 });
  }
}

function timeoutLike(name: string): Error {
  const error = new Error(`${name} happened`);
  error.name = name;
  return error;
}

describe("errorMessageOf", () => {
  it("reads an Error, a string, or falls back", () => {
    expect(errorMessageOf(new Error("boom"))).toBe("boom");
    expect(errorMessageOf("plain")).toBe("plain");
    expect(errorMessageOf({ message: "not an Error" })).toBe("Unknown error");
    expect(errorMessageOf(undefined)).toBe("Unknown error");
    expect(errorMessageOf(null)).toBe("Unknown error");
  });
});

describe("classifyGatewayError", () => {
  const cases: Array<[string, unknown, GatewayFailure]> = [
    [
      "InvalidArgumentError",
      new InvalidArgumentError({ parameter: "temperature", value: 9, message: "bad temperature" }),
      { kind: "invalid_request", message: "Invalid argument for parameter temperature: bad temperature", retryable: false },
    ],
    [
      "GatewayInvalidRequestError",
      new GatewayInvalidRequestError({ message: "bad request" }),
      { kind: "invalid_request", message: "bad request", retryable: false, statusCode: 400 },
    ],
    [
      "GatewayAuthenticationError",
      new GatewayAuthenticationError({ message: "no key" }),
      { kind: "auth", message: "no key", retryable: false, statusCode: 401 },
    ],
    [
      "the auth error ai rewraps outside production",
      Object.assign(new Error("\u001b[1m\u001b[31mUnauthenticated request to AI Gateway.\u001b[0m\n\nSet the key.\n\n"), {
        name: "GatewayAuthenticationError",
      }),
      { kind: "auth", message: "Unauthenticated request to AI Gateway.\n\nSet the key.", retryable: false },
    ],
    [
      "the auth error ai rewraps in production",
      new AISDKError({ name: "GatewayError", message: "Unauthenticated. Configure AI_GATEWAY_API_KEY or use a provider module." }),
      {
        kind: "auth",
        message: "Unauthenticated. Configure AI_GATEWAY_API_KEY or use a provider module.",
        retryable: false,
      },
    ],
    [
      "another error named GatewayError",
      new AISDKError({ name: "GatewayError", message: "something else" }),
      { kind: "other", message: "something else", retryable: false },
    ],
    [
      "NoSuchModelError",
      new NoSuchModelError({ modelId: "x/y", modelType: "languageModel", message: "no x/y" }),
      { kind: "model_not_found", message: "no x/y", retryable: false },
    ],
    [
      "GatewayModelNotFoundError",
      new GatewayModelNotFoundError({ message: "unknown model", modelId: "x/y" }),
      { kind: "model_not_found", message: "unknown model", retryable: false, statusCode: 404 },
    ],
    [
      "GatewayRateLimitError",
      new GatewayRateLimitError({ message: "slow down" }),
      { kind: "rate_limit", message: "slow down", retryable: true, statusCode: 429 },
    ],
    [
      "GatewayRateLimitError that says quota (ambiguous: stays rate_limit)",
      new GatewayRateLimitError({ message: "Exceeded requests per minute quota" }),
      { kind: "rate_limit", message: "Exceeded requests per minute quota", retryable: true, statusCode: 429 },
    ],
    [
      "GatewayRateLimitError about credits",
      new GatewayRateLimitError({ message: "Insufficient credits for this request" }),
      { kind: "quota", message: "Insufficient credits for this request", retryable: false, statusCode: 429 },
    ],
    [
      "GatewayRateLimitError with 402",
      new GatewayRateLimitError({ message: "limit", statusCode: 402 }),
      { kind: "quota", message: "limit", retryable: false, statusCode: 402 },
    ],
    [
      "a Gateway error with 402",
      new GatewayInternalServerError({ message: "Payment needed", statusCode: 402 }),
      { kind: "quota", message: "Payment needed", retryable: false, statusCode: 402 },
    ],
    [
      "a forbidden Gateway error that says quota",
      new GatewayForbiddenError({ message: "Quota exceeded for entity team_1" }),
      { kind: "quota", message: "Quota exceeded for entity team_1", retryable: false, statusCode: 403 },
    ],
    [
      "a Gateway error about the spend limit",
      new GatewayInternalServerError({ message: "Monthly spend limit reached", statusCode: 403 }),
      { kind: "quota", message: "Monthly spend limit reached", retryable: false, statusCode: 403 },
    ],
    [
      "GatewayInternalServerError",
      new GatewayInternalServerError({ message: "upstream down" }),
      { kind: "gateway", message: "upstream down", retryable: true, statusCode: 500 },
    ],
    [
      "a non-retryable Gateway error",
      new GatewayForbiddenError({ message: "blocked by rule" }),
      { kind: "gateway", message: "blocked by rule", retryable: false, statusCode: 403 },
    ],
    [
      "GatewayTimeoutError",
      new GatewayTimeoutError("Gateway request timed out"),
      { kind: "timeout", message: "Gateway request timed out", retryable: true, statusCode: 408 },
    ],
    [
      "InvalidResponseDataError",
      new InvalidResponseDataError({ data: {}, message: "bad shape" }),
      { kind: "malformed_response", message: "bad shape", retryable: true },
    ],
    ["TimeoutError", timeoutLike("TimeoutError"), { kind: "timeout", message: "TimeoutError happened", retryable: true }],
    ["AbortError", timeoutLike("AbortError"), { kind: "timeout", message: "AbortError happened", retryable: true }],
    ["a plain Error", new Error("other"), { kind: "other", message: "other", retryable: false }],
    ["a plain Error that says quota", new Error("quota"), { kind: "other", message: "quota", retryable: false }],
    ["a string", "text", { kind: "other", message: "text", retryable: false }],
    ["undefined", undefined, { kind: "other", message: "Unknown error", retryable: false }],
  ];

  it.each(cases)("%s", (_label, error, expected) => {
    expect(classifyGatewayError(error)).toEqual(expected);
  });

  it("unwraps RetryError to its last error, nested too", () => {
    const last = new GatewayRateLimitError({ message: "slow down" });
    const retry = new RetryError({ message: "failed after 3", reason: "maxRetriesExceeded", errors: [new Error("1"), last] });
    expect(classifyGatewayError(retry)).toEqual({ kind: "rate_limit", message: "slow down", retryable: true, statusCode: 429 });
    const nested = new RetryError({ message: "outer", reason: "maxRetriesExceeded", errors: [retry] });
    expect(classifyGatewayError(nested).kind).toBe("rate_limit");
  });

  it("keeps the SDK's generation ID suffix in the message", () => {
    expect(classifyGatewayError(new GatewayInternalServerError({ message: "down", generationId: "gen_1" })).message).toBe(
      "down [gen_1]",
    );
  });

  it("matches SDK errors by marker, so a copy from another SDK instance still classifies", () => {
    const foreign = Object.assign(new Error("slow"), {
      name: "GatewayRateLimitError",
      statusCode: 429,
      isRetryable: true,
      [Symbol.for("vercel.ai.gateway.error")]: true,
      [Symbol.for("vercel.ai.gateway.error.GatewayRateLimitError")]: true,
    });
    expect(classifyGatewayError(foreign)).toEqual({ kind: "rate_limit", message: "slow", retryable: true, statusCode: 429 });
  });
});

// The real path: generateText through the Gateway provider with a fake fetch, so the SDK builds the errors.
describe("classifyGatewayError on errors from generateText", () => {
  async function failWith(status: number, error: Record<string, unknown>): Promise<unknown> {
    const gateway = createGateway({
      apiKey: "test-key",
      fetch: async () => new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } }),
    });
    return generateText({ model: gateway("openai/gpt-test"), prompt: "hi", maxRetries: 0 }).then(
      () => {
        throw new Error("expected a failure");
      },
      (e: unknown) => e,
    );
  }

  it("rate limit", async () => {
    const failure = classifyGatewayError(await failWith(429, { message: "Too many requests", type: "rate_limit_exceeded" }));
    expect(failure).toMatchObject({ kind: "rate_limit", retryable: true, statusCode: 429 });
  });

  it("402 with an unknown error type is quota", async () => {
    const failure = classifyGatewayError(await failWith(402, { message: "Out of credits", type: "insufficient_funds" }));
    expect(failure).toMatchObject({ kind: "quota", retryable: false, statusCode: 402 });
  });

  // ai rewraps the Gateway's auth error without its markers or status (see isWrappedAuthError).
  it("authentication", async () => {
    const failure = classifyGatewayError(await failWith(401, { message: "Invalid API key", type: "authentication_error" }));
    expect(failure).toEqual({ kind: "auth", message: expect.stringMatching(/^Unauthenticated request to AI Gateway\./), retryable: false });
    expect(failure.message).not.toContain("test-key");
  });

  it("model not found", async () => {
    const failure = classifyGatewayError(
      await failWith(404, { message: "Model not found", type: "model_not_found", param: { modelId: "openai/gpt-test" } }),
    );
    expect(failure).toMatchObject({ kind: "model_not_found", retryable: false, statusCode: 404 });
  });

  it("invalid request", async () => {
    const failure = classifyGatewayError(await failWith(400, { message: "Bad input", type: "invalid_request_error" }));
    expect(failure).toMatchObject({ kind: "invalid_request", retryable: false, statusCode: 400 });
  });

  it("server error", async () => {
    const failure = classifyGatewayError(await failWith(503, { message: "Unavailable", type: "internal_server_error" }));
    expect(failure).toMatchObject({ kind: "gateway", statusCode: 503 });
  });
});

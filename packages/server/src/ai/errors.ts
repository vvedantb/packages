import { InvalidArgumentError, InvalidResponseDataError, NoSuchModelError, RetryError } from "ai";
import {
  GatewayAuthenticationError,
  GatewayError,
  GatewayInvalidRequestError,
  GatewayModelNotFoundError,
  GatewayRateLimitError,
} from "@ai-sdk/gateway";

/**
 * What went wrong with an AI SDK / AI Gateway call, in terms a caller can act on.
 *
 * - `invalid_request`: bad arguments or a request the Gateway rejected. Not retryable.
 * - `auth`: missing or invalid Gateway key or OIDC token. Not retryable.
 * - `model_not_found`: unknown model ID. Not retryable.
 * - `rate_limit`: too many requests. Retryable after a wait.
 * - `quota`: out of credits, spend limit or quota reached: HTTP 402, a billing message, or "quota" on a Gateway
 *   error other than a rate limit. Not retryable until someone tops up or the period resets.
 * - `gateway`: any other Gateway error. `retryable` is the SDK's `isRetryable`.
 * - `malformed_response`: the response did not match what the SDK expected. Retryable.
 * - `timeout`: the call timed out or was aborted. Retryable.
 * - `other`: anything else. Not retryable.
 */
export type GatewayErrorKind =
  | "invalid_request"
  | "auth"
  | "model_not_found"
  | "rate_limit"
  | "quota"
  | "gateway"
  | "malformed_response"
  | "timeout"
  | "other";

export type GatewayFailure = {
  kind: GatewayErrorKind;
  /** The error's own message, without ANSI colour codes. Never the request body; the SDK does not put the key in it. */
  message: string;
  retryable: boolean;
  /** HTTP status, set for every Gateway error (the SDK defaults it to 500 when the response had none). */
  statusCode?: number;
};

/** `error.message` for an `Error`, the string itself for a string, else `"Unknown error"`. */
export function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/**
 * The Gateway has no quota error type: an out-of-credits or spend-limit reply arrives as a rate-limit or
 * generic Gateway error, so the status (402) or the message is all there is to go on.
 *
 * Billing words (credits, funds, billing, payment, spend limit, budget) mean quota on any Gateway error. The bare
 * word "quota" is ambiguous on a rate-limit error ("requests per minute quota"), so there it stays `rate_limit`;
 * on any other Gateway error (for example a 403) it means quota.
 */
const BILLING_MESSAGE =
  /\b(?:insufficient[ _-]?(?:funds|credits?|balance)|out of credits?|credits? (?:exhausted|limit|balance)|billing|payment required|spend(?:ing)? limit|budget (?:exceeded|limit))\b/i;
const QUOTA_MESSAGE = /\bquota\b/i;

function isQuotaError(error: GatewayError, message: string): boolean {
  if (error.statusCode === 402 || BILLING_MESSAGE.test(message)) return true;
  return !GatewayRateLimitError.isInstance(error) && QUOTA_MESSAGE.test(message);
}

/**
 * `generateText`, `streamText` and the other `ai` calls replace a `GatewayAuthenticationError` before it reaches
 * the caller (`wrapGatewayError` in `ai` 5 to 7): outside production with a plain `Error` named
 * `GatewayAuthenticationError`, and in production (`NODE_ENV=production`) with an `AISDKError` named
 * `GatewayError` whose message starts "Unauthenticated". Neither has the Gateway markers, so match them by name.
 */
function isWrappedAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "GatewayAuthenticationError" ||
    (error.name === "GatewayError" && !GatewayError.isInstance(error) && /^Unauthenticated\b/.test(error.message))
  );
}

// ANSI colour codes, which the non-production wrapped auth error puts in its message.
const ANSI = /\u001b\[[0-9;]*m/g;

/**
 * Maps an AI SDK / AI Gateway failure to a `GatewayFailure`. A `RetryError` is unwrapped to its `lastError`.
 * Checks use the SDK's `isInstance`, which matches by marker, so errors from another copy of `ai` or
 * `@ai-sdk/gateway` in the bundle are still recognised; the auth error that `ai` rewraps is matched by name.
 * The message has ANSI colour codes and outer whitespace removed. Never throws.
 *
 * Order matters: invalid request, auth and model-not-found win over quota; quota wins over rate limit; a Gateway
 * timeout is `timeout`, not `gateway`.
 */
export function classifyGatewayError(error: unknown): GatewayFailure {
  if (RetryError.isInstance(error)) {
    return classifyGatewayError(error.lastError);
  }
  const message = errorMessageOf(error).replace(ANSI, "").trim();
  const statusCode = GatewayError.isInstance(error) ? { statusCode: error.statusCode } : {};
  if (InvalidArgumentError.isInstance(error) || GatewayInvalidRequestError.isInstance(error)) {
    return { kind: "invalid_request", message, retryable: false, ...statusCode };
  }
  if (GatewayAuthenticationError.isInstance(error) || isWrappedAuthError(error)) {
    return { kind: "auth", message, retryable: false, ...statusCode };
  }
  if (NoSuchModelError.isInstance(error) || GatewayModelNotFoundError.isInstance(error)) {
    return { kind: "model_not_found", message, retryable: false, ...statusCode };
  }
  if (GatewayError.isInstance(error) && isQuotaError(error, message)) {
    return { kind: "quota", message, retryable: false, ...statusCode };
  }
  if (GatewayRateLimitError.isInstance(error)) {
    return { kind: "rate_limit", message, retryable: true, ...statusCode };
  }
  if (GatewayError.isInstance(error)) {
    // GatewayTimeoutError is not exported by @ai-sdk/gateway, so match it by name.
    if (error.name === "GatewayTimeoutError") {
      return { kind: "timeout", message, retryable: true, ...statusCode };
    }
    return { kind: "gateway", message, retryable: error.isRetryable, ...statusCode };
  }
  if (InvalidResponseDataError.isInstance(error)) {
    return { kind: "malformed_response", message, retryable: true };
  }
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return { kind: "timeout", message, retryable: true };
  }
  return { kind: "other", message, retryable: false };
}

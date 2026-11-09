import { isClerkAPIResponseError } from "@clerk/clerk-expo";

/** Words that must not reach the user: the auth provider and stack names. */
const PRODUCT_NAMES = /\b(clerk|convex)\b/gi;

/** The only Clerk codes that mean "Invalid email or password". */
export const CREDENTIAL_ERROR_CODES = ["form_password_incorrect", "form_identifier_not_found"] as const;

type ClerkErrorItem = {
  code?: unknown;
  message?: unknown;
  longMessage?: unknown;
  meta?: { paramName?: unknown } | null;
};

type ParsedAuthError = {
  errors: ClerkErrorItem[];
  status?: number;
  clerkTraceId?: string;
  errorName?: string;
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

/** Reads a Clerk API error, or a plain `{ errors: [...] }` object. No `zod`. */
function parseAuthError(error: unknown): ParsedAuthError | null {
  if (typeof error !== "object" || error === null) return null;
  const record = error as Record<string, unknown>;
  if (!isClerkAPIResponseError(error) && !Array.isArray(record.errors)) return null;
  const errors = Array.isArray(record.errors)
    ? (record.errors as unknown[]).filter((item): item is ClerkErrorItem => typeof item === "object" && item !== null)
    : [];
  return {
    errors,
    status: typeof record.status === "number" ? record.status : undefined,
    clerkTraceId: asString(record.clerkTraceId),
    errorName: asString(record.name),
  };
}

function firstError(parsed: ParsedAuthError | null) {
  const first = parsed?.errors[0];
  return {
    code: asString(first?.code),
    message: asString(first?.message),
    longMessage: asString(first?.longMessage),
    paramName: asString(first?.meta?.paramName),
  };
}

/** The code of a timed-out auth stage. */
export const AUTH_TIMEOUT_CODE = "auth_timeout";

/** Default time for one Clerk call, in milliseconds. */
export const DEFAULT_STAGE_TIMEOUT_MS = 20000;

/**
 * The error `withAuthTimeout` rejects with. It is Clerk-shaped (`errors[0].code`
 * is `auth_timeout`), so `authErrorMessage` and `logAuthFailure` read it.
 */
export class AuthTimeoutError extends Error {
  readonly code = AUTH_TIMEOUT_CODE;
  readonly stage: string;
  readonly errors: { code: string; message: string }[];
  constructor(stage: string, ms: number) {
    const message = `The ${stage} step timed out after ${Math.round(ms / 1000)} seconds. Try again.`;
    super(message);
    this.name = "AuthTimeoutError";
    this.stage = stage;
    this.errors = [{ code: AUTH_TIMEOUT_CODE, message }];
  }
}

export function isAuthTimeoutError(error: unknown): error is AuthTimeoutError {
  return error instanceof AuthTimeoutError;
}

/**
 * Rejects with `AuthTimeoutError` (code `auth_timeout`, message names `stage`)
 * when `promise` has not settled after `ms`. The timer is cleared on settle.
 */
export function withAuthTimeout<T>(promise: Promise<T>, stage: string, ms: number = DEFAULT_STAGE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AuthTimeoutError(stage, ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Logs a failed auth call as one structured `console.error`. It holds the
 * Clerk code, message, longMessage and meta.paramName, plus stage, errorName,
 * status and clerkTraceId when present. For `AuthTimeoutError` the logged stage is the error's own stage. Only the error object is read, so a
 * password or one-time code is never logged.
 */
export function logAuthFailure(stage: string, error: unknown): void {
  if (isAuthTimeoutError(error)) stage = error.stage;
  const parsed = parseAuthError(error);
  const { code, message, longMessage, paramName } = firstError(parsed);
  const errorName = parsed?.errorName ?? (error instanceof Error ? error.name : undefined);
  console.error("[sign-in] failure", {
    stage,
    ...(errorName ? { errorName } : {}),
    ...(parsed?.status !== undefined ? { status: parsed.status } : {}),
    ...(parsed?.clerkTraceId ? { clerkTraceId: parsed.clerkTraceId } : {}),
    code,
    message,
    longMessage,
    meta: { paramName },
  });
}

export type AuthErrorOptions = {
  /**
   * Sign-in with email and password. `form_password_incorrect` and
   * `form_identifier_not_found` (only these) return `fallback`.
   */
  credentials?: boolean;
};

/**
 * A message to show for an auth error. For a Clerk error it gives the first
 * `longMessage` or `message`, with `clerk` and `convex` written as "the
 * sign-in service", then `(code: <code>)`. With no text it gives `fallback`,
 * still followed by the code when there is one. With `credentials: true`, the
 * two credential codes give `fallback` alone. Anything that is not a Clerk
 * error gives `fallback`. Never shows a raw exception message.
 */
export function authErrorMessage(error: unknown, fallback: string, options: AuthErrorOptions = {}): string {
  const parsed = parseAuthError(error);
  if (!parsed) return fallback;
  const { code, message, longMessage } = firstError(parsed);
  if (options.credentials && code && (CREDENTIAL_ERROR_CODES as readonly string[]).includes(code)) return fallback;
  const text = (longMessage ?? message)?.replace(PRODUCT_NAMES, "the sign-in service") ?? fallback;
  return code ? `${text} (code: ${code})` : text;
}

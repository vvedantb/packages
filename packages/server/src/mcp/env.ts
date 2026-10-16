import { requiredEnvUrl, type EnvSource } from "../convex/index";

/**
 * How a fallback env var is chosen. They differ only when the primary is
 * unset or empty, and in which name the "is not set" error mentions.
 *
 * | mode | rule | used by |
 * | --- | --- | --- |
 * | `"fallback-if-set"` | fallback only when primary is empty and fallback is non-empty; else primary | app-d |
 * | `"prefer-primary"` | primary when non-empty, else fallback (error names the fallback) | app-c |
 * | `"nullish"` | `env[name] ?? env[fallback]`, read as `name` (an empty primary does not fall back) | app-b |
 */
export type EnvFallbackMode = "fallback-if-set" | "prefer-primary" | "nullish";

/** An env var holding a URL. A plain string is a name with no fallback. */
export type EnvUrl =
  | string
  | { name: string; fallback?: string; fallbackMode?: EnvFallbackMode };

/**
 * Read a URL from env through server/convex's `requiredEnvUrl` (throws
 * "<NAME> is not set in Convex env", strips one trailing slash).
 */
export function readEnvUrl(source: EnvUrl, env: EnvSource = process.env): string {
  if (typeof source === "string") return requiredEnvUrl(source, env);
  const { name, fallback } = source;
  if (!fallback) return requiredEnvUrl(name, env);
  switch (source.fallbackMode ?? "fallback-if-set") {
    case "fallback-if-set":
      return requiredEnvUrl(!env[name] && !!env[fallback] ? fallback : name, env);
    case "prefer-primary":
      return requiredEnvUrl(env[name] ? name : fallback, env);
    case "nullish":
      return requiredEnvUrl(name, { [name]: env[name] ?? env[fallback] });
  }
}

// Type-only: the app passes its own `z`, so zod stays an optional peer and the
// thrown ZodError comes from the app's zod version (3.25+ or 4), as today.
import type { z } from "zod";

export type ViteEnvName = "development" | "staging" | "production";

export const VITE_ENV_NAMES: readonly ["development", "staging", "production"] = ["development", "staging", "production"];

/** `import.meta.env`, or any record of raw env values. */
export type ClientEnvSource = Readonly<Record<string, string | boolean | undefined>>;

type BaseShape = {
  VITE_CONVEX_URL: z.ZodType<string>;
  VITE_CLERK_PUBLISHABLE_KEY: z.ZodType<string>;
};

type ViteEnvShape = BaseShape & { VITE_ENV: z.ZodType<ViteEnvName> };

/**
 * - `"strict"` (default): `VITE_ENV` must be one of `VITE_ENV_NAMES`.
 * - `"fallback"`: any other value (or none) is read as `"development"`.
 * - `false`: no `VITE_ENV` key.
 */
export type ViteEnvMode = "strict" | "fallback" | false;

export type ClientEnvOptions<Extra extends z.ZodRawShape> = {
  /** The app's `z` from `"zod"`. */
  z: typeof z;
  viteEnv?: ViteEnvMode;
  /** Extra keys, parsed after the base keys in the same `z.object`. A key here replaces a base key. */
  extend?: Extra;
};

/** Parsed env with `VITE_ENV`. */
export type ClientEnv<Extra extends z.ZodRawShape = Record<never, never>> = z.output<z.ZodObject<ViteEnvShape & Extra>>;

/** Parsed env without `VITE_ENV` (`viteEnv: false`). */
export type ClientEnvWithoutViteEnv<Extra extends z.ZodRawShape = Record<never, never>> = z.output<
  z.ZodObject<BaseShape & Extra>
>;

/**
 * Parse VITE env with zod: `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY`
 * are `z.string().min(1)`, `VITE_ENV` is `z.enum(VITE_ENV_NAMES)`, then any
 * `extend` keys. Only those keys are read from `rawEnv`. Throws the ZodError
 * from `z.object(shape).parse`.
 */
export function parseClientEnv<Extra extends z.ZodRawShape = Record<never, never>>(
  rawEnv: ClientEnvSource,
  options: ClientEnvOptions<Extra> & { viteEnv: false },
): ClientEnvWithoutViteEnv<Extra>;
export function parseClientEnv<Extra extends z.ZodRawShape = Record<never, never>>(
  rawEnv: ClientEnvSource,
  options: ClientEnvOptions<Extra> & { viteEnv?: "strict" | "fallback" },
): ClientEnv<Extra>;
export function parseClientEnv(
  rawEnv: ClientEnvSource,
  options: ClientEnvOptions<z.ZodRawShape>,
): z.output<z.ZodObject<z.ZodRawShape>> {
  const zod = options.z;
  const viteEnv = options.viteEnv ?? "strict";
  const shape: z.ZodRawShape = {
    VITE_CONVEX_URL: zod.string().min(1),
    VITE_CLERK_PUBLISHABLE_KEY: zod.string().min(1),
    ...(viteEnv === false ? {} : { VITE_ENV: zod.enum(VITE_ENV_NAMES) }),
    ...options.extend,
  };
  const input: Record<string, string | boolean | undefined> = {};
  for (const key of Object.keys(shape)) input[key] = rawEnv[key];
  if (viteEnv === "fallback") input.VITE_ENV = viteEnvOrDevelopment(rawEnv.VITE_ENV);
  return zod.object(shape).parse(input);
}

function viteEnvOrDevelopment(value: string | boolean | undefined): ViteEnvName {
  return value === "production" || value === "staging" || value === "development" ? value : "development";
}

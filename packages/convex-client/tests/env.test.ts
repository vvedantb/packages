import { describe, expect, expectTypeOf, it } from "vitest";
import { z as z4 } from "zod";
import { z as z3 } from "zod3";
import { parseClientEnv, type ViteEnvName } from "@vvedantb/convex-client";

// Each app's env/client.ts, ported with its zod passed in. The apps run zod 3.25
// (app-b, app-c) and zod 4 (app-d), so every case runs with both.

type Raw = Record<string, string | boolean | undefined>;

/** app-b web: strict VITE_ENV. */
function appB(z: typeof z4, raw: Raw) {
  const clientEnvSchema = z.object({
    VITE_CONVEX_URL: z.string().min(1),
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    VITE_ENV: z.enum(["development", "staging", "production"]),
  });
  return clientEnvSchema.parse({
    VITE_CONVEX_URL: raw.VITE_CONVEX_URL,
    VITE_CLERK_PUBLISHABLE_KEY: raw.VITE_CLERK_PUBLISHABLE_KEY,
    VITE_ENV: raw.VITE_ENV,
  });
}

/** app-c web and app-d web: VITE_ENV falls back to "development". */
function appCD(z: typeof z4, raw: Raw) {
  const clientEnvSchema = z.object({
    VITE_CONVEX_URL: z.string().min(1),
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    VITE_ENV: z.enum(["development", "staging", "production"]),
  });
  const rawViteEnv = raw.VITE_ENV;
  const viteEnv =
    rawViteEnv === "production" || rawViteEnv === "staging" || rawViteEnv === "development" ? rawViteEnv : "development";
  return clientEnvSchema.parse({
    VITE_CONVEX_URL: raw.VITE_CONVEX_URL,
    VITE_CLERK_PUBLISHABLE_KEY: raw.VITE_CLERK_PUBLISHABLE_KEY,
    VITE_ENV: viteEnv,
  });
}

/** app-c extension: no VITE_ENV, plus a sync host URL. */
function appCExtension(z: typeof z4, raw: Raw) {
  const clientEnvSchema = z.object({
    VITE_CONVEX_URL: z.string().min(1),
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    VITE_CLERK_SYNC_HOST: z.string().url(),
  });
  return clientEnvSchema.parse({
    VITE_CONVEX_URL: raw.VITE_CONVEX_URL,
    VITE_CLERK_PUBLISHABLE_KEY: raw.VITE_CLERK_PUBLISHABLE_KEY,
    VITE_CLERK_SYNC_HOST: raw.VITE_CLERK_SYNC_HOST,
  });
}

/** `{ value }` or the thrown error's class, message and issues. */
function settle(fn: () => object) {
  try {
    return { value: fn() };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.constructor.name, message: error.message, issues: "issues" in error ? error.issues : undefined };
  }
}

const base = { VITE_CONVEX_URL: "https://x.convex.cloud", VITE_CLERK_PUBLISHABLE_KEY: "pk_test_x" };
const envs: Record<string, Raw> = {
  valid: { ...base, VITE_ENV: "production", VITE_CLERK_SYNC_HOST: "https://app.example.com", DEV: true, OTHER: "x" },
  staging: { ...base, VITE_ENV: "staging", VITE_CLERK_SYNC_HOST: "https://app.example.com" },
  "unknown VITE_ENV": { ...base, VITE_ENV: "preview" },
  "missing VITE_ENV": { ...base },
  "boolean VITE_ENV": { ...base, VITE_ENV: true },
  "empty url": { ...base, VITE_CONVEX_URL: "", VITE_ENV: "development" },
  "missing everything": {},
  "bad sync host": { ...base, VITE_CLERK_SYNC_HOST: "not a url" },
};

for (const [zodLabel, zod] of [
  ["zod 4", z4],
  // zod 3's `z` has the same call shape; the typed param is zod 4's.
  ["zod 3", z3],
] satisfies Array<[string, typeof z4 | typeof z3]>) {
  describe(`parseClientEnv with ${zodLabel}`, () => {
    for (const [label, raw] of Object.entries(envs)) {
      it(`${label}: matches each copy`, () => {
        // @ts-expect-error zod 3's namespace type differs from the zod 4 types this test file compiles against
        const z: typeof z4 = zod;
        expect(settle(() => parseClientEnv(raw, { z }))).toEqual(settle(() => appB(z, raw)));
        expect(settle(() => parseClientEnv(raw, { z, viteEnv: "fallback" }))).toEqual(settle(() => appCD(z, raw)));
        expect(
          settle(() =>
            parseClientEnv(raw, { z, viteEnv: false, extend: { VITE_CLERK_SYNC_HOST: z.string().url() } }),
          ),
        ).toEqual(settle(() => appCExtension(z, raw)));
      });
    }
  });
}

describe("parseClientEnv types", () => {
  it("infers VITE_ENV and extra keys", () => {
    const env = parseClientEnv(envs.valid ?? {}, { z: z4, extend: { VITE_SITE: z4.string().optional() } });
    expectTypeOf(env.VITE_CONVEX_URL).toEqualTypeOf<string>();
    expectTypeOf(env.VITE_ENV).toEqualTypeOf<ViteEnvName>();
    expectTypeOf(env.VITE_SITE).toEqualTypeOf<string | undefined>();

    const extension = parseClientEnv(envs.valid ?? {}, { z: z4, viteEnv: false });
    expectTypeOf(extension).toEqualTypeOf<{ VITE_CONVEX_URL: string; VITE_CLERK_PUBLISHABLE_KEY: string }>();
    expect(Object.keys(extension)).toEqual(["VITE_CONVEX_URL", "VITE_CLERK_PUBLISHABLE_KEY"]);
  });

  it("reads only the schema keys from import.meta.env-like input", () => {
    expect(parseClientEnv(envs.valid ?? {}, { z: z4 })).toEqual({ ...base, VITE_ENV: "production" });
  });
});

export type EnvSource = Record<string, string | undefined>;

/** Read a required env var. Throws when it is unset or empty. */
export function requiredEnv(name: string, env: EnvSource = process.env): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is not set in Convex env`);
  }
  return value;
}

/** Read a required env var used as a URL prefix, stripping one trailing slash. */
export function requiredEnvUrl(
  name: string,
  env: EnvSource = process.env,
): string {
  return requiredEnv(name, env).replace(/\/$/, "");
}

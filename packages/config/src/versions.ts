/**
 * Pinned tool versions shared across vvedantb repos. These are ranges for
 * guidance. Apps pin exact versions in their own lockfiles; `convex` in
 * particular should be pinned exactly by each app.
 */
export const versions = {
  typescript: "^5.9.0",
  vitest: "^3.2.0",
  pnpm: ">=10 <11",
  convex: "^1.0.0",
  node: {
    /** This ui monorepo. */
    uiMonorepo: ">=22",
    /** Apps that consume the packages. */
    apps: ">=20",
  },
} as const;

export type Versions = typeof versions;

import type { ProductAppName } from "./AppWordmark";

/** The five product apps in footer order (not `FAMILY_APPS` order). */
export const PROJECT_V_PRODUCT_APP_IDS: readonly ProductAppName[] = ["vibot", "vmem", "verve", "velth", "vhub"];

/** Apps column: each app links to `https://{app}.projectv.uk` in a new tab, with its glyph and lowercase id as the label. */
export function projectVAppsColumn() {
  return {
    heading: "Apps",
    links: PROJECT_V_PRODUCT_APP_IDS.map((app) => ({
      href: `https://${app}.projectv.uk`,
      label: app,
      external: true as const,
      app,
    })),
  };
}

/** `projectVAppsColumn()`, built once. */
export const PROJECT_V_PRODUCT_APPS = projectVAppsColumn();

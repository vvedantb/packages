import type { AppName } from "./svg";

/** Benefits for one app, shown under that app's icon and name. */
export type PricingPlanAppBenefit = {
  app: Exclude<AppName, "projectv">;
  items: readonly string[];
};

/** Approved per-app copy for V Pro, in display order. */
export const V_PRO_APP_BENEFITS: readonly PricingPlanAppBenefit[] = [
  {
    app: "vibot",
    items: [
      "1000 messages / day",
      "100 image gens / day",
      "100 deep & 20 extreme searches / day",
      "Smarter AI for chats, documents & sub-agents",
    ],
  },
  { app: "vmem", items: ["Unlimited memories", "Higher AI search & connected-tool limits"] },
  { app: "vhub", items: ["Unlimited scripts", "More connections, secrets & API keys"] },
  { app: "velth", items: ["Unlimited camera scans", "Smarter AI health insights"] },
  { app: "verve", items: ["Page version history", "Higher AI rewrite & summary limits"] },
];

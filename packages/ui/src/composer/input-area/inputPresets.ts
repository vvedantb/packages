import type { ActionFeatures } from "./types";

export const MAIN_CHAT_ACTION_FEATURES: ActionFeatures = {
  dictate: true,
};

export const CONTEXT_CHAT_ACTION_FEATURES: ActionFeatures = {
  dictate: true,
};

export const CONTEXT_CHAT_DISPLAY_OPTIONS = {
  showBanners: true,
  showUpgradeBanner: true,
} satisfies Record<string, boolean>;

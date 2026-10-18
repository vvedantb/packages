/** Feature flags for the action row. Mirrors the shape the app presets use. */
export type ActionFeatures = {
  dictate?: boolean;
};

/** Feature flags that show a banner above the input. */
export type BannerFeatures = {
  privacy: boolean;
};

export const DEFAULT_BANNER_FEATURES: BannerFeatures = {
  privacy: false,
};

/** Data for the hover preview of a skill row. The app renders it through `renderSlashItem`. */
export type SkillChipPreview = {
  id: string;
  kind: "hub" | "manual";
  name: string;
  description: string;
  icon?: string;
  sourceLabel: string;
  installed: boolean;
  enabled: boolean;
};

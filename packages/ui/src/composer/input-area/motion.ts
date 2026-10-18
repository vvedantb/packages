import { motionDuration, motionEase } from "../../motion/presets";

/** Fast transition used by the stop button, slash menu and banners. */
export const motionFast = {
  duration: motionDuration.fast,
  ease: motionEase,
} as const;

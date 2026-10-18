import { APP_STYLES } from "../shared";
import type { BannerFeatures } from "./shared-types";

export const getBorderStyles = (f: BannerFeatures) =>
  f.privacy ? APP_STYLES.borderPrivacy : APP_STYLES.border;
export const submitButtonStyles = { bg: APP_STYLES.submitBg, text: APP_STYLES.submitText };
export const bannerStyles = APP_STYLES.banner;

import type { ReactNode } from "react";
import { IconLock } from "@tabler/icons-react";
import { cn } from "../../utils/cn";
import { FadePresence } from "./FadePresence";
import type { BannerFeatures } from "./types";

export type InputBannerStyles = {
  privacy: { wrapper: string; icon: string; title: string; detail: string };
};

export const defaultInputBannerStyles: InputBannerStyles = {
  privacy: {
    wrapper: "",
    icon: "",
    title: "",
    detail: "text-muted-foreground",
  },
};

export type InputBannersProps = {
  features: BannerFeatures;
  /** Class strings for the privacy banner. The app passes its own for an exact match. */
  styles?: InputBannerStyles;
  privacyTitle?: ReactNode;
  privacyDetail?: ReactNode;
};

function BannerWrapper({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <div className="mx-auto w-full max-w-xs md:max-w-2xl">
      <div className={cn("feature-banner", className)}>{children}</div>
    </div>
  );
}

export function InputBanners({
  features,
  styles = defaultInputBannerStyles,
  privacyTitle = "Private mode",
  privacyDetail = "Hidden from history, search, and memories",
}: InputBannersProps) {
  return (
    <FadePresence show={features.privacy}>
      <BannerWrapper className={styles.privacy.wrapper}>
        <IconLock className={styles.privacy.icon} width={16} />
        <p className={cn("text-sm font-medium", styles.privacy.title)}>
          {privacyTitle}
        </p>
        <p className={cn("ml-auto text-xs", styles.privacy.detail)}>
          {privacyDetail}
        </p>
      </BannerWrapper>
    </FadePresence>
  );
}

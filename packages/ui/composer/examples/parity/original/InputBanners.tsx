import { type ReactNode } from "react";
import { cn, FadePresence } from "@vv/ui";
import { IconLock } from "@tabler/icons-react";
import type { BannerFeatures } from "@app/shared";
import { bannerStyles } from "../utils";
interface InputBannersProps {
  features: BannerFeatures;
}
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
export function InputBanners({ features }: InputBannersProps) {
  return (
    <FadePresence show={features.privacy}>
      <BannerWrapper className={bannerStyles.privacy.wrapper}>
        <IconLock className={bannerStyles.privacy.icon} width={16} />
        <p className={cn("text-sm font-medium", bannerStyles.privacy.title)}>
          Private mode
        </p>
        <p className={cn("ml-auto text-xs", bannerStyles.privacy.detail)}>
          Hidden from history, search, and memories
        </p>
      </BannerWrapper>
    </FadePresence>
  );
}

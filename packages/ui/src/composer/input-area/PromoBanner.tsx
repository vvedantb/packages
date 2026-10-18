import type { ReactNode } from "react";
import { IconSparkles, IconX } from "@tabler/icons-react";
import { Button } from "../../ui/button";
import { FadePresence } from "./FadePresence";

export type PromoBannerProps = {
  show: boolean;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  /** Banner text. */
  children?: ReactNode;
  actionLabel?: ReactNode;
  icon?: ReactNode;
};

/** Promo strip above the input. The app owns timing, dismissal state and billing. */
export function PromoBanner({
  show,
  onUpgrade,
  onDismiss,
  children = "Unlock unlimited messages, advanced features, and more",
  actionLabel = "Upgrade",
  icon,
}: PromoBannerProps) {
  return (
    <FadePresence show={show} className="mb-2 w-full">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-surface-secondary text-foreground">
        <div className="flex items-center gap-2">
          {icon ?? <IconSparkles className="w-4 h-4 text-foreground" />}
          <p className="text-sm text-foreground">{children}</p>
        </div>
        <div className="flex items-center gap-2">
          {onUpgrade ? (
            <Button size="sm" onClick={onUpgrade}>
              {actionLabel}
            </Button>
          ) : null}
          {onDismiss ? (
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground min-w-6 w-6 h-6"
              onClick={onDismiss}
              aria-label="Dismiss"
            >
              <IconX className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </FadePresence>
  );
}

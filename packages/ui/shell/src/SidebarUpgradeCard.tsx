import { AppMark } from "../../src/brand/AppMark";
import { Button } from "../../src/ui/button";
import { cn } from "../../src/utils/cn";

export type SidebarUpgradeCardProps = {
  /** Opens the app's `PricingModal`. */
  onUpgrade: () => void;
  /** Narrow rail: an icon-only "Upgrade to Pro" button instead of the full card. Default `false`. */
  collapsed?: boolean;
  className?: string;
};

const pillClass = "bg-foreground text-background hover:bg-foreground/85";

/**
 * Upgrade prompt for the sidebar: Project V mark, "Upgrade to Pro" and an "Upgrade" pill. It does not check
 * the plan; the app hides it when the user is already on Pro. The mark uses a numeric `size` (its height) so
 * the width follows the aspect ratio.
 */
export function SidebarUpgradeCard({ onUpgrade, collapsed = false, className }: SidebarUpgradeCardProps) {
  if (collapsed) {
    return (
      <Button
        type="button"
        size="icon"
        aria-label="Upgrade to Pro"
        title="Upgrade to Pro"
        onClick={onUpgrade}
        className={cn("rounded-full", pillClass, className)}
      >
        <AppMark app="projectv" size={16} />
      </Button>
    );
  }
  return (
    <div
      data-slot="sidebar-upgrade-card"
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl bg-surface-secondary px-3 py-2.5 text-foreground",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
        <AppMark app="projectv" size={14} className="shrink-0" />
        <span className="truncate">Upgrade to Pro</span>
      </div>
      <Button type="button" size="sm" onClick={onUpgrade} className={cn("shrink-0 rounded-full", pillClass)}>
        Upgrade
      </Button>
    </div>
  );
}

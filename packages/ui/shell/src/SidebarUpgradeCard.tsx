import { Button } from "../../src/ui/button";
import { cn } from "../../src/utils/cn";

export type SidebarUpgradeCardProps = {
  /** Opens the app's `PricingModal`. */
  onUpgrade: () => void;
  /** Narrow rail: a round "Pro" button (labelled "Upgrade to Pro") instead of the full card. Default `false`. */
  collapsed?: boolean;
  className?: string;
};

const pillClass = "bg-foreground text-background hover:bg-foreground/85";

/**
 * Upgrade prompt for the sidebar: the title "Upgrade to Pro" and an "Upgrade" pill, with no mark. It does
 * not check the plan; the app hides it when the user is already on Pro.
 */
export function SidebarUpgradeCard({ onUpgrade, collapsed = false, className }: SidebarUpgradeCardProps) {
  if (collapsed) {
    return (
      <Button
        type="button"
        size="sm"
        aria-label="Upgrade to Pro"
        title="Upgrade to Pro"
        onClick={onUpgrade}
        className={cn("rounded-full px-3", pillClass, className)}
      >
        Pro
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
      <span className="min-w-0 truncate text-sm font-semibold">Upgrade to Pro</span>
      <Button type="button" size="sm" onClick={onUpgrade} className={cn("shrink-0 rounded-full", pillClass)}>
        Upgrade
      </Button>
    </div>
  );
}

import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../src/ui/tooltip";

export type SidebarIconTooltipProps = {
  label: string;
  enabled: boolean;
  children: ReactElement;
  /** Default `"right"`. */
  side?: "top" | "right" | "bottom" | "left";
  /** Default `8`. */
  sideOffset?: number;
};

// radix tooltip for icon-only sidebar rail — skipped when labels are visible
export function SidebarIconTooltip({
  label,
  enabled,
  children,
  side = "right",
  sideOffset = 8,
}: SidebarIconTooltipProps) {
  if (!enabled) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={sideOffset}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

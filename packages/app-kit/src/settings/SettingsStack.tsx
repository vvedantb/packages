import type { ReactNode } from "react";

import { cn } from "../cn.js";

/**
 * Vertical rhythm for every settings page body — one gap, no page-local freelancing.
 * Shared across apps.
 */
export function SettingsStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-8", className)}>{children}</div>;
}

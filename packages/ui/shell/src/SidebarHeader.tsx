import type { ReactNode } from "react";
import { cn } from "./cn.js";

export type SidebarHeaderProps = {
  title: string;
  trailing?: ReactNode;
  className?: string;
};

export function SidebarHeader({ title, trailing, className }: SidebarHeaderProps) {
  return (
    <div className={cn("flex h-11 items-center gap-1 pl-3 pr-1", className)}>
      <h2 className="min-w-0 flex-1 truncate text-left text-base font-semibold leading-none tracking-tight text-foreground">
        {title}
      </h2>
      {trailing ? (
        <div className="flex items-center justify-end gap-0.5">{trailing}</div>
      ) : null}
    </div>
  );
}

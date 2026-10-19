import type { ReactNode } from "react";
import { sidebarHeaderRowClass } from "./app-shell-classes";
import { cn } from "./cn.js";
import { PanelActions, PanelTitle } from "./SidebarPanel";

export type SidebarHeaderProps = {
  title: string;
  trailing?: ReactNode;
  className?: string;
};

/** Header row: a title and optional trailing actions. Inside a panel, compose `Sidebar.PanelHeader` instead. */
export function SidebarHeader({ title, trailing, className }: SidebarHeaderProps) {
  return (
    <div className={cn(sidebarHeaderRowClass, className)}>
      <PanelTitle>{title}</PanelTitle>
      {trailing ? <PanelActions>{trailing}</PanelActions> : null}
    </div>
  );
}

import { cn } from "../utils/cn";
import { NavIconBase, type IconProps } from "./nav-icon-base";

export type SidebarToggleIconProps = IconProps & {
  /** Chevron points out (expand) instead of in (collapse). */
  collapsed?: boolean;
};

/** Window with a side panel; the panel squeezes and the chevron nudges on hover. */
export function SidebarToggleIcon({ strokeWidth = 1.75, collapsed = false, className, ...props }: SidebarToggleIconProps) {
  return (
    <NavIconBase
      {...props}
      strokeWidth={strokeWidth}
      className={cn(collapsed && "vv-icon-sidebar-collapsed", className)}
      hoverScale="1.12"
      loop={900}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <rect x="3.5" y="4.5" width="5.5" height="15" rx="1.2" fill="currentColor" stroke="none" className="vv-icon-sidebar-panel" />
      <path d={collapsed ? "M13 9l3 3-3 3" : "M16 9l-3 3 3 3"} className="vv-icon-sidebar-chevron" />
    </NavIconBase>
  );
}

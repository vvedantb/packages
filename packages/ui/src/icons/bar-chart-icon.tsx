import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Three rising bars with a trend line; bars grow and the line draws on hover. */
export function BarChartIcon({ strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1600}>
      <line x1="3" y1="20" x2="21" y2="20" />
      <rect x="5" y="14" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" className="vv-icon-chart-bar vv-icon-chart-bar-1" />
      <rect x="10.5" y="9" width="3" height="11" rx="0.5" fill="currentColor" stroke="none" className="vv-icon-chart-bar vv-icon-chart-bar-2" />
      <rect x="16" y="5" width="3" height="15" rx="0.5" fill="currentColor" stroke="none" className="vv-icon-chart-bar vv-icon-chart-bar-3" />
      <polyline points="6.5,14 12,9 17.5,5" strokeWidth="1.3" className="vv-icon-chart-trend" />
    </NavIconBase>
  );
}

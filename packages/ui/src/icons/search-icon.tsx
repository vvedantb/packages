import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Magnifying glass that scans with a lens glint on hover. */
export function SearchIcon({ strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1200}>
      <g className="vv-icon-search">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <line x1="15.2" y1="15.2" x2="20.5" y2="20.5" />
        <circle cx="8.6" cy="8.6" r="1.1" fill="currentColor" stroke="none" className="vv-icon-search-glint" />
      </g>
    </NavIconBase>
  );
}

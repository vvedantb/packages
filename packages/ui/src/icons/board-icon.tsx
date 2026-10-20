import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Three-column board; cards drop in and a card travels across on hover. */
export function BoardIcon({ strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1800}>
      <rect x="3" y="3.5" width="5.5" height="17" rx="1.4" />
      <rect x="9.25" y="3.5" width="5.5" height="11" rx="1.4" />
      <rect x="15.5" y="3.5" width="5.5" height="14" rx="1.4" />
      <rect x="4.4" y="5" width="2.7" height="2.2" rx="0.4" fill="currentColor" stroke="none" className="vv-icon-board-card vv-icon-board-card-1" />
      <rect x="10.65" y="5" width="2.7" height="2.2" rx="0.4" fill="currentColor" stroke="none" className="vv-icon-board-card vv-icon-board-card-2" />
      <rect x="16.9" y="5" width="2.7" height="2.2" rx="0.4" fill="currentColor" stroke="none" className="vv-icon-board-card vv-icon-board-card-3" />
      <rect x="4.4" y="9" width="2.7" height="1.5" rx="0.4" fill="currentColor" stroke="none" className="vv-icon-board-traveler" />
    </NavIconBase>
  );
}

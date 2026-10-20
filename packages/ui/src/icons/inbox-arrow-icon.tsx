import { NavIconBase, cutoutStyle, type CutoutIconProps } from "./nav-icon-base";

/** Tray with an arrow dropping in and a notification dot. Solid while `active`. */
export function InboxArrowIcon({ strokeWidth = 1.75, cutoutColor, ...props }: CutoutIconProps) {
  const { active } = props;
  const cutoutStroke = cutoutStyle(active, "stroke", cutoutColor);
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1100}>
      <path d="M3 13.5l3-7.5h12l3 7.5v5.5A2 2 0 0 1 19 21H5a2 2 0 0 1-2-2z" fill={active ? "currentColor" : "none"} />
      <path d="M3 13.5h5.2l1 2h5.6l1-2H21" style={cutoutStroke} />
      <g className="vv-icon-inbox-arrow">
        {/* The arrow dips into the tray; a cut-out halo keeps it legible against the solid body. */}
        {active ? (
          <g strokeWidth={4} style={cutoutStroke}>
            <line x1="12" y1="2.5" x2="12" y2="8" />
            <polyline points="9.6,5.6 12,8 14.4,5.6" />
          </g>
        ) : null}
        <line x1="12" y1="2.5" x2="12" y2="8" />
        <polyline points="9.6,5.6 12,8 14.4,5.6" />
      </g>
      <circle cx="18.5" cy="4" r="1.4" fill="currentColor" stroke="none" className="vv-icon-inbox-notif" />
    </NavIconBase>
  );
}

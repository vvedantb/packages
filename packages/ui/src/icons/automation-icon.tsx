import { NavIconBase, cutoutStyle, type CutoutIconProps } from "./nav-icon-base";

/** Dashed orbit around a play button; the orbit spins and sparks burst on hover. Solid while `active`. */
export function AutomationIcon({ strokeWidth = 1.75, cutoutColor, ...props }: CutoutIconProps) {
  const { active } = props;
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1800}>
      <circle cx="12" cy="12" r="9" strokeDasharray="2.5 3.5" className="vv-icon-automation-orbit" />
      {/* Filling the dashed orbit itself reads as a cog; a disc inside it keeps the orbit's silhouette. */}
      {active ? <circle cx="12" cy="12" r="6.5" fill="currentColor" stroke="none" /> : null}
      <g className="vv-icon-automation-sparks">
        <line x1="3.7" y1="3.7" x2="2.2" y2="2.2" />
        <line x1="20.3" y1="3.7" x2="21.8" y2="2.2" />
        <line x1="3.7" y1="20.3" x2="2.2" y2="21.8" />
        <line x1="20.3" y1="20.3" x2="21.8" y2="21.8" />
      </g>
      <path
        d="M10.4 8.6v6.8l5.6-3.4z"
        fill="currentColor"
        stroke="none"
        className="vv-icon-automation-play"
        style={cutoutStyle(active, "fill", cutoutColor)}
      />
    </NavIconBase>
  );
}

import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Flask that sloshes while bubbles rise on hover. */
export function FlaskIcon({ strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1400}>
      <g className="vv-icon-flask">
        <path d="M9 3h6" />
        <path d="M10 3v6.4L5.4 18A2 2 0 0 0 7.2 21h9.6a2 2 0 0 0 1.8-3l-4.6-8.6V3" />
      </g>
      <circle cx="11" cy="17.5" r="0.7" fill="currentColor" stroke="none" className="vv-icon-flask-bubble vv-icon-flask-bubble-1" />
      <circle cx="13.5" cy="15.5" r="0.55" fill="currentColor" stroke="none" className="vv-icon-flask-bubble vv-icon-flask-bubble-2" />
      <circle cx="12.4" cy="19" r="0.45" fill="currentColor" stroke="none" className="vv-icon-flask-bubble vv-icon-flask-bubble-3" />
      <circle cx="14.6" cy="18" r="0.4" fill="currentColor" stroke="none" className="vv-icon-flask-bubble vv-icon-flask-bubble-4" />
    </NavIconBase>
  );
}

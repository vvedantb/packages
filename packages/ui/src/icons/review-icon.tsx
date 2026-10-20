import { NavIconBase, type IconProps } from "./nav-icon-base";

/**
 * Circle with a check and a line. The marks take the document line animation
 * without `vv-icon-document-line`, so they scale from the svg origin, not their own box.
 */
export function ReviewIcon({ strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1500}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 12.5 11.2 14.2 14.8 10" className="vv-icon-document-line-1" />
      <path d="M8 7.5h8" className="vv-icon-document-line-2" />
    </NavIconBase>
  );
}

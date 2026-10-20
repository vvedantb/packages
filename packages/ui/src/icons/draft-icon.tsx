import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Page with a dashed line and a pencil nib. Shares the document animation. */
export function DraftIcon({ strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1500}>
      <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h11a1.5 1.5 0 0 0 1.5-1.5V8.5z" />
      <path d="M14 3v4.5a1 1 0 0 0 1 1h4.5" className="vv-icon-document-corner" />
      <line x1="9" y1="12" x2="16" y2="12" className="vv-icon-document-line vv-icon-document-line-1" />
      <line x1="9" y1="15" x2="13" y2="15" className="vv-icon-document-line vv-icon-document-line-2" strokeDasharray="1.5 1.5" />
      {/* Pencil nib (not animated) */}
      <g className="vv-icon-draft-pencil">
        <path d="M16.5 16.5l1.5-1.5 1.2 1.2-1.5 1.5z" fill="currentColor" stroke="none" />
        <path d="M16.5 16.5l-0.8 2.3 2.3-0.8z" fill="currentColor" stroke="none" />
      </g>
    </NavIconBase>
  );
}

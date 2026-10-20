import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Page with a folded corner; lines draw on hover. */
export function DocumentIcon({ strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1500}>
      <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h11a1.5 1.5 0 0 0 1.5-1.5V8.5z" />
      <path d="M14 3v4.5a1 1 0 0 0 1 1h4.5" className="vv-icon-document-corner" />
      <line x1="9" y1="12" x2="16" y2="12" className="vv-icon-document-line vv-icon-document-line-1" />
      <line x1="9" y1="15" x2="16" y2="15" className="vv-icon-document-line vv-icon-document-line-2" />
      <line x1="9" y1="18" x2="13" y2="18" className="vv-icon-document-line vv-icon-document-line-3" />
    </NavIconBase>
  );
}

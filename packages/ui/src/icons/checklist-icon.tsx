import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Two checkboxes with task lines; checks redraw and rings burst on hover. */
export function ChecklistIcon({ strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1600}>
      <rect x="3" y="4" width="6" height="6" rx="1.2" />
      <rect x="3" y="14" width="6" height="6" rx="1.2" />
      <rect x="3" y="4" width="6" height="6" rx="1.2" className="vv-icon-checklist-ring vv-icon-checklist-ring-1" />
      <rect x="3" y="14" width="6" height="6" rx="1.2" className="vv-icon-checklist-ring vv-icon-checklist-ring-2" />
      <line x1="11" y1="7" x2="20" y2="7" className="vv-icon-checklist-line vv-icon-checklist-line-1" />
      <line x1="11" y1="17" x2="18" y2="17" className="vv-icon-checklist-line vv-icon-checklist-line-2" />
      <path d="M4.4 7.1l1.5 1.5 2.4-2.6" className="vv-icon-checklist-check vv-icon-checklist-check-1" />
      <path d="M4.4 17.1l1.5 1.5 2.4-2.6" className="vv-icon-checklist-check vv-icon-checklist-check-2" />
    </NavIconBase>
  );
}

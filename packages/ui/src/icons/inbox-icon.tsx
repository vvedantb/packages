import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Tray with a letter dropping in on hover. */
export function InboxIcon({ strokeWidth = 1.7, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.15" loop={1300}>
      <rect className="vv-icon-inbox-letter" x="9" y="8" width="6" height="4" rx="0.5" fill="currentColor" stroke="none" />
      <path d="M4 13l2 -8a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1l2 8" />
      <path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1 -1v-6" />
      <path d="M4 13h4l1 2h6l1 -2h4" />
    </NavIconBase>
  );
}

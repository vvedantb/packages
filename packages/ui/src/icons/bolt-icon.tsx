import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Lightning bolt that flashes on hover. */
export function BoltIcon({ strokeWidth = 1.7, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.15" loop={900}>
      <path className="vv-icon-bolt" d="M13 3L4 14h7l-1 7l9 -11h-7l1 -7z" />
    </NavIconBase>
  );
}

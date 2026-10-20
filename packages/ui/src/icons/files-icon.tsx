import { NavIconBase, type IconProps } from "./nav-icon-base";

/** Two stacked files; the back one slides out on hover. */
export function FilesIcon({ strokeWidth = 1.7, ...props }: IconProps) {
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.15" loop={1400}>
      <g className="vv-icon-files-back">
        <path d="M10 4h6l3 3v9a1.5 1.5 0 0 1 -1.5 1.5h-7.5a1.5 1.5 0 0 1 -1.5 -1.5v-10.5a1.5 1.5 0 0 1 1.5 -1.5z" />
        <path d="M16 4v3h3" />
      </g>
      <g>
        <path d="M6.5 8h6l3 3v9a1.5 1.5 0 0 1 -1.5 1.5h-7.5a1.5 1.5 0 0 1 -1.5 -1.5v-10.5a1.5 1.5 0 0 1 1.5 -1.5z" />
        <path d="M12.5 8v3h3" />
      </g>
    </NavIconBase>
  );
}

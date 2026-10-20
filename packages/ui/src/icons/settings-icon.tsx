import { NavIconBase, type IconProps } from "./nav-icon-base";

export type SettingsIconProps = IconProps & {
  /**
   * `"spin"` (default): continuous 2.5s linear spin, stroke 1.7, springy 1.15 hover scale.
   * `"turn"`: a gear drawn hub first that clicks round one tooth (60deg) at a time over 2.4s,
   * stroke 1.75, eased 1.12 hover scale like the other 1.75-stroke icons.
   */
  variant?: "spin" | "turn";
};

/** Gear that spins on hover, or turns one notch at a time with `variant="turn"`. */
export function SettingsIcon({ variant = "spin", strokeWidth, ...props }: SettingsIconProps) {
  if (variant === "turn") {
    return (
      <NavIconBase {...props} strokeWidth={strokeWidth ?? 1.75} hoverScale="1.12" loop={2400}>
        <g className="vv-icon-gear-turn">
          <circle cx="12" cy="12" r="3" />
          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065" />
        </g>
      </NavIconBase>
    );
  }
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth ?? 1.7} hoverScale="1.15" loop={2500}>
      <g className="vv-icon-gear">
        <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
        <circle cx="12" cy="12" r="3" />
      </g>
    </NavIconBase>
  );
}

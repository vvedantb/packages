import { useId, type CSSProperties, type ReactNode, type SVGProps } from "react";
import { cn } from "../utils/cn";

/** `"hover"`: animate while an ancestor with the `group` class is hovered. `true`: always. `false`: never. */
export type IconAnimate = boolean | "hover";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children" | "color" | "height" | "width" | "strokeWidth"> & {
  /** Width and height. Default 20. */
  size?: number | string;
  /** Sets the svg's CSS `color`, which every `currentColor` part follows. Default `currentColor` (no inline colour). */
  color?: string;
  /** Default: the icon's own stroke (1.7 or 1.75). Shapes with their own stroke width keep it. */
  strokeWidth?: number | string;
  /** Accessible name. Without it the icon is `aria-hidden`. */
  title?: string;
  /** Default `"hover"`. */
  animate?: IconAnimate;
  /** Solid variant on icons that have one; elsewhere only sets `data-active`. */
  active?: boolean;
  /** Length in ms of the icon's longest loop. Every other duration and delay in the icon scales with it. */
  duration?: number;
};

/** Icons with a solid `active` variant. Inner details are painted in `cutoutColor`. */
export type CutoutIconProps = IconProps & {
  /** Tone of the cut-out details while `active`. Default: the sidebar accent colour. */
  cutoutColor?: string;
};

export type NavIconBaseProps = IconProps & {
  children: ReactNode;
  /** Root scale on group hover: `"1.15"` springs, `"1.12"` eases out. */
  hoverScale: "1.15" | "1.12";
  /** The icon's longest loop in ms, which `duration` replaces. */
  loop: number;
};

type IconStyle = CSSProperties & { "--vv-icon-duration-scale"?: number };

const CUTOUT_TONE = "var(--color-sidebar-accent, var(--sidebar-accent))";

/** Inline stroke or fill for a cut-out detail while active, so it reads as a hole in the solid shape. */
export function cutoutStyle(
  active: boolean | undefined,
  kind: "stroke" | "fill",
  cutoutColor: string | undefined,
): CSSProperties | undefined {
  if (!active) return undefined;
  const tone = cutoutColor ?? CUTOUT_TONE;
  return kind === "stroke" ? { stroke: tone } : { fill: tone };
}

/** The 24x24 stroked svg every nav icon renders. Animation lives in `tokens/css/nav-icons.css`. */
export function NavIconBase({
  size = 20,
  color,
  strokeWidth,
  className,
  style,
  title,
  animate = "hover",
  active,
  duration,
  hoverScale,
  loop,
  children,
  ...rest
}: NavIconBaseProps) {
  const titleId = useId();
  const iconStyle: IconStyle = { ...style };
  if (color !== undefined && color !== "currentColor") iconStyle.color = color;
  if (duration !== undefined && duration > 0) iconStyle["--vv-icon-duration-scale"] = duration / loop;
  return (
    <svg
      {...rest}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("vv-icon", className)}
      style={Object.keys(iconStyle).length > 0 ? iconStyle : undefined}
      data-animate={String(animate)}
      data-hover-scale={hoverScale}
      data-active={active ? "true" : undefined}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {children}
    </svg>
  );
}

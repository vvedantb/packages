import { useId, type SVGProps } from "react";
import { APP_MARKS, APP_MARK_VIEWBOX, MARK_VIEWBOX, TILE_RADIUS, markAspect, markLinecap, markStrokeWidth, type AppMarkVariant, type AppName } from "./svg";

export type AppMarkProps = Omit<SVGProps<SVGSVGElement>, "children" | "height" | "width" | "viewBox"> & {
  /** Which family app's mark to draw. */
  app: AppName;
  /** `"mark"` (default): plain logo in `currentColor`, cropped tight to the glyph with no padding. `"tile"`: white glyph on a black rounded tile. `"tile-light"`: black glyph on a white tile. */
  variant?: AppMarkVariant;
  /**
   * Default 24. For `"mark"` it sets the rendered height and the width follows the glyph's aspect ratio
   * (a number gives an exact width; a string sets both to the same value and the glyph is centred).
   * Tiles are always square, `size` by `size`.
   */
  size?: number | string;
  /** Accessible name. Without it the mark is `aria-hidden`. */
  title?: string;
};

const TILE_TONES = {
  tile: { bg: "#000", fg: "#fff" },
  "tile-light": { bg: "#fff", fg: "#000" },
} as const;

/** One of the six family app marks. The plain mark is cropped tight; tiles use the padded 1024 grid. */
export function AppMark({ app, variant = "mark", size = 24, title, ...rest }: AppMarkProps) {
  const titleId = useId();
  const { kind, paths } = APP_MARKS[app];
  const isMark = variant === "mark";
  const width = isMark && typeof size === "number" ? Math.round(size * markAspect(app) * 100) / 100 : size;
  const tone = variant === "mark" ? undefined : TILE_TONES[variant];
  const color = tone?.fg ?? "currentColor";
  const glyphProps =
    kind === "fill"
      ? { fill: color }
      : { fill: "none", stroke: color, strokeWidth: markStrokeWidth(app), strokeLinecap: markLinecap(app), strokeLinejoin: "round" };
  const glyph = (
    <g {...(glyphProps as SVGProps<SVGGElement>)} data-glyph={app}>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
  return (
    <svg
      {...rest}
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={size}
      viewBox={isMark ? APP_MARK_VIEWBOX[app] : MARK_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      data-app={app}
      data-variant={variant}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {tone ? <rect width={1024} height={1024} rx={TILE_RADIUS} fill={tone.bg} /> : null}
      {glyph}
    </svg>
  );
}

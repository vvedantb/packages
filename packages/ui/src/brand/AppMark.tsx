import { useId, type SVGProps } from "react";
import { APP_MARKS, MARK_STROKE_WIDTH, MARK_VIEWBOX, TILE_RADIUS, type AppMarkVariant, type AppName } from "./svg";

export type AppMarkProps = Omit<SVGProps<SVGSVGElement>, "children" | "height" | "width" | "viewBox"> & {
  /** Which family app's mark to draw. */
  app: AppName;
  /** `"mark"` (default): glyph in `currentColor`. `"tile"`: white glyph on a black rounded tile. `"tile-light"`: black glyph on a white tile. */
  variant?: AppMarkVariant;
  /** Width and height. Default 24. */
  size?: number | string;
  /** Accessible name. Without it the mark is `aria-hidden`. */
  title?: string;
};

const TILE_TONES = {
  tile: { bg: "#000", fg: "#fff" },
  "tile-light": { bg: "#fff", fg: "#000" },
} as const;

/** One of the six family app marks on the 1024 grid. */
export function AppMark({ app, variant = "mark", size = 24, title, ...rest }: AppMarkProps) {
  const titleId = useId();
  const { kind, paths } = APP_MARKS[app];
  const tone = variant === "mark" ? undefined : TILE_TONES[variant];
  const color = tone?.fg ?? "currentColor";
  const glyphProps =
    kind === "fill"
      ? { fill: color }
      : { fill: "none", stroke: color, strokeWidth: MARK_STROKE_WIDTH, strokeLinecap: "round", strokeLinejoin: "round" };
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
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
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

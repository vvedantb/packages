import { useId, type SVGProps } from "react";
import { APP_ICONS } from "./AppIcons";
import { APP_MARKS, MARK_VIEWBOX, TILE_RADIUS, markLinecap, markStrokeWidth, type AppMarkVariant, type AppName } from "./svg";

export type AppMarkProps = Omit<SVGProps<SVGSVGElement>, "children" | "height" | "width" | "viewBox"> & {
  /** Which family app's mark to draw. */
  app: AppName;
  /** `"mark"` (default): plain logo in `currentColor` on an equalised square viewBox, so every app looks the same size. `"tile"`: white glyph on a black rounded tile. `"tile-light"`: black glyph on a white tile. */
  variant?: AppMarkVariant;
  /**
   * Default 24. Sets both width and height, for marks and tiles alike (always square). A string is any CSS length.
   */
  size?: number | string;
  /** Accessible name. Without it the mark is `aria-hidden`. */
  title?: string;
};

const TILE_TONES = {
  tile: { bg: "#000", fg: "#fff" },
  "tile-light": { bg: "#fff", fg: "#000" },
} as const;

/**
 * One of the six family app marks. The plain mark uses an equalised square viewBox; tiles use the padded 1024 grid.
 * @deprecated Use the per-app `Icon*` components (or `APP_ICONS[app]`) for plain marks. Tiles are for app and store icons only.
 */
export function AppMark({ app, variant = "mark", size = 24, title, ...rest }: AppMarkProps) {
  const titleId = useId();
  if (variant === "mark") {
    const Icon = APP_ICONS[app];
    return <Icon {...rest} size={size} title={title} data-variant="mark" />;
  }
  const { kind, paths } = APP_MARKS[app];
  const tone = TILE_TONES[variant];
  const color = tone.fg;
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
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      data-app={app}
      data-variant={variant}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <rect width={1024} height={1024} rx={TILE_RADIUS} fill={tone.bg} />
      {glyph}
    </svg>
  );
}

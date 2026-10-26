import { forwardRef, useId, type ForwardRefExoticComponent, type RefAttributes, type SVGProps } from "react";
import { APP_MARKS, APP_MARK_VIEWBOX, APP_MARK_VIEWBOX_START, APP_NAMES, markLinecap, markStrokeWidth, type AppName } from "./svg";

export type AppIconProps = Omit<SVGProps<SVGSVGElement>, "children" | "height" | "width" | "viewBox" | "stroke" | "color"> & {
  /** Rendered width and height (the glyph is square). Default 24. A number is in pixels; a string is any CSS length. */
  size?: number | string;
  /** Glyph colour, for fill and stroke glyphs. Default `"currentColor"`. */
  color?: string;
  /** Stroke width in rendered pixels, for stroke glyphs (Tabler style, for example `1.5`). Default: the glyph's own weight. Fill glyphs ignore it. */
  stroke?: number | string;
  /** Accessible name. Without it the icon is `aria-hidden`. */
  title?: string;
  /** Where the glyph sits in its equal-size square. `"center"` (default) centres it. `"start"` left-aligns the glyph's ink in the same square, so labels line up in a vertical list. The rendered box stays `size` x `size`. */
  align?: "center" | "start";
};

export type AppIconComponent = ForwardRefExoticComponent<AppIconProps & RefAttributes<SVGSVGElement>>;

function viewBoxSide(app: AppName): number {
  return Number(APP_MARK_VIEWBOX[app].split(" ")[3]);
}

function createAppIcon(app: AppName, displayName: string): AppIconComponent {
  const Icon = forwardRef<SVGSVGElement, AppIconProps>(function Icon(
    { size = 24, color = "currentColor", stroke, title, align = "center", ...rest },
    ref,
  ) {
    const titleId = useId();
    const { kind, paths } = APP_MARKS[app];
    const renderedSize = typeof size === "number" ? size : 24;
    const strokeWidth = stroke === undefined ? markStrokeWidth(app) : Number(stroke) * (viewBoxSide(app) / renderedSize);
    const glyphProps =
      kind === "fill"
        ? { fill: color }
        : { fill: "none", stroke: color, strokeWidth, strokeLinecap: markLinecap(app), strokeLinejoin: "round" };
    return (
      <svg
        {...rest}
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={align === "start" ? APP_MARK_VIEWBOX_START[app] : APP_MARK_VIEWBOX[app]}
        preserveAspectRatio="xMidYMid meet"
        data-app={app}
        data-align={align}
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
        aria-labelledby={title ? titleId : undefined}
      >
        {title ? <title id={titleId}>{title}</title> : null}
        <g {...(glyphProps as SVGProps<SVGGElement>)} data-glyph={app}>
          {paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>
    );
  });
  Icon.displayName = displayName;
  return Icon;
}

const iconName = (app: AppName) => `Icon${app === "projectv" ? "ProjectV" : app[0]!.toUpperCase() + app.slice(1)}`;

/** Plain app glyph components by app name, for dynamic lookup. */
export const APP_ICONS = Object.fromEntries(APP_NAMES.map((app) => [app, createAppIcon(app, iconName(app))])) as Record<AppName, AppIconComponent>;

export const IconVibot = APP_ICONS.vibot;
export const IconVhub = APP_ICONS.vhub;
export const IconVmem = APP_ICONS.vmem;
export const IconVerve = APP_ICONS.verve;
export const IconVelth = APP_ICONS.velth;
export const IconProjectV = APP_ICONS.projectv;

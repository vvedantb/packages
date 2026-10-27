import type { StyleProp, ViewStyle } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import {
  APP_MARKS,
  APP_MARK_VIEWBOX,
  APP_MARK_VIEWBOX_START,
  APP_NAMES,
  markLinecap,
  markStrokeWidth,
  type AppName,
} from "./svg";

export type AppIconProps = {
  /** Rendered width and height in points (the glyph is square). Default 24. */
  size?: number;
  /** Glyph colour, for fill and stroke glyphs. Default the scheme's `tokens.color.foreground`. */
  color?: string;
  /** Stroke width in rendered points, for stroke glyphs. Default: the glyph's own weight. Fill glyphs ignore it. */
  stroke?: number;
  /** Accessible name. Without it the icon is hidden from assistive tech. */
  title?: string;
  /** `"center"` (default) centres the glyph in its square. `"start"` left-aligns its ink, for vertical lists. */
  align?: "center" | "start";
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export type AppIconComponent = ((props: AppIconProps) => React.JSX.Element) & {
  displayName?: string;
};

function viewBoxSide(app: AppName): number {
  return Number(APP_MARK_VIEWBOX[app].split(" ")[3]);
}

function createAppIcon(app: AppName, displayName: string): AppIconComponent {
  function Icon({
    size = 24,
    color,
    stroke,
    title,
    align = "center",
    testID,
    style,
  }: AppIconProps) {
    const scheme = useScheme();
    const fill = color ?? tokens.color.foreground[scheme];
    const { kind, paths } = APP_MARKS[app];
    const strokeWidth =
      stroke === undefined
        ? markStrokeWidth(app)
        : stroke * (viewBoxSide(app) / size);
    const glyphProps =
      kind === "fill"
        ? { fill }
        : {
            fill: "none",
            stroke: fill,
            strokeWidth,
            strokeLinecap: markLinecap(app),
            strokeLinejoin: "round" as const,
          };
    return (
      <Svg
        width={size}
        height={size}
        viewBox={
          align === "start" ? APP_MARK_VIEWBOX_START[app] : APP_MARK_VIEWBOX[app]
        }
        preserveAspectRatio="xMidYMid meet"
        accessible={Boolean(title)}
        accessibilityRole={title ? "image" : undefined}
        accessibilityLabel={title}
        accessibilityElementsHidden={!title}
        importantForAccessibility={title ? "auto" : "no-hide-descendants"}
        testID={testID}
        style={style}
      >
        <G {...glyphProps}>
          {paths.map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>
      </Svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

const iconName = (app: AppName) =>
  `Icon${app === "projectv" ? "ProjectV" : app[0]!.toUpperCase() + app.slice(1)}`;

/** Plain app glyph components by app name, for dynamic lookup. Same paths and viewBoxes as the web `APP_ICONS`. */
export const APP_ICONS = Object.fromEntries(
  APP_NAMES.map((app) => [app, createAppIcon(app, iconName(app))]),
) as Record<AppName, AppIconComponent>;

export const IconVibot = APP_ICONS.vibot;
export const IconVhub = APP_ICONS.vhub;
export const IconVmem = APP_ICONS.vmem;
export const IconVerve = APP_ICONS.verve;
export const IconVelth = APP_ICONS.velth;
export const IconProjectV = APP_ICONS.projectv;

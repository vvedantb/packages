import type { StyleProp, ViewStyle } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";
import { APP_ICONS } from "./AppIcons";
import {
  APP_MARKS,
  MARK_VIEWBOX,
  TILE_RADIUS,
  markLinecap,
  markStrokeWidth,
  type AppMarkVariant,
  type AppName,
} from "./svg";

export type AppMarkProps = {
  /** Which family app's mark to draw. */
  app: AppName;
  /** `"mark"` (default): the plain `APP_ICONS` glyph. `"tile"`: white glyph on a black rounded tile. `"tile-light"`: black glyph on a white tile. */
  variant?: AppMarkVariant;
  /** Width and height in points. Default 24. */
  size?: number;
  /** Accessible name. Without it the mark is hidden from assistive tech. */
  title?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const TILE_TONES = {
  tile: { bg: "#000", fg: "#fff" },
  "tile-light": { bg: "#fff", fg: "#000" },
} as const;

/**
 * One of the six family app marks, as on the web `AppMark`. Tiles share the
 * 1024 grid with the plain mark, so a bare glyph matches the tile glyph.
 * Prefer `APP_ICONS[app]` for plain marks; tiles are for app icons only.
 */
export function AppMark({
  app,
  variant = "mark",
  size = 24,
  title,
  testID,
  style,
}: AppMarkProps) {
  if (variant === "mark") {
    const Icon = APP_ICONS[app];
    return <Icon size={size} title={title} testID={testID} style={style} />;
  }
  const { kind, paths } = APP_MARKS[app];
  const tone = TILE_TONES[variant];
  const glyphProps =
    kind === "fill"
      ? { fill: tone.fg }
      : {
          fill: "none",
          stroke: tone.fg,
          strokeWidth: markStrokeWidth(app),
          strokeLinecap: markLinecap(app),
          strokeLinejoin: "round" as const,
        };
  return (
    <Svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      accessible={Boolean(title)}
      accessibilityRole={title ? "image" : undefined}
      accessibilityLabel={title}
      accessibilityElementsHidden={!title}
      importantForAccessibility={title ? "auto" : "no-hide-descendants"}
      testID={testID}
      style={style}
    >
      <Rect width={1024} height={1024} rx={TILE_RADIUS} fill={tone.bg} />
      <G {...glyphProps}>
        {paths.map((d) => (
          <Path key={d} d={d} />
        ))}
      </G>
    </Svg>
  );
}

// `svg.ts`, `familyApps.ts` and `vProAppBenefits.ts` are byte-identical copies of
// `@vvedantb/ui` `src/brand/` (pure data, no imports beyond each other). A test
// in this package fails when they differ: change both together.
export { APP_ICONS, IconProjectV, IconVelth, IconVerve, IconVhub, IconVibot, IconVmem } from "./AppIcons";
export type { AppIconComponent, AppIconProps } from "./AppIcons";
export { AppMark } from "./AppMark";
export type { AppMarkProps } from "./AppMark";
export { AppWordmark } from "./AppWordmark";
export type { AppWordmarkProps, ProductAppName } from "./AppWordmark";
export {
  APP_MARKS,
  APP_MARK_CROP_VIEWBOX,
  APP_MARK_VIEWBOX,
  APP_MARK_VIEWBOX_START,
  PROJECTV_MARK_VIEWBOX,
  APP_MARK_SVG,
  APP_NAMES,
  APP_TILE_LIGHT_SVG,
  APP_TILE_SVG,
  appAdaptiveSvg,
  appExtension128Svg,
  appMarkSvg,
  appTileSvg,
  markAspect,
  markBBox,
  markLinecap,
  markStrokeWidth,
  pathBBox,
} from "./svg";
export type { AppMarkVariant, AppName, MarkShape } from "./svg";
export { FAMILY_APPS, familyApp } from "./familyApps";
export type { FamilyApp } from "./familyApps";
export { V_PRO_APP_BENEFITS } from "./vProAppBenefits";
export type { PricingPlanAppBenefit } from "./vProAppBenefits";

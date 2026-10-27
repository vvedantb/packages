/**
 * Colours for `Button`, `Input`, `Textarea`, the `Select` trigger, `Switch`,
 * `Checkbox`, `Tabs`, `Card` and component text, taken from `palette` and
 * `tokens` instead of NativeWind theme keys (`bg-primary`, `bg-input`,
 * `text-foreground`) that apps do not define, or define without a dark value.
 * Also text weights as styles, and the touch-target maths. No React Native
 * import, so the tests can load this file.
 */
import { palette, withAlpha } from "./palette";
import { tokens } from "./tokens";

type Scheme = "light" | "dark";

/**
 * `primary` and `default` are the same (`default` is the web name). `outline`
 * is the web bordered neutral button. `tinted` is the pink tint that `outline`
 * drew before 0.3.0.
 */
export type ButtonVariant =
  | "primary"
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "ghost"
  | "link"
  | "tinted";

export type ButtonColors = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

/**
 * Fill, border and label colour per variant, from the web classes
 * (`bg-primary text-primary-foreground`, `bg-default text-default-foreground`
 * and so on). `null` for `tinted`, which keeps its pink NativeWind classes.
 */
export function buttonColors(variant: ButtonVariant, scheme: Scheme): ButtonColors | null {
  const none = "transparent";
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: palette.default[scheme],
        borderColor: none,
        color: palette.defaultForeground[scheme],
      };
    case "outline":
      return {
        backgroundColor: none,
        borderColor: tokens.color.border[scheme],
        color: tokens.color.foreground[scheme],
      };
    case "destructive":
      return { backgroundColor: palette.destructive, borderColor: none, color: tokens.color.white };
    case "ghost":
      return { backgroundColor: none, borderColor: none, color: tokens.color.muted[scheme] };
    case "link":
      return { backgroundColor: none, borderColor: none, color: palette.primary[scheme] };
    case "tinted":
      return null;
    default:
      return {
        backgroundColor: palette.primary[scheme],
        borderColor: none,
        color: palette.primaryForeground[scheme],
      };
  }
}

/**
 * The web field look (`rounded-field border border-border bg-field-background`),
 * radius 10 as on the web. A flat object: on web the `Select` trigger is a
 * Radix slot, which spreads `style` and so drops arrays.
 */
export function fieldStyle(scheme: Scheme) {
  return {
    backgroundColor: tokens.color.surface[scheme],
    borderColor: tokens.color.border[scheme],
    borderRadius: tokens.radius.field,
  };
}

/** Text on `fieldStyle`. From the same scheme as the fill, so the two cannot disagree. */
export function fieldTextStyle(scheme: Scheme) {
  return textStyle("foreground", scheme);
}

/**
 * `foreground` and `muted` are the web `text-foreground` and
 * `text-muted-foreground`; `overlayMuted` is the web `DialogDescription`.
 */
export type TextTone = "foreground" | "muted" | "overlayMuted";

/**
 * Text colour as a style. Where an app defines the NativeWind `foreground` key
 * with a nested `dark` shade, `text-foreground` keeps the light value in dark
 * mode, so class-coloured text was near-black on dark surfaces.
 */
export function textStyle(tone: TextTone, scheme: Scheme) {
  return {
    color: tone === "overlayMuted" ? palette.overlayMuted[scheme] : tokens.color[tone][scheme],
  };
}

/** The web `font-medium` and `font-semibold`. */
export type TypeWeight = "medium" | "semibold";

const FONT_WEIGHT = { medium: "500", semibold: "600" } as const;

/**
 * Font weight as a style, set beside the `font-instrument-sans-*` class with
 * the same weight. Expo web and many apps map every one of those classes to
 * the one `Instrument Sans` family with no weight, so the class alone draws
 * Regular. There is no `bold`: the web titles are semibold, and on Android 700
 * can add a synthetic bold to a face that is already bold.
 */
export function typeStyle(weight: TypeWeight) {
  return { fontWeight: FONT_WEIGHT[weight] };
}

/**
 * The web `Card` root (`rounded-lg bg-surface-card`): a flat fill at radius 16,
 * with no border and no shadow. Also `SettingsSection`. A flat object, like
 * `fieldStyle`.
 */
export function cardStyle(scheme: Scheme) {
  return {
    backgroundColor: tokens.color.surfaceCard[scheme],
    borderRadius: tokens.radius.lg,
  };
}

/** The smallest touch target on a phone, in points (Apple's 44; Material asks 48). */
export const MIN_TOUCH_TARGET = 44;

/**
 * `hitSlop` that makes a control painted `width` × `height` points reach
 * `MIN_TOUCH_TARGET` on each axis, so it can keep the web size on screen. An
 * axis that is already large enough gets 0.
 */
export function touchSlop(width: number, height: number = width) {
  const pad = (size: number) => Math.max(0, Math.ceil((MIN_TOUCH_TARGET - size) / 2));
  const x = pad(width);
  const y = pad(height);
  return { top: y, bottom: y, left: x, right: x };
}

export type TabsVariant = "pills" | "segmented" | "soft";

export type TabColors = {
  backgroundColor: string;
  color: string;
};

/**
 * Fill and label colour of one tab, from the web tab variables
 * (`tabs-pills.css`). Unselected: no fill, `--muted` label. Selected: a
 * `--default` pill or a `--segment` segment with the `--segment-foreground`
 * label (the neutral primary, not the accent). `soft` is the web soft trigger
 * (`bg-surface-secondary text-foreground`). Fill and label come from one
 * scheme, so a selected label cannot match its fill.
 */
export function tabColors(variant: TabsVariant, selected: boolean, scheme: Scheme): TabColors {
  if (!selected) return { backgroundColor: "transparent", color: tokens.color.muted[scheme] };
  switch (variant) {
    case "segmented":
      return { backgroundColor: palette.segment[scheme], color: palette.segmentForeground[scheme] };
    case "soft":
      return {
        backgroundColor: tokens.color.surfaceSecondary[scheme],
        color: tokens.color.foreground[scheme],
      };
    default:
      return { backgroundColor: palette.default[scheme], color: palette.segmentForeground[scheme] };
  }
}

export type TabsSize = "default" | "sm";

/**
 * Trigger box and type for `TabsTrigger` and `PillTabs`. Without larger text
 * these are the web sizes: `pills` and `segmented` are the web `.t-tab` (30
 * high, `px-3 py-1`, `text-sm`), `soft` the web soft trigger (`px-4 py-2
 * text-sm`) and `sm` the web `sm` list (`px-2.5 py-1 text-xs`). With larger
 * text they are the 0.3.4 sizes. `minHeight` is a minimum, so a large Dynamic
 * Type size grows the trigger instead of clipping its label.
 */
export function tabTriggerSize(variant: TabsVariant, size: TabsSize, largerText: boolean) {
  if (largerText) {
    return size === "sm"
      ? { minHeight: 48, className: "px-4 py-2", textClassName: "text-lg" }
      : { minHeight: 56, className: "px-4 py-3", textClassName: "text-xl" };
  }
  if (size === "sm") return { minHeight: 30, className: "px-2.5 py-1", textClassName: "text-xs" };
  return variant === "soft"
    ? { minHeight: 36, className: "px-4 py-2", textClassName: "text-sm" }
    : { minHeight: 30, className: "px-3 py-1", textClassName: "text-sm" };
}

/** The segmented track, web `--tabs-bar-bg` (`--default`). */
export function tabTrackStyle(scheme: Scheme) {
  return { backgroundColor: palette.default[scheme] };
}

/**
 * Box and check colours, from the web `Checkbox` classes: `bg-field-background
 * border-border`, and `bg-primary border-primary text-primary-foreground` when
 * checked (also when indeterminate).
 */
export function checkboxColors(checked: boolean, scheme: Scheme) {
  return checked
    ? {
        backgroundColor: palette.primary[scheme],
        borderColor: palette.primary[scheme],
        color: palette.primaryForeground[scheme],
      }
    : {
        backgroundColor: tokens.color.surface[scheme],
        borderColor: tokens.color.border[scheme],
        color: palette.primaryForeground[scheme],
      };
}

/**
 * Track and thumb size classes, and the track size in points for the hit slop.
 * Without larger text it is the web `Switch`: a `h-5 w-9` track (20 × 36,
 * with a 1 border) and a `size-4` thumb that moves `translate-x-4`. With larger
 * text it is the 0.3.4 size. `justify-center` on the track centres the thumb.
 */
export function switchSize(largerText: boolean) {
  return largerText
    ? { track: "h-8 w-14", thumb: "h-7 w-7", on: "translate-x-6", width: 56, height: 32 }
    : { track: "h-5 w-9", thumb: "h-4 w-4", on: "translate-x-4", width: 36, height: 20 };
}

/**
 * Track and thumb colours, from the web `Switch` classes. The light off thumb
 * is white (web `bg-background`) so it shows on the grey track. Flat objects,
 * for the same reason as `fieldStyle`.
 */
export function switchColors(checked: boolean, scheme: Scheme) {
  if (checked) {
    return {
      track: { backgroundColor: palette.primary[scheme], borderColor: palette.primary[scheme] },
      thumb: { backgroundColor: palette.primaryForeground[scheme] },
    };
  }
  return scheme === "dark"
    ? {
        track: {
          backgroundColor: withAlpha(tokens.color.muted.dark, 0.4),
          borderColor: withAlpha(tokens.color.muted.dark, 0.6),
        },
        thumb: { backgroundColor: tokens.color.foreground.dark },
      }
    : {
        track: { backgroundColor: palette.default.light, borderColor: tokens.color.border.light },
        thumb: { backgroundColor: tokens.color.surface.light },
      };
}

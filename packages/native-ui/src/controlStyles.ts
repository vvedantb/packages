/**
 * Colours for `Button`, `Input`, `Textarea`, the `Select` trigger, `Switch`,
 * `Checkbox` and component text, taken from `palette` and `tokens` instead of
 * NativeWind theme keys (`bg-primary`, `bg-input`, `text-foreground`) that apps
 * do not define, or define without a dark value. No React Native import, so
 * the tests can load this file.
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

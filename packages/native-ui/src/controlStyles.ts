/**
 * Colours for `Button`, `Input`, `Textarea`, the `Select` trigger, `Switch`,
 * `Checkbox`, `Tabs`, `Card` and component text, taken from `palette` and
 * `tokens` instead of NativeWind theme keys (`bg-primary`, `bg-input`,
 * `text-foreground`) that apps do not define, or define without a dark value.
 * Also text weights and sizes as styles, the page title type, the
 * `SearchInput` metrics, the compact window test for dialogs and the
 * touch-target maths. No React Native import, so the tests can load this file.
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

/** Tailwind `text-*` sizes with their default line heights, in points. */
const TEXT_SIZE = {
  "text-xs": { fontSize: 12, lineHeight: 16 },
  "text-sm": { fontSize: 14, lineHeight: 20 },
  "text-base": { fontSize: 16, lineHeight: 24 },
  "text-lg": { fontSize: 18, lineHeight: 28 },
  "text-xl": { fontSize: 20, lineHeight: 28 },
  "text-2xl": { fontSize: 24, lineHeight: 32 },
} as const;

export type TextSize = keyof typeof TEXT_SIZE;

/** Tailwind `leading-tight` and `leading-snug`, as multiples of the size. */
const LEADING = { tight: 1.25, snug: 1.375 } as const;

/**
 * Font size and line height of a `text-*` class as a style, set beside the
 * class. On Expo web at 390 wide (0.3.6 gallery), `Button` labels with
 * `text-sm` measured 16, so the class alone does not always reach the text.
 * `"tight"` and `"snug"` are the Tailwind `leading-tight` (1.25 × the size)
 * and `leading-snug` (1.375 ×).
 */
export function sizeStyle(size: TextSize, leading?: "tight" | "snug") {
  const { fontSize, lineHeight } = TEXT_SIZE[size];
  return { fontSize, lineHeight: leading ? fontSize * LEADING[leading] : lineHeight };
}

/** Tailwind `tracking-tight`, in em. */
const TRACKING = { tight: -0.025 } as const;

/**
 * Letter spacing of a `tracking-*` class at `fontSize`, as a style in points.
 * React Native has no `em`: `tracking-tight` (-0.025em) at 20 is -0.5.
 */
export function trackingStyle(fontSize: number, tracking: keyof typeof TRACKING) {
  return { letterSpacing: fontSize * TRACKING[tracking] };
}

/**
 * The web page title, `text-xl font-semibold leading-tight tracking-tight` on
 * the `Breadcrumb` nav (`breadcrumb.tsx`), with the Instrument Sans semibold
 * face for `font-semibold`. `PageTitle` sets `pageTitleStyle()` beside it.
 */
export const PAGE_TITLE_CLASS = "font-instrument-sans-semibold text-xl leading-tight tracking-tight";

/**
 * `PAGE_TITLE_CLASS` as a style: Instrument Sans 600 at 20 / 25 with -0.5
 * letter spacing. On Android and Expo web the face class alone can draw
 * Regular (see `typeStyle`).
 */
export function pageTitleStyle() {
  const size = sizeStyle("text-xl", "tight");
  return { ...size, ...typeStyle("semibold"), ...trackingStyle(size.fontSize, "tight") };
}

/**
 * Height of the `PageHeader` row below the top inset, in points. A minimum,
 * so the title sits at the same height with or without an action, and still
 * grows with the system font size. Native only: the web title has no row.
 */
export const PAGE_HEADER_HEIGHT = 56;

/**
 * The web `COMPACT_OVERLAY_QUERY`, `(max-width: 639px), (max-height: 500px)`:
 * phones, and short landscape windows such as 844 × 390.
 */
export const COMPACT_OVERLAY = { maxWidth: 639, maxHeight: 500 } as const;

/** Whether a window of `width` × `height` points is compact: `DialogContent` is a bottom sheet there. */
export function isCompactOverlay(width: number, height: number) {
  return width <= COMPACT_OVERLAY.maxWidth || height <= COMPACT_OVERLAY.maxHeight;
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

export type SearchInputSize = "sm" | "md";

/**
 * Field, icon and clear-button metrics for `SearchInput`, in points. Without
 * larger text these are the web sizes (`search-input.tsx`, `clear-input.tsx`):
 * `sm` is `h-8 pl-8 text-sm` with the icon at `left-2`, `md` is `h-10 pl-9`
 * (the phone `text-base`) with the icon at `left-3`. Both have a 16 search
 * icon, the field `px-3.5` at the end, and the `h-6 w-6` clear button at
 * `right-2` with a 14 cross, for which a filled field reserves `pr-9`.
 * `height` locks the field at the web height, border included (the web
 * `h-8` and `h-10` are border-box), so the line height of the `text-*` class
 * cannot grow it. `SearchInput` scales it with the system font size
 * (`scaledFieldHeight`), so a large Dynamic Type size still grows the field.
 * The padding leaves room for the line inside the lock: `sm` pads 4 above and
 * below and `md` 7, not the web 8, because a native field adds its padding to
 * the line height (8 drew `md` 42 high on Expo web). With larger text both
 * sizes are the larger `Input` (64 high, `text-xl`), with a minimum height
 * and no lock.
 */
export function searchInputSize(size: SearchInputSize, largerText: boolean) {
  if (largerText) {
    return {
      minHeight: 64,
      height: undefined,
      paddingY: 16,
      paddingLeft: 48,
      paddingRight: 16,
      filledPaddingRight: 48,
      text: "text-xl",
      icon: 24,
      iconLeft: 16,
      clear: 32,
      clearIcon: 20,
      clearRight: 12,
    } as const;
  }
  const shared = {
    paddingRight: 14,
    filledPaddingRight: 36,
    icon: 16,
    clear: 24,
    clearIcon: 14,
    clearRight: 8,
  } as const;
  return size === "md"
    ? { ...shared, minHeight: 40, height: 40, paddingY: 7, paddingLeft: 36, text: "text-base", iconLeft: 12 } as const
    : { ...shared, minHeight: 32, height: 32, paddingY: 4, paddingLeft: 32, text: "text-sm", iconLeft: 8 } as const;
}

/**
 * A locked field height at the system font scale (`useWindowDimensions().fontScale`):
 * `height` up to a scale of 1, and `height` × the scale above it, as a web
 * `rem` height grows with the browser text size. `undefined` (no lock) stays
 * `undefined`.
 */
export function scaledFieldHeight(height: number | undefined, fontScale: number) {
  return height === undefined ? undefined : height * Math.max(1, fontScale);
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
 * Fill and label of the `FloatingTabBar` active pill. On the web the raised
 * `--segment` pill sits on a muted `--default` track. The floating bar is
 * already the raised surface (`tokens.color.fill`, near-white in light), so in
 * light the pill takes the muted track fill (`palette.default`), as a white
 * `--segment` pill would not show on it. In dark it keeps `--segment`
 * (`palette.segment`), lighter than the dark glass. The label is the
 * segmented `--tabs-text-active`, as `tabColors("segmented", true, scheme)`.
 */
export function floatingTabPillColors(scheme: Scheme): TabColors {
  return {
    backgroundColor: scheme === "light" ? palette.default.light : palette.segment.dark,
    color: tabColors("segmented", true, scheme).color,
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

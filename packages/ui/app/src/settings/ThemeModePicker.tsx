import { IconCheck, IconCircleHalf, IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";
import { ListEnter } from "../../../src/motion/list-enter";
import { cn } from "../cn.js";

/** A theme the picker can show. `neutral` is `.dark.neutral`. */
export type ThemeMode = "light" | "neutral" | "dark" | "system";

/** Default order: light to dark, then system. */
export const THEME_MODES = ["light", "neutral", "dark", "system"] as const satisfies readonly ThemeMode[];

const LABELS: Record<ThemeMode, string> = { light: "Light", neutral: "Neutral", dark: "Dark", system: "System" };
const ICONS = { light: IconSun, neutral: IconCircleHalf, dark: IconMoon, system: IconDeviceDesktop };
// Swatches show the theme itself, so they use fixed colours, not tokens.
const SWATCHES: Record<ThemeMode, string> = {
  light: "bg-white",
  neutral: "bg-zinc-700",
  dark: "bg-zinc-900",
  system: "bg-linear-to-br from-white to-zinc-900",
};
const ICON_COLOURS: Record<ThemeMode, string> = {
  light: "text-amber-500",
  neutral: "text-zinc-300",
  dark: "text-blue-300",
  system: "text-muted-foreground",
};

export type ThemeModePickerProps = {
  /** The selected theme (the stored choice, not the resolved one). */
  value: string | undefined;
  onChange: (mode: ThemeMode) => void;
  /** Themes to show, in order. Default `THEME_MODES`. */
  modes?: readonly ThemeMode[];
  /** Smaller tiles in two columns, for menus and dialogs. Default `false`. */
  compact?: boolean;
  className?: string;
};

/**
 * Theme tiles for an Appearance settings section: a swatch, an icon and a
 * label for each theme, and a check on the selected one. Two columns on a
 * phone, one row from `sm`.
 */
export function ThemeModePicker({ value, onChange, modes = THEME_MODES, compact = false, className }: ThemeModePickerProps) {
  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn("grid", compact ? "grid-cols-2 gap-1.5" : "grid-cols-2 gap-2 sm:grid-cols-4", className)}
    >
      {modes.map((mode, index) => {
        const active = value === mode;
        const Icon = ICONS[mode];
        return (
          <ListEnter key={mode} index={index} fast slide={false} staggerMax={8} className="h-full">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onChange(mode)}
              className={cn(
                // The border shows the selected state; idle tiles keep a transparent one to hold their size.
                "relative flex h-full w-full flex-col items-center rounded-surface border font-medium motion-press active:scale-[0.96]",
                compact ? "gap-1 p-2 text-2xs" : "gap-2 p-3 text-xs sm:gap-3 sm:p-4 sm:text-sm",
                active
                  ? "border-border bg-primary/8 text-primary"
                  : "border-transparent bg-surface-secondary/40 text-muted-foreground hover:bg-surface-secondary/60 hover:text-foreground",
              )}
            >
              {active ? (
                <span
                  className={cn(
                    "absolute flex items-center justify-center rounded-full bg-primary text-primary-foreground",
                    compact ? "right-1 top-1 size-3.5" : "right-2 top-2 size-4",
                  )}
                >
                  <IconCheck size={compact ? 8 : 10} strokeWidth={3} />
                </span>
              ) : null}
              <div
                className={cn(
                  "flex w-full items-center justify-center rounded-lg",
                  compact ? "h-8" : "h-12 sm:h-16",
                  SWATCHES[mode],
                )}
              >
                <Icon size={compact ? 14 : 22} className={ICON_COLOURS[mode]} />
              </div>
              {LABELS[mode]}
            </button>
          </ListEnter>
        );
      })}
    </div>
  );
}

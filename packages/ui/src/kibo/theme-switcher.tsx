"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useCallback } from "react";
import { springTransition } from "../motion/presets";
import { useCn, useUiConfig } from "../ui/ui-config";

const themes = [
  {
    key: "system",
    icon: IconDeviceDesktop,
    label: "System theme",
  },
  {
    key: "light",
    icon: IconSun,
    label: "Light theme",
  },
  {
    key: "dark",
    icon: IconMoon,
    label: "Dark theme",
  },
] as const;

type ThemeKey = "light" | "dark" | "system";

export interface ThemeSwitcherConfig {
  /** Replaces the built-in classes of a part. */
  classes?: {
    /** Each theme button: size, shape and press feedback. */
    button?: string;
  };
}

const defaultClasses = {
  button:
    "relative h-6 w-6 rounded-full transition-[scale] duration-150 ease-out active:scale-[0.94] hit-target",
};

export type ThemeSwitcherProps = {
  value?: ThemeKey;
  onChange?: (theme: ThemeKey) => void;
  defaultValue?: ThemeKey;
  className?: string;
};

export const ThemeSwitcher = ({
  value,
  onChange,
  defaultValue = "system",
  className,
}: ThemeSwitcherProps) => {
  const classes = { ...defaultClasses, ...useUiConfig("ThemeSwitcher")?.classes };
  const merge = useCn();
  const [theme, setTheme] = useControllableState({
    defaultProp: defaultValue,
    prop: value,
    onChange,
  });
  const handleThemeClick = useCallback(
    (themeKey: ThemeKey) => {
      setTheme(themeKey);
    },
    [setTheme],
  );

  // No mount gate: the selected theme comes from props rather than anything
  // browser-only, so a client render has no hydration mismatch to skip the
  // first paint for.
  return (
    <div
      className={merge(
        "relative isolate flex h-8 rounded-full bg-background p-1 ring-1 ring-border",
        className,
      )}
    >
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;

        return (
          <button
            aria-label={label}
            className={classes.button}
            key={key}
            onClick={() => handleThemeClick(key)}
            type="button"
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-secondary"
                layoutId="activeTheme"
                transition={springTransition}
              />
            )}
            <Icon
              className={merge(
                "relative z-10 m-auto h-4 w-4",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

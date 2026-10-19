import { createContext, use, useEffect, useState, type ReactNode } from "react";

/** `"class"` or a `data-*` attribute on `<html>`. */
export type ThemeAttribute = "class" | `data-${string}`;

export type ThemeProviderProps = {
  children?: ReactNode;
  /** localStorage key. Default `"theme"`. */
  storageKey?: string;
  /** Used when nothing is stored. Default `"system"` with `enableSystem`, else `"light"`. */
  defaultTheme?: string;
  /** Resolve `"system"` from `prefers-color-scheme`. Default `true`. */
  enableSystem?: boolean;
  /** Set `style.colorScheme` on `<html>` for light and dark. Default `true`. */
  enableColorScheme?: boolean;
  /** Where the theme goes on `<html>`. Default `"data-theme"`. */
  attribute?: ThemeAttribute | ThemeAttribute[];
  /** Theme names. Default `["light", "dark"]`. */
  themes?: string[];
  /** Theme name to the class or attribute value written. */
  value?: Record<string, string>;
  /** Shown on `<html>` instead of the stored theme, which is left unchanged. */
  forcedTheme?: string;
  /** Turn CSS transitions off for one frame while the theme changes. Default `false`. */
  disableTransitionOnChange?: boolean;
  /** Nonce for the style element `disableTransitionOnChange` adds. */
  nonce?: string;
};

export type ThemeState = {
  /** Stored theme, `"system"` included. `undefined` only without `window`. */
  theme: string | undefined;
  /** Stores the theme. A function gets the theme of the render it came from. */
  setTheme: (theme: string | ((theme: string | undefined) => string)) => void;
  forcedTheme: string | undefined;
  /** `theme`, with `"system"` resolved to `systemTheme`. */
  resolvedTheme: string | undefined;
  /** `themes` plus `"system"` with `enableSystem`. */
  themes: string[];
  /** `prefers-color-scheme` with `enableSystem`. Until the first effect runs it is `theme` unless that is `"system"` (as in next-themes). */
  systemTheme: string | undefined;
  /** `false` until the provider's first effect has run. */
  mounted: boolean;
  /** `mounted && resolvedTheme === "dark"`. */
  isDark: boolean;
  /** `setTheme(resolvedTheme === "dark" ? "light" : "dark")`. */
  toggleTheme: () => void;
};

export type ThemeProviderOptions = {
  /** `useTheme()` outside the provider throws this message. When unset it returns an empty state with no-op setters. */
  missingProviderMessage?: string;
};

export type ThemeProviderKit = {
  ThemeProvider: (props: ThemeProviderProps) => ReactNode;
  useTheme: () => ThemeState;
};

const COLOR_SCHEMES = ["light", "dark"];
const MEDIA = "(prefers-color-scheme: dark)";
const DISABLE_TRANSITIONS_CSS =
  "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}";

const noop = () => {};

const emptyState: ThemeState = {
  theme: undefined,
  setTheme: noop,
  forcedTheme: undefined,
  resolvedTheme: undefined,
  themes: [],
  systemTheme: undefined,
  mounted: false,
  isDark: false,
  toggleTheme: noop,
};

/** `prefers-color-scheme`, or `"light"` without `window`. */
export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(MEDIA).matches ? "dark" : "light";
}

/** Replaces the `light` / `dark` class on `<html>` with `theme`. No-op without `document`. */
export function applyThemeClass(theme: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
}

function systemThemeOf(media: { matches: boolean }): "light" | "dark" {
  return media.matches ? "dark" : "light";
}

function readTheme(storageKey: string, fallback: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  let stored: string | undefined;
  try {
    stored = localStorage.getItem(storageKey) || undefined;
  } catch {
    // Storage can be unavailable (privacy modes); fall back.
  }
  return stored || fallback;
}

function disableTransitions(nonce: string | undefined): () => void {
  const style = document.createElement("style");
  if (nonce) style.setAttribute("nonce", nonce);
  style.appendChild(document.createTextNode(DISABLE_TRANSITIONS_CSS));
  document.head.appendChild(style);
  return () => {
    // Force a style recalculation before the transitions come back.
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
}

type DomOptions = Required<
  Pick<ThemeProviderProps, "attribute" | "themes" | "enableSystem" | "enableColorScheme" | "defaultTheme" | "disableTransitionOnChange">
> &
  Pick<ThemeProviderProps, "value" | "nonce">;

function applyTheme(theme: string | undefined, options: DomOptions): void {
  if (!theme) return;
  const resolved = theme === "system" && options.enableSystem ? systemThemeOf(window.matchMedia(MEDIA)) : theme;
  const written = options.value ? options.value[resolved] : resolved;
  const restoreTransitions = options.disableTransitionOnChange ? disableTransitions(options.nonce) : null;
  const root = document.documentElement;
  const removable = options.value ? Object.values(options.value) : options.themes;
  for (const attribute of Array.isArray(options.attribute) ? options.attribute : [options.attribute]) {
    if (attribute === "class") {
      root.classList.remove(...removable);
      if (written) root.classList.add(written);
    } else if (attribute.startsWith("data-")) {
      if (written) root.setAttribute(attribute, written);
      else root.removeAttribute(attribute);
    }
  }
  if (options.enableColorScheme) {
    const fallback = COLOR_SCHEMES.includes(options.defaultTheme) ? options.defaultTheme : null;
    // `null` clears the property in browsers; assigned as-is, as next-themes does.
    Reflect.set(root.style, "colorScheme", COLOR_SCHEMES.includes(resolved) ? resolved : fallback);
  }
  restoreTransitions?.();
}

/**
 * A theme provider with next-themes 0.4.6 semantics, plus `mounted`, `isDark`
 * and `toggleTheme`. Each call makes its own context, so an app keeps one kit.
 *
 * Parity notes: the options that shape DOM writes (`attribute`, `themes`,
 * `value`, `enableSystem`, `enableColorScheme`, `defaultTheme`,
 * `disableTransitionOnChange`, `nonce`) are read once, on the first render, as
 * in next-themes; `forcedTheme`, and `enableSystem` for the system listener and
 * the returned state, follow props. A provider nested in another one from the
 * same kit renders only its children. No inline script is rendered: in a
 * client-rendered app React never runs it.
 */
export function createThemeProvider(options: ThemeProviderOptions = {}): ThemeProviderKit {
  const { missingProviderMessage } = options;
  const Context = createContext<ThemeState | undefined>(undefined);

  /** next-themes hands out a new `setTheme` exactly when `theme` changes; apps list it in effect deps. */
  function useSetTheme(
    theme: string | undefined,
    storageKey: string,
    setThemeState: (theme: string) => void,
  ): ThemeState["setTheme"] {
    const make = (): ThemeState["setTheme"] => (next) => {
      const resolved = typeof next === "function" ? next(theme) : next;
      setThemeState(resolved);
      try {
        localStorage.setItem(storageKey, resolved);
      } catch {
        // Storage can be unavailable (privacy modes).
      }
    };
    const [entry, setEntry] = useState(() => ({ theme, setTheme: make() }));
    if (entry.theme === theme) return entry.setTheme;
    const next = { theme, setTheme: make() };
    setEntry(next);
    return next.setTheme;
  }

  function Provider({
    forcedTheme,
    disableTransitionOnChange = false,
    enableSystem = true,
    enableColorScheme = true,
    storageKey = "theme",
    themes = COLOR_SCHEMES,
    defaultTheme = enableSystem ? "system" : "light",
    attribute = "data-theme",
    value,
    nonce,
    children,
  }: ThemeProviderProps) {
    const [theme, setThemeState] = useState(() => readTheme(storageKey, defaultTheme));
    const [systemTheme, setSystemTheme] = useState<string | undefined>(() =>
      theme === "system" ? systemThemeOf(window.matchMedia(MEDIA)) : theme,
    );
    const [mounted, setMounted] = useState(false);
    const [domOptions] = useState<DomOptions>(() => ({
      attribute,
      themes,
      value,
      enableSystem,
      enableColorScheme,
      defaultTheme,
      disableTransitionOnChange,
      nonce,
    }));
    const setTheme = useSetTheme(theme, storageKey, setThemeState);

    useEffect(() => setMounted(true), []);

    // Listener and handler are rebuilt whenever `theme` or `forcedTheme` changes.
    useEffect(() => {
      const handleMedia = (media: { matches: boolean }) => {
        setSystemTheme(systemThemeOf(media));
        if (theme === "system" && enableSystem && !forcedTheme) applyTheme("system", domOptions);
      };
      const media = window.matchMedia(MEDIA);
      media.addListener(handleMedia);
      handleMedia(media);
      return () => media.removeListener(handleMedia);
    }, [theme, forcedTheme]);

    // Other tabs: follow a new value, or store the default when the key is removed.
    useEffect(() => {
      const handleStorage = (event: StorageEvent) => {
        if (event.key !== storageKey) return;
        if (event.newValue) setThemeState(event.newValue);
        else setTheme(defaultTheme);
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }, [setTheme]);

    useEffect(() => {
      applyTheme(forcedTheme ?? theme, domOptions);
    }, [forcedTheme, theme]);

    const resolvedTheme = theme === "system" ? systemTheme : theme;
    const state: ThemeState = {
      theme,
      setTheme,
      forcedTheme,
      resolvedTheme,
      themes: enableSystem ? [...themes, "system"] : themes,
      systemTheme: enableSystem ? systemTheme : undefined,
      mounted,
      isDark: mounted && resolvedTheme === "dark",
      toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    };
    return <Context value={state}>{children}</Context>;
  }

  function ThemeProvider(props: ThemeProviderProps) {
    if (use(Context)) return <>{props.children}</>;
    return <Provider {...props} />;
  }

  function useTheme(): ThemeState {
    const state = use(Context);
    if (state) return state;
    if (missingProviderMessage !== undefined) throw new Error(missingProviderMessage);
    return emptyState;
  }

  return { ThemeProvider, useTheme };
}

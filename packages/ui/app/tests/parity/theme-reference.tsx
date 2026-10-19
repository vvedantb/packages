// The five web theme providers as the apps have them today. Logic is copied
// verbatim; only server queries, mutations and toasts go through fakeServer.
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { createContext, use, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { server, updateSettings, updateTheme, upsertPreferences, useServerValue } from "./fakeServer";

type Theme = "light" | "dark" | "system";
const isTheme = (value: string | undefined): value is Theme =>
  value === "light" || value === "dark" || value === "system";

// ---------------------------------------------------------------- app-a
// Outer next-themes provider in the client provider; the server-synced
// context mounts later, inside the signed-in tree.

type AContext = { theme: Theme; isDark: boolean; setTheme: (theme: Theme) => void; toggleTheme: () => void };
const AThemeContext = createContext<AContext | undefined>(undefined);

function AThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme: setNextTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);
  const settings = useServerValue(server.settings);
  const updateSettingsMutation = updateSettings;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || settings === undefined) return;
    const convexTheme = settings.theme ?? "system";
    setNextTheme(convexTheme);
  }, [mounted, settings, setNextTheme]);

  const theme: Theme = isTheme(settings?.theme) ? settings.theme : "system";

  const handleSetTheme = (newTheme: Theme) => {
    setNextTheme(newTheme);
    void updateSettingsMutation({ theme: newTheme });
  };

  const toggleTheme = () => {
    const resolved = resolvedTheme === "dark" ? "light" : "dark";
    handleSetTheme(resolved);
  };

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <AThemeContext.Provider value={{ theme, isDark, setTheme: handleSetTheme, toggleTheme }}>
      {children}
    </AThemeContext.Provider>
  );
}

function useAThemeContext() {
  const context = use(AThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}

export const appA = {
  Root({ landing, signedIn, children }: { landing: boolean; signedIn: boolean; children: ReactNode }) {
    return (
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={!landing}
        forcedTheme={landing ? "dark" : undefined}
        disableTransitionOnChange
      >
        {signedIn ? <AThemeProvider>{children}</AThemeProvider> : children}
      </NextThemesProvider>
    );
  },
  useThemeContext: useAThemeContext,
  useToasterTheme: () => useNextTheme().resolvedTheme,
};

// ---------------------------------------------------------------- app-b

type BContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
};
const BThemeContext = createContext<BContextValue | undefined>(undefined);
function getSystemThemeB(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyThemeClassB(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}
function resolveThemeB(theme: Theme): "light" | "dark" {
  if (theme === "system") return getSystemThemeB();
  return theme;
}
export const B_STORAGE_KEY = "app-b-theme";

function BThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(resolveThemeB("system"));
  const [mounted, setMounted] = useState(false);
  const synced = useRef(false);
  const preferences = useServerValue(server.preferences);
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(B_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
      const resolved = resolveThemeB(stored);
      setResolvedTheme(resolved);
      applyThemeClassB(resolved);
    }
  }, []);
  useEffect(() => {
    if (!synced.current && preferences?.theme) {
      synced.current = true;
      const raw = preferences.theme;
      const pref: Theme = raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
      if (pref !== theme) {
        setThemeState(pref);
        const resolved = resolveThemeB(pref);
        setResolvedTheme(resolved);
        applyThemeClassB(resolved);
        localStorage.setItem(B_STORAGE_KEY, pref);
      }
    }
  }, [preferences?.theme, theme]);
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemThemeB();
      setResolvedTheme(resolved);
      applyThemeClassB(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);
  const setTheme = (newTheme: Theme) => {
    synced.current = true;
    setThemeState(newTheme);
    const resolved = resolveThemeB(newTheme);
    setResolvedTheme(resolved);
    applyThemeClassB(resolved);
    localStorage.setItem(B_STORAGE_KEY, newTheme);
    upsertPreferences({ theme: newTheme }).catch(() => {
      server.toasts.push("Could not save theme.");
    });
  };
  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };
  return (
    <BThemeContext.Provider value={{ theme: mounted ? theme : "system", resolvedTheme, setTheme, toggleTheme, mounted }}>
      {children}
    </BThemeContext.Provider>
  );
}

export const appB = {
  Root: ({ children }: { children: ReactNode }) => <BThemeProvider>{children}</BThemeProvider>,
  useThemeContext() {
    const context = useContext(BThemeContext);
    if (context === undefined) {
      throw new Error("useThemeContext must be used within a ThemeProvider");
    }
    return context;
  },
};

// ---------------------------------------------------------------- app-c

type CContext = { theme: string; setTheme: (theme: string) => void; toggleTheme: () => void };
const CThemeContext = createContext<CContext | undefined>(undefined);
function getSystemThemeC(): string {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function getStoredThemeC(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}
function applyThemeToDocumentC(theme: string) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
}

function CThemeProvider({ pathname, children }: { pathname: string; children: ReactNode }) {
  const [initialTheme] = useState(() => getStoredThemeC() ?? getSystemThemeC());
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const currentUser = useServerValue(server.currentUser);

  const theme = selectedTheme ?? currentUser?.theme ?? initialTheme;
  const documentTheme = pathname === "/" ? "dark" : theme;

  useEffect(() => {
    applyThemeToDocumentC(documentTheme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore
    }
  }, [documentTheme, theme]);

  function handleSetTheme(newTheme: string) {
    setSelectedTheme(newTheme);
    if (currentUser) {
      updateTheme({ theme: newTheme }).catch(() => server.toasts.push("console.error"));
    }
  }

  function toggleTheme() {
    handleSetTheme(theme === "dark" ? "light" : "dark");
  }

  return <CThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme }}>{children}</CThemeContext.Provider>;
}

export const appC = {
  Root: CThemeProvider,
  useTheme() {
    const context = useContext(CThemeContext);
    if (context === undefined) {
      throw new Error("useThemeContext must be used within a ThemeProvider");
    }
    return context;
  },
};

// ---------------------------------------------------------------- app-d
// The bridge context is never read in the app; the fixture exposes it so the
// test can still compare it.

type DContext = { theme: string; setTheme: (theme: string) => void; toggleTheme: () => void; mounted: boolean };
const DThemeContext = createContext<DContext | undefined>(undefined);

function DThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  return (
    <DThemeContext.Provider value={{ theme: theme || "dark", setTheme, toggleTheme, mounted }}>
      {children}
    </DThemeContext.Provider>
  );
}

export const appD = {
  Root: ({ children }: { children: ReactNode }) => (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <DThemeProvider>{children}</DThemeProvider>
    </NextThemesProvider>
  ),
  useBridge: () => useContext(DThemeContext),
  useToasterTheme: () => useNextTheme().resolvedTheme,
};

// ---------------------------------------------------------------- app-e

// The app casts `theme as Theme`; a cast does nothing at runtime, so the
// fixture types it as a string instead.
type EContext = { theme: string; isDark: boolean; setTheme: (theme: Theme) => void; toggleTheme: () => void };
const EThemeContext = createContext<EContext | undefined>(undefined);

function EThemeBridge({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme, setTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const value: EContext = {
    theme: theme ?? "system",
    isDark: mounted && resolvedTheme === "dark",
    setTheme: (next: Theme) => setTheme(next),
    toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
  };
  return <EThemeContext value={value}>{children}</EThemeContext>;
}

export const appE = {
  Root: ({ children }: { children: ReactNode }) => (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <EThemeBridge>{children}</EThemeBridge>
    </NextThemesProvider>
  ),
  useThemeContext() {
    const context = use(EThemeContext);
    if (!context) {
      throw new Error("useThemeContext must be used within AppThemeProvider");
    }
    return context;
  },
  useToasterTheme: () => useNextTheme().resolvedTheme,
};

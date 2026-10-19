// Each app's theme provider rebuilt on @vvedantb/ui, as the adoption recipes
// describe. Server-synced logic stays in the app; only the core moves.
import { createContext, use, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { applyThemeClass, createThemeProvider, getSystemTheme } from "../../src/index.js";
import { server, updateSettings, updateTheme, upsertPreferences, useServerValue } from "./fakeServer";
import { B_STORAGE_KEY } from "./theme-reference";

type Theme = "light" | "dark" | "system";
const isTheme = (value: string | undefined): value is Theme =>
  value === "light" || value === "dark" || value === "system";

// ---------------------------------------------------------------- app-a
// The server-synced context file is unchanged apart from where `useTheme` comes from.

const coreA = createThemeProvider();

type AContext = { theme: Theme; isDark: boolean; setTheme: (theme: Theme) => void; toggleTheme: () => void };
const AThemeContext = createContext<AContext | undefined>(undefined);

function AThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme: setNextTheme } = coreA.useTheme();
  const [mounted, setMounted] = useState(false);
  const settings = useServerValue(server.settings);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || settings === undefined) return;
    setNextTheme(settings.theme ?? "system");
  }, [mounted, settings, setNextTheme]);

  const theme: Theme = isTheme(settings?.theme) ? settings.theme : "system";

  const handleSetTheme = (newTheme: Theme) => {
    setNextTheme(newTheme);
    void updateSettings({ theme: newTheme });
  };

  const toggleTheme = () => handleSetTheme(resolvedTheme === "dark" ? "light" : "dark");

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <AThemeContext.Provider value={{ theme, isDark, setTheme: handleSetTheme, toggleTheme }}>
      {children}
    </AThemeContext.Provider>
  );
}

export const appA = {
  Root({ landing, signedIn, children }: { landing: boolean; signedIn: boolean; children: ReactNode }) {
    return (
      <coreA.ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={!landing}
        forcedTheme={landing ? "dark" : undefined}
        disableTransitionOnChange
      >
        {signedIn ? <AThemeProvider>{children}</AThemeProvider> : children}
      </coreA.ThemeProvider>
    );
  },
  useThemeContext() {
    const context = use(AThemeContext);
    if (context === undefined) {
      throw new Error("useThemeContext must be used within a ThemeProvider");
    }
    return context;
  },
  useToasterTheme: () => coreA.useTheme().resolvedTheme,
};

// ---------------------------------------------------------------- app-b
// Server-synced state machine stays local; system lookup and the class write are shared.

type BContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
};
const BThemeContext = createContext<BContextValue | undefined>(undefined);
function resolveThemeB(theme: Theme): "light" | "dark" {
  if (theme === "system") return getSystemTheme();
  return theme;
}

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
      applyThemeClass(resolved);
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
        applyThemeClass(resolved);
        localStorage.setItem(B_STORAGE_KEY, pref);
      }
    }
  }, [preferences?.theme, theme]);
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);
  const setTheme = (newTheme: Theme) => {
    synced.current = true;
    setThemeState(newTheme);
    const resolved = resolveThemeB(newTheme);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
    localStorage.setItem(B_STORAGE_KEY, newTheme);
    upsertPreferences({ theme: newTheme }).catch(() => {
      server.toasts.push("Could not save theme.");
    });
  };
  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");
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
// Server-synced and route-forced; stays local apart from the shared helpers.

type CContext = { theme: string; setTheme: (theme: string) => void; toggleTheme: () => void };
const CThemeContext = createContext<CContext | undefined>(undefined);
function getStoredThemeC(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}

function CThemeProvider({ pathname, children }: { pathname: string; children: ReactNode }) {
  const [initialTheme] = useState(() => getStoredThemeC() ?? getSystemTheme());
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const currentUser = useServerValue(server.currentUser);

  const theme = selectedTheme ?? currentUser?.theme ?? initialTheme;
  const documentTheme = pathname === "/" ? "dark" : theme;

  useEffect(() => {
    applyThemeClass(documentTheme);
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

  return (
    <CThemeContext.Provider
      value={{ theme, setTheme: handleSetTheme, toggleTheme: () => handleSetTheme(theme === "dark" ? "light" : "dark") }}
    >
      {children}
    </CThemeContext.Provider>
  );
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
// No bridge context: nothing in the app reads it. `useBridge` shows the same
// values can be derived from the core if the app ever needs them.

const coreD = createThemeProvider();

export const appD = {
  Root: ({ children }: { children: ReactNode }) => (
    <coreD.ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
    </coreD.ThemeProvider>
  ),
  useBridge() {
    const { theme, setTheme, mounted } = coreD.useTheme();
    return {
      theme: theme || "dark",
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      mounted,
    };
  },
  useToasterTheme: () => coreD.useTheme().resolvedTheme,
};

// ---------------------------------------------------------------- app-e

const coreE = createThemeProvider({ missingProviderMessage: "useThemeContext must be used within AppThemeProvider" });

export const appE = {
  Root: ({ children }: { children: ReactNode }) => (
    <coreE.ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </coreE.ThemeProvider>
  ),
  useThemeContext() {
    const { theme, isDark, setTheme, toggleTheme } = coreE.useTheme();
    return { theme: theme ?? "system", isDark, setTheme: (next: Theme) => setTheme(next), toggleTheme };
  },
  useToasterTheme: () => coreE.useTheme().resolvedTheme,
};

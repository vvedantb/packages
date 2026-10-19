// @vitest-environment happy-dom
// createThemeProvider against next-themes 0.4.6 for options the app configs do
// not cover, plus the added fields and the two DOM helpers.
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { useLayoutEffect, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyThemeClass, createThemeProvider, getSystemTheme, type ThemeProviderProps } from "../src/index.js";
import {
  domSnapshot,
  installColorScheme,
  logStorageWrites,
  mount,
  resetDom,
  step,
  storageEventFromOtherTab,
} from "./parity/harness";

const core = createThemeProvider();

type Seen = { theme?: string; resolvedTheme?: string; systemTheme?: string; forcedTheme?: string; themes: string[] };
type SetTheme = (theme: string) => void;

function Probe({ use, seen, onSet }: { use: () => Seen & { setTheme: SetTheme }; seen: Seen[]; onSet: (set: SetTheme) => void }) {
  const { theme, resolvedTheme, systemTheme, forcedTheme, themes, setTheme } = use();
  onSet(setTheme);
  // Value changes only: the core also re-renders consumers when `mounted` flips.
  useLayoutEffect(() => {
    const next = { theme, resolvedTheme, systemTheme, forcedTheme, themes };
    if (JSON.stringify(seen.at(-1)) !== JSON.stringify(next)) seen.push(next);
  });
  return null;
}

function run(kind: "next" | "core", props: ThemeProviderProps, nested?: ThemeProviderProps) {
  resetDom();
  const scheme = installColorScheme(false);
  const writes = logStorageWrites();
  const seen: Seen[] = [];
  const out: unknown[] = [];
  let set: SetTheme = () => {};
  const Provider = kind === "next" ? NextThemesProvider : core.ThemeProvider;
  const use = kind === "next" ? useNextTheme : core.useTheme;
  const probe = <Probe use={use} seen={seen} onSet={(s) => (set = s)} />;
  const tree = (p: ComponentProps<typeof NextThemesProvider>) => (
    <Provider {...p}>{nested ? <Provider {...nested}>{probe}</Provider> : probe}</Provider>
  );
  const app = mount(tree(props));
  const snap = () => {
    out.push({ dom: domSnapshot(), writes: [...writes], seen: [...seen] });
    vi.runAllTimers();
    seen.length = 0;
  };
  snap();
  for (const theme of ["dark", "light", "system", "brand", "dark"]) {
    step(() => set(theme));
    snap();
  }
  step(() => scheme.setDark(true));
  snap();
  storageEventFromOtherTab(props.storageKey ?? "theme", "brand");
  snap();
  app.render(tree({ ...props, forcedTheme: "light" }));
  snap();
  app.unmount();
  return out;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("createThemeProvider matches next-themes 0.4.6", () => {
  const cases: [string, ThemeProviderProps][] = [
    ["defaults (data-theme, system)", {}],
    ["class and a data attribute", { attribute: ["class", "data-mode"] }],
    ["value map", { attribute: "class", themes: ["light", "dark", "brand"], value: { light: "is-light", dark: "is-dark", brand: "is-brand" } }],
    ["no system, no colorScheme", { enableSystem: false, enableColorScheme: false, attribute: "data-theme" }],
    ["custom key and default", { storageKey: "app-theme", defaultTheme: "dark", attribute: "class" }],
    ["unknown default theme", { defaultTheme: "brand", attribute: "class", themes: ["light", "dark", "brand"] }],
    ["transitions off with a nonce", { attribute: "class", disableTransitionOnChange: true, nonce: "abc" }],
    ["forced from the start", { attribute: "class", forcedTheme: "dark" }],
  ];
  for (const [name, props] of cases) {
    it(name, () => {
      expect(run("core", props)).toEqual(run("next", props));
    });
  }

  it("a nested provider renders only its children", () => {
    const outer = { attribute: "class" as const, storageKey: "outer" };
    const inner = { attribute: "data-theme" as const, storageKey: "inner" };
    expect(run("core", outer, inner)).toEqual(run("next", outer, inner));
  });

  it("reads storage once and applies the stored theme on mount", () => {
    resetDom();
    installColorScheme(true);
    localStorage.setItem("theme", "system");
    const app = mount(
      <core.ThemeProvider attribute="class">
        <Probe use={core.useTheme} seen={[]} onSet={() => {}} />
      </core.ThemeProvider>,
    );
    expect(document.documentElement.className).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    app.unmount();
  });
});

describe("added fields", () => {
  it("mounted, isDark and toggleTheme follow the resolved theme", () => {
    resetDom();
    installColorScheme(true);
    const seen: { mounted: boolean; isDark: boolean; theme?: string }[] = [];
    let toggle = () => {};
    function Read() {
      const { mounted, isDark, theme, toggleTheme } = core.useTheme();
      toggle = toggleTheme;
      useLayoutEffect(() => {
        seen.push({ mounted, isDark, theme });
      });
      return null;
    }
    const app = mount(
      <core.ThemeProvider attribute="class">
        <Read />
      </core.ThemeProvider>,
    );
    expect(seen[0]).toEqual({ mounted: false, isDark: false, theme: "system" });
    expect(seen.at(-1)).toEqual({ mounted: true, isDark: true, theme: "system" });
    step(() => toggle());
    expect(seen.at(-1)).toEqual({ mounted: true, isDark: false, theme: "light" });
    expect(localStorage.getItem("theme")).toBe("light");
    app.unmount();
  });

  it("outside the provider: an empty state by default, or the configured error", () => {
    let state: ReturnType<typeof core.useTheme> | undefined;
    function Read() {
      state = core.useTheme();
      return null;
    }
    mount(<Read />).unmount();
    expect(state).toMatchObject({ theme: undefined, themes: [], mounted: false, isDark: false });

    const strict = createThemeProvider({ missingProviderMessage: "useAppTheme needs AppThemeProvider" });
    function ReadStrict() {
      strict.useTheme();
      return null;
    }
    const onError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => mount(<ReadStrict />)).toThrow("useAppTheme needs AppThemeProvider");
    onError.mockRestore();
  });

  it("each kit has its own context", () => {
    const other = createThemeProvider();
    let state: ReturnType<typeof other.useTheme> | undefined;
    function Read() {
      state = other.useTheme();
      return null;
    }
    const app = mount(
      <core.ThemeProvider>
        <Read />
      </core.ThemeProvider>,
    );
    expect(state?.themes).toEqual([]);
    app.unmount();
  });
});

describe("DOM helpers", () => {
  it("getSystemTheme reads prefers-color-scheme", () => {
    const scheme = installColorScheme(false);
    expect(getSystemTheme()).toBe("light");
    scheme.setDark(true);
    expect(getSystemTheme()).toBe("dark");
  });

  it("applyThemeClass swaps light and dark and keeps other classes", () => {
    resetDom();
    document.documentElement.className = "font-sans light";
    applyThemeClass("dark");
    expect(document.documentElement.className).toBe("font-sans dark");
    applyThemeClass("system");
    expect(document.documentElement.className).toBe("font-sans system");
  });
});

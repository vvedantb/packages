// @vitest-environment happy-dom
// Each app's theme provider today (next-themes or hand-rolled) against the same
// app rebuilt on createThemeProvider / the shared helpers. A scenario runs on
// both and the traces must match: <html> class, attributes and colorScheme,
// injected transition-blocking styles, every localStorage write, every
// committed context value, server mutations and toasts.
import { useLayoutEffect, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adopted from "./parity/theme-adopted";
import * as reference from "./parity/theme-reference";
import { resetServer, server } from "./parity/fakeServer";
import {
  domSnapshot,
  installColorScheme,
  logStorageWrites,
  mount,
  plain,
  resetDom,
  step,
  storageEventFromOtherTab,
} from "./parity/harness";

type Impl = Pick<typeof reference, "appA" | "appB" | "appC" | "appD" | "appE">;

/**
 * Records each committed value that differs from this consumer's previous one,
 * so traces compare what consumers see, not how often they re-render.
 */
function Probe({ use, commits }: { use: () => object | string | undefined; commits: unknown[] }) {
  const value = use();
  const snapshot = typeof value === "object" ? plain(value) : value;
  const [last] = useState<{ value?: unknown }>(() => ({}));
  useLayoutEffect(() => {
    if ("value" in last && JSON.stringify(last.value) === JSON.stringify(snapshot)) return;
    last.value = snapshot;
    commits.push(snapshot);
  });
  return null;
}

/** Runs `script` against a fresh DOM and returns everything observable. */
function trace(
  setup: { storage?: Record<string, string>; dark: boolean },
  script: (ctx: {
    scheme: ReturnType<typeof installColorScheme>;
    commits: unknown[];
    snap: (label: string) => void;
  }) => void,
) {
  resetDom();
  resetServer();
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries(setup.storage ?? {})) localStorage.setItem(key, value);
  const scheme = installColorScheme(setup.dark);
  const writes = logStorageWrites();
  const commits: unknown[] = [];
  const steps: unknown[] = [];
  const snap = (label: string) => {
    const dom = domSnapshot();
    vi.runAllTimers();
    steps.push({
      label,
      dom,
      stylesAfterTimers: domSnapshot().styles,
      writes: [...writes],
      commits: [...commits],
      mutations: [...server.mutations],
      toasts: [...server.toasts],
    });
    commits.length = 0;
  };
  script({ scheme, commits, snap });
  return steps;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const storagePresets: Record<string, string | undefined> = {
  empty: undefined,
  light: "light",
  dark: "dark",
  system: "system",
  unknown: "sepia",
};

function parity(run: (impl: Impl) => unknown) {
  expect(run(adopted)).toEqual(run(reference));
}

describe("app-a: next-themes (class, default light, forced dark on the landing page) + server-synced context", () => {
  for (const [preset, stored] of Object.entries(storagePresets)) {
    for (const dark of [false, true]) {
      for (const startOnLanding of [true, false]) {
        it(`storage ${preset}, system ${dark ? "dark" : "light"}, starts ${startOnLanding ? "on landing" : "in app"}`, () => {
          parity((impl) =>
            trace({ storage: stored ? { theme: stored } : {}, dark }, ({ scheme, commits, snap }) => {
              let ctx: ReturnType<Impl["appA"]["useThemeContext"]> | undefined;
              const tree = (landing: boolean, signedIn: boolean) => (
                <impl.appA.Root landing={landing} signedIn={signedIn}>
                  <Probe use={impl.appA.useToasterTheme} commits={commits} />
                  {signedIn ? (
                    <Probe
                      use={() => {
                        ctx = impl.appA.useThemeContext();
                        return ctx;
                      }}
                      commits={commits}
                    />
                  ) : null}
                </impl.appA.Root>
              );
              const app = mount(tree(startOnLanding, false));
              snap("mount");
              app.render(tree(false, false));
              snap("enter app");
              app.render(tree(false, true));
              snap("signed in, settings loading");
              step(() => server.settings.set({ theme: "dark" }));
              snap("settings arrive");
              step(() => ctx?.toggleTheme());
              snap("toggle");
              step(() => ctx?.setTheme("system"));
              snap("system");
              step(() => scheme.setDark(!dark));
              snap("os flips");
              storageEventFromOtherTab("theme", "light");
              snap("other tab sets light");
              storageEventFromOtherTab("theme", null);
              snap("other tab clears");
              step(() => server.settings.set({}));
              snap("server theme unset");
              app.render(tree(true, true));
              snap("back to landing");
              step(() => scheme.setDark(dark));
              snap("os flips back on landing");
              app.render(tree(false, true));
              snap("app again");
              app.unmount();
              snap("unmount");
            }),
          );
        });
      }
    }
  }

  it("keeps next-themes' DOM options from the first render: system shows as a `system` class after landing", () => {
    for (const impl of [reference, adopted]) {
      trace({ storage: { theme: "system" }, dark: true }, ({ snap }) => {
        const app = mount(<impl.appA.Root landing signedIn={false}>{null}</impl.appA.Root>);
        app.render(<impl.appA.Root landing={false} signedIn={false}>{null}</impl.appA.Root>);
        snap("in app");
        expect(document.documentElement.className).toBe("system");
        expect(document.documentElement.style.colorScheme).toBe("light");
        app.unmount();
      });
    }
  });
});

describe("app-b: hand-rolled, own storage key, server preferences", () => {
  for (const [preset, stored] of Object.entries(storagePresets)) {
    for (const dark of [false, true]) {
      for (const serverTheme of [undefined, "light", "dark", "system", "bogus"]) {
        it(`storage ${preset}, system ${dark ? "dark" : "light"}, server ${serverTheme ?? "none"}`, () => {
          parity((impl) =>
            trace({ storage: stored ? { [reference.B_STORAGE_KEY]: stored } : {}, dark }, ({ scheme, commits, snap }) => {
              let ctx: ReturnType<Impl["appB"]["useThemeContext"]> | undefined;
              const app = mount(
                <impl.appB.Root>
                  <Probe
                    use={() => {
                      ctx = impl.appB.useThemeContext();
                      return ctx;
                    }}
                    commits={commits}
                  />
                </impl.appB.Root>,
              );
              snap("mount");
              step(() => server.preferences.set(serverTheme ? { theme: serverTheme } : null));
              snap("preferences arrive");
              step(() => scheme.setDark(!dark));
              snap("os flips");
              step(() => ctx?.toggleTheme());
              snap("toggle");
              server.failMutations = true;
              step(() => ctx?.setTheme("system"));
              snap("system, save fails");
              step(() => scheme.setDark(dark));
              snap("os flips back");
              app.unmount();
              snap("unmount");
            }),
          );
        });
      }
    }
  }
});

describe("app-c: hand-rolled, key `theme`, dark on `/`, server user theme", () => {
  for (const [preset, stored] of Object.entries(storagePresets)) {
    for (const dark of [false, true]) {
      for (const user of ["loading", "signed-out", "light", "dark"] as const) {
        it(`storage ${preset}, system ${dark ? "dark" : "light"}, user ${user}`, () => {
          parity((impl) =>
            trace({ storage: stored ? { theme: stored } : {}, dark }, ({ scheme, commits, snap }) => {
              let ctx: ReturnType<Impl["appC"]["useTheme"]> | undefined;
              const tree = (pathname: string) => (
                <impl.appC.Root pathname={pathname}>
                  <Probe
                    use={() => {
                      ctx = impl.appC.useTheme();
                      return ctx;
                    }}
                    commits={commits}
                  />
                </impl.appC.Root>
              );
              const app = mount(tree("/"));
              snap("mount on /");
              step(() =>
                server.currentUser.set(user === "loading" ? undefined : user === "signed-out" ? null : { theme: user }),
              );
              snap("user");
              app.render(tree("/notes"));
              snap("navigate");
              step(() => ctx?.toggleTheme());
              snap("toggle");
              step(() => scheme.setDark(!dark));
              snap("os flips");
              server.failMutations = true;
              step(() => ctx?.setTheme("light"));
              snap("light, save fails");
              app.render(tree("/"));
              snap("back to /");
              app.unmount();
              snap("unmount");
            }),
          );
        });
      }
    }
  }
});

describe("app-d: next-themes (class, default light, system on) + unread bridge", () => {
  for (const [preset, stored] of Object.entries(storagePresets)) {
    for (const dark of [false, true]) {
      it(`storage ${preset}, system ${dark ? "dark" : "light"}`, () => {
        parity((impl) =>
          trace({ storage: stored ? { theme: stored } : {}, dark }, ({ scheme, commits, snap }) => {
            let bridge: ReturnType<Impl["appD"]["useBridge"]>;
            const app = mount(
              <impl.appD.Root>
                <Probe use={impl.appD.useToasterTheme} commits={commits} />
                <Probe
                  use={() => {
                    bridge = impl.appD.useBridge();
                    return bridge;
                  }}
                  commits={commits}
                />
              </impl.appD.Root>,
            );
            snap("mount");
            step(() => bridge?.toggleTheme());
            snap("toggle");
            step(() => bridge?.setTheme("system"));
            snap("system");
            step(() => bridge?.toggleTheme());
            snap("toggle from system");
            step(() => bridge?.setTheme("system"));
            step(() => scheme.setDark(!dark));
            snap("os flips");
            storageEventFromOtherTab("theme", "dark");
            snap("other tab");
            app.unmount();
            snap("unmount");
          }),
        );
      });
    }
  }
});

describe("app-e: next-themes (class, default system) + bridge", () => {
  for (const [preset, stored] of Object.entries(storagePresets)) {
    for (const dark of [false, true]) {
      it(`storage ${preset}, system ${dark ? "dark" : "light"}`, () => {
        parity((impl) =>
          trace({ storage: stored ? { theme: stored } : {}, dark }, ({ scheme, commits, snap }) => {
            let ctx: ReturnType<Impl["appE"]["useThemeContext"]> | undefined;
            const late = (show: boolean): ReactNode =>
              show ? <Probe use={() => impl.appE.useThemeContext()} commits={commits} /> : null;
            const tree = (showLate: boolean) => (
              <impl.appE.Root>
                <Probe use={impl.appE.useToasterTheme} commits={commits} />
                <Probe
                  use={() => {
                    ctx = impl.appE.useThemeContext();
                    return ctx;
                  }}
                  commits={commits}
                />
                {late(showLate)}
              </impl.appE.Root>
            );
            const app = mount(tree(false));
            snap("mount");
            app.render(tree(true));
            snap("late consumer");
            step(() => ctx?.toggleTheme());
            snap("toggle");
            step(() => ctx?.setTheme("system"));
            snap("system");
            step(() => scheme.setDark(!dark));
            snap("os flips");
            storageEventFromOtherTab("theme", "light");
            snap("other tab");
            storageEventFromOtherTab("theme", null);
            snap("other tab clears");
            app.unmount();
            snap("unmount");
          }),
        );
      });
    }
  }

  it("throws the same message outside the provider", () => {
    for (const impl of [reference, adopted]) {
      const onError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => mount(<Probe use={() => impl.appE.useThemeContext()} commits={[]} />)).toThrow(
        "useThemeContext must be used within AppThemeProvider",
      );
      onError.mockRestore();
    }
  });
});

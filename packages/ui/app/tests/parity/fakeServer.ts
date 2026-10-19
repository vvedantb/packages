// In-memory stand-ins for each app's server query and optimistic mutation.
// Convex applies an optimistic update synchronously when the mutation is called.
import { useSyncExternalStore } from "react";
import { createServerStore } from "./harness";

type ThemeRow = { theme?: string };

function createServer() {
  return {
    /** app-a user settings (`undefined` while loading). */
    settings: createServerStore<ThemeRow | undefined>(undefined),
    /** app-b preferences (`undefined` while loading). */
    preferences: createServerStore<ThemeRow | null | undefined>(undefined),
    /** app-c current user (`undefined` while loading, `null` signed out). */
    currentUser: createServerStore<ThemeRow | null | undefined>(undefined),
    /** Page motion flag per app. */
    disablePageMotion: createServerStore<boolean>(false),
    failMutations: false,
    mutations: [] as string[],
    toasts: [] as string[],
  };
}

export let server = createServer();

export function resetServer() {
  server = createServer();
}

export function useServerValue<T>(store: { get: () => T; subscribe: (l: () => void) => () => void }): T {
  return useSyncExternalStore(store.subscribe, store.get);
}

function mutate(name: string, patch: () => void): Promise<null> {
  server.mutations.push(name);
  patch();
  return server.failMutations ? Promise.reject(new Error("offline")) : Promise.resolve(null);
}

export function updateSettings(args: { theme: string }) {
  return mutate(`settings:${args.theme}`, () => {
    const current = server.settings.get();
    if (current !== undefined) server.settings.set({ ...current, ...args });
  });
}

export function upsertPreferences(args: { theme: string }) {
  return mutate(`preferences:${args.theme}`, () => {
    const current = server.preferences.get();
    if (current) server.preferences.set({ ...current, ...args });
  });
}

export function updateTheme(args: { theme: string }) {
  return mutate(`user:${args.theme}`, () => {
    const current = server.currentUser.get();
    if (current) server.currentUser.set({ ...current, ...args });
  });
}

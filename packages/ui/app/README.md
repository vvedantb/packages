# App helpers (`@vvedantb/ui`)

Shared web React helpers that were duplicated across apps. Source-exported as the `./app` subpath of `@vvedantb/ui`.

## Install

```sh
npm install @vvedantb/ui
```

## Peers

Required: `react` and `react-dom` (>=19). Optional peers of `@vvedantb/ui` used by the app helpers: `@clerk/clerk-react` (`useStableAuth`, `ConvexClerkProvider`), `convex` (`ConvexClerkProvider`, `useEnsureUser`), `@tanstack/react-hotkeys` and `zod` (your `z` for `parseClientEnv`). The root imports Clerk and `convex/react` statically, so they must be installed even if you do not use these helpers; see the package README.

`sonner` is not a dependency. The update watcher takes the toast API as an option. The app source uses a local class join, which the root does not export (the root `cn` is the clsx and tailwind-merge one). Tailwind must scan `node_modules/@vvedantb/ui/app/src/**/*.{ts,tsx}` so the class names are generated, and the app needs the `@vvedantb/ui/tokens` names (`bg-surface-card`, `divide-separator`, `text-muted-foreground` and so on).

```css
@source "../node_modules/@vvedantb/ui/app/src/**/*.{ts,tsx}";
```

## Confirm skip (Alt-click)

```tsx
import { ConfirmSkipHint, skipConfirmTitle, useRequestConfirm } from "@vvedantb/ui";

const { request } = useRequestConfirm();

<DropdownMenuItem
  title={skipConfirmTitle("Delete")}
  onSelect={(event) => request(() => setOpen(true), () => remove(), event)}
>
  Delete <ConfirmSkipHint />
</DropdownMenuItem>
```

- `useRequestConfirm` does not subscribe to Alt. It reads `getAltHeld()` when the request happens, so the menu owner does not re-render when Alt goes down. It returns `{ request }` only.
- `ConfirmSkipHint` stays mounted and gains a `hidden` class when Alt is not held, so an open Radix menu keeps a stable child tree.
- The Alt store resets when the last subscriber leaves, clears on blur and tab hide, and cancels a bare Alt keydown only inside `[role='menu']` or `[data-radix-menu-content]`.
- Also exported: `useAltHeld`, `getAltHeld`, `createAltHeldStore`, `bindToWindow`, `shouldSkipConfirm`, `requestConfirm`.

## Update available watcher

```ts
import { toast } from "sonner";
import { startUpdateAvailableWatcher } from "@vvedantb/ui";

useEffect(
  () =>
    startUpdateAvailableWatcher({
      origin: window.location.origin,
      toast,
      closeConvex: () => void convex.close(),
      enabled: !import.meta.env.DEV,
    }),
  [],
);
```

Options: `origin`, `toast`, `closeConvex?`, `pollMs?` (default 60000), `toastId?` (default `app-update-available`), `enabled?` (default true), `reload?` (default `window.location.reload`). On a changed asset fingerprint it shows a sticky "Update available" toast. Refresh calls `closeConvex` (errors ignored), then reloads. `fingerprintFromHtml` and `fetchDeployFingerprint` are exported too. The fingerprint looks for Vite `/assets/*.js` URLs in the index HTML.

## Settings chrome

```tsx
import { SettingsPage, SettingsSection, SettingsToggleRow } from "@vvedantb/ui";

<SettingsPage
  title="Notifications"
  layout={({ title, headerRight, toolbar, tabs, fillHeight, children }) => (
    <PageContainer title={title} rightSection={headerRight} toolbar={toolbar} tabs={tabs} noScroll={fillHeight}>
      {children}
    </PageContainer>
  )}
>
  <SettingsSection title="Email" bodyVariant="list">
    <SettingsToggleRow title="Weekly digest" action={<Switch />} />
  </SettingsSection>
</SettingsPage>
```

Exports: `SettingsSection`, `SettingsField`, `SettingsStack`, `SettingsToggleRow`, `SettingsEmptyState` (icon is `ComponentType<{ size?: number; className?: string }>`), `SettingsPage`. `SettingsField` `layout`: `"stacked"` (default) puts the label above the control. `"horizontal"` renders one row with the label and description on the left and the control on the right. Without `layout`, `SettingsPage` renders a plain `div` with a heading and the optional slots.

## useStableAuth

```ts
import { useStableAuth } from "@vvedantb/ui"; // 2000 ms debounce, wraps Clerk useAuth
import { createUseStableAuth } from "@vvedantb/ui";

const useAuth = createUseStableAuth(useClerkAuth, { debounceMs: 3000 });
```

After a signed-in session, a drop to signed-out reports `isLoaded: false` for the debounce window so Convex does not cascade. State is module-level. `resetStableAuthSession()` clears it and is for tests only.

## Develop

```sh
pnpm --filter @vvedantb/ui typecheck
pnpm --filter @vvedantb/ui test
```

Source is in `app/src` and tests in `app/tests`. Publish steps are in the root `README.md`.

## Theme

```tsx
import { createThemeProvider } from "@vvedantb/ui";

// One kit per app, at module level.
export const { ThemeProvider, useTheme } = createThemeProvider();

<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  <App />
</ThemeProvider>;

const { theme, resolvedTheme, setTheme, isDark, toggleTheme, mounted } = useTheme();
```

`createThemeProvider` is a port of next-themes 0.4.6. An app that uses next-themes can switch without a change in behaviour: the same localStorage writes, `<html>` classes and attributes, `style.colorScheme`, `prefers-color-scheme` listener, cross-tab `storage` sync and transition blocking. Parity tests run both side by side.

- Props, as in next-themes: `storageKey` (`"theme"`), `defaultTheme` (`"system"` with `enableSystem`, else `"light"`), `enableSystem` (`true`), `enableColorScheme` (`true`), `attribute` (`"data-theme"`; `"class"`, any `data-*`, or an array), `themes` (`["light", "dark"]`), `value` (theme name to written value), `forcedTheme`, `disableTransitionOnChange` (`false`) and `nonce`.
- State: `theme`, `setTheme` (a value or a function of the current theme), `resolvedTheme`, `systemTheme`, `forcedTheme` and `themes`, as in next-themes. Added: `mounted` (after the provider's first effect), `isDark` (`mounted && resolvedTheme === "dark"`) and `toggleTheme` (from `resolvedTheme`).
- `setTheme` is a new function each time `theme` changes and stable otherwise, as in next-themes, so effects that list it re-run at the same times.
- next-themes reads the DOM options (`attribute`, `themes`, `value`, `enableSystem`, `enableColorScheme`, `defaultTheme`, `disableTransitionOnChange`, `nonce`) once, on the first render, and so does this port. If `enableSystem` starts `false` and later turns `true`, a stored `"system"` is written as the class `system`. `forcedTheme` follows props.
- A nested `ThemeProvider` from the same kit renders only its children.
- `createThemeProvider({ missingProviderMessage })`: `useTheme()` outside the provider throws that message. Without it, `useTheme()` returns an empty state with no-op setters, as next-themes does.
- No inline script is rendered. next-themes renders one for server rendering; React does not run it in a client-rendered app. Keep a pre-paint script in `index.html` if the app has one.

For an app with its own theme state (for example a theme synced from the server), two helpers:

- `getSystemTheme()`: `"dark"` or `"light"` from `prefers-color-scheme`; `"light"` without `window`.
- `applyThemeClass(theme)`: removes `light` and `dark` from `<html>`, then adds `theme`. No-op without `document`.

## Page title

```tsx
import { createPageTitleContext } from "@vvedantb/ui";

export const { PageTitleProvider, usePageTitle, usePageTitleSync } = createPageTitleContext({
  missingProviderMessage: "usePageTitle must be used within a PageTitleProvider",
});

// The shell reads it:
const { pageTitle } = usePageTitle();
// A page publishes it while mounted:
usePageTitleSync(title);
```

- `usePageTitle()` returns `{ pageTitle, setPageTitle, mobileActionsSlot, setMobileActionsSlot }`. `mobileActionsSlot` is an element a mobile top bar registers (pass `setMobileActionsSlot` as its `ref`) so pages can portal actions into it.
- `usePageTitleSync(title)` sets the title while the caller is mounted and clears it on unmount. Titles that are not strings publish `""`.
- `missingProviderMessage`: `usePageTitle()` outside the provider throws it. Without it, `usePageTitle()` returns an empty title and no-op setters.
- `documentTitle` (off by default; without it `document.title` is never touched): `{ suffix?, separator? = " · ", fallback? }`. While a page title is set, `document.title` is `` `${pageTitle}${separator}${suffix}` `` (just the page title without a suffix). While it is empty, `fallback`, else the title at mount. The mount-time title comes back on unmount.

## Page motion

```tsx
import { MotionConfig } from "motion/react";
import { PageMotionProvider, useDisablePageMotion } from "@vvedantb/ui";

<PageMotionProvider disabled={flags?.disablePageMotion === true} motionConfig={MotionConfig}>
  <App />
</PageMotionProvider>;
```

- Sets `html[data-page-motion]` to `"off"` or `"on"` in a layout effect (CSS can skip page and route transitions on `"off"`). The attribute stays after unmount.
- Renders `motionConfig` with `reducedMotion` `"always"` when disabled, else `"never"`.
- `useDisablePageMotion()`: the `disabled` value, `false` outside the provider.
- This module does not import `motion`. Pass `MotionConfig`, or an app component that wraps it, defined at module level, for example with `LazyMotion`:

```tsx
function LazyMotionConfig({ reducedMotion, children }: PageMotionConfigProps) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </LazyMotion>
  );
}
```

## Compact relative time

```ts
import { formatCompactRelativeTime } from "@vvedantb/ui";

formatCompactRelativeTime(createdAt, { justNow: "now" }); // "now", "5m", "3h", "2d", "4mo", "1y"
formatCompactRelativeTime(updatedAt, { calendar: true }); // "42s", ..., calendar months and years
```

Pure TypeScript, no dependencies. Options:

- `now`: clock in ms, default `Date.now()`.
- `justNow`: returned for anything under a minute old, future times included. Without it the result is whole seconds (`"42s"`), and a future time gives `"0s"` or a negative count.
- `calendar`: `false` (default) counts elapsed time: a day is 24 hours, a month 30 days, a year 12 such months. `true` counts as `dayjs().diff(date, unit)` does: days by the local calendar across DST changes, and calendar months and years.

Strings are parsed with `new Date(string)`. dayjs parses a date-only string such as `"2026-03-01"` as local midnight, `new Date` as UTC midnight; numbers, `Date` objects and ISO strings with a time give the same result either way. An invalid date gives `"NaNy"` (`"0mo"` with `calendar`).

## Convex provider, VITE env and ensure-user (0.10.0)

Moved from `@vvedantb/convex-client` 0.1.0 with the same names and behaviour. Its non-React helpers (`mapLoadedQuery`, `forEachLoadedQuery`, `updateAllCachedQueries`, `patchLoadedQuery`, `OptimisticStore`, `tempId`, `createMemoryOptimisticStore`) moved to `@vvedantb/server` instead, so backend packages, tests and React Native can use them without loading this package.

### `ConvexClerkProvider`

```tsx
import { ConvexClerkProvider, useStableAuth } from "@vvedantb/ui";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

<ClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}>
  <ConvexClerkProvider client={convex} useAuth={useStableAuth}>
    <App />
  </ConvexClerkProvider>
</ClerkProvider>;
```

| Props | Renders |
| --- | --- |
| `client` is `null` or `undefined` | `children` alone (no provider). |
| `clerk={false}` | `<ConvexProvider client={client}>`. |
| otherwise | `<ConvexProviderWithClerk client={client} useAuth={useAuth}>`; `useAuth` defaults to `@clerk/clerk-react`'s. |

`clerk` defaults to `true`. Render it inside `ClerkProvider` unless `clerk` is `false`. Types: `ConvexClerkProviderProps`, `ConvexClerkUseAuth`.

### `parseClientEnv`

```ts
import { z } from "zod";
import { parseClientEnv } from "@vvedantb/ui";

export const clientEnv = parseClientEnv(import.meta.env, { z, viteEnv: "fallback" });
// { VITE_CONVEX_URL: string; VITE_CLERK_PUBLISHABLE_KEY: string; VITE_ENV: "development" | "staging" | "production" }

export const extensionEnv = parseClientEnv(import.meta.env, {
  z,
  viteEnv: false,
  extend: { VITE_CLERK_SYNC_HOST: z.string().url() },
});
```

The schema is `z.object({ VITE_CONVEX_URL: z.string().min(1), VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1), VITE_ENV: z.enum(["development", "staging", "production"]), ...extend })`, built with your `z` (zod 3.25+ or 4; the package never imports zod at runtime). Only the schema's keys are read from `rawEnv`. Failure throws the `ZodError` from `.parse`.

| `viteEnv` | `VITE_ENV` |
| --- | --- |
| `"strict"` (default) | Must be one of `VITE_ENV_NAMES`. |
| `"fallback"` | Any other value, or none, becomes `"development"` before parsing. |
| `false` | Not in the schema or the result. |

Types: `ClientEnv`, `ClientEnvWithoutViteEnv`, `ClientEnvOptions`, `ClientEnvSource`, `ViteEnvMode`, `ViteEnvName`.

### `useEnsureUser`

```tsx
function EnsureUser() {
  useEnsureUser(api.users.ensureUserExists);
  return null;
}
```

Calls `mutation({})` every time `useConvexAuth().isAuthenticated` becomes `true` (once on mount if already signed in), and logs a rejection with `console.error`. Needs a Convex auth provider above it (`ConvexClerkProvider` with Clerk on). Pair it with `ensureUser` from `@vvedantb/server`. Type: `EnsureUserMutation`.

Tests: `app/tests/convex/` ports each app's copy and runs it beside the helper (env with zod 4 and zod 3.25; provider variants; ensure-user calls over auth sequences). `app/tests-node/convex-esm.test.mjs` loads the helpers in plain Node.

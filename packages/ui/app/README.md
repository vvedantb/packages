# `@vvedantb/ui/app`

Shared web React helpers that were duplicated across apps. Source-exported as the `./app` subpath of `@vvedantb/ui`.

## Install

```sh
npm install @vvedantb/ui
```

## Peers

Required: `react` and `react-dom` (>=19). Optional peers of `@vvedantb/ui`, needed only for this subpath: `@clerk/clerk-react` (`useStableAuth`), `@tanstack/react-hotkeys` and `zod`.

`sonner` is not a dependency. The update watcher takes the toast API as an option. This subpath uses a local class join (`cn`), not the `cn` from `@vvedantb/ui`. Tailwind must scan `node_modules/@vvedantb/ui/app/src/**/*.{ts,tsx}` so the class names are generated, and the app needs the `@vvedantb/ui/tokens` names (`bg-surface-card`, `divide-separator`, `text-muted` and so on).

```css
@source "../node_modules/@vvedantb/ui/app/src/**/*.{ts,tsx}";
```

## Confirm skip (Alt-click)

```tsx
import { ConfirmSkipHint, skipConfirmTitle, useRequestConfirm } from "@vvedantb/ui/app";

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
import { startUpdateAvailableWatcher } from "@vvedantb/ui/app";

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
import { SettingsPage, SettingsSection, SettingsToggleRow } from "@vvedantb/ui/app";

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

Exports: `SettingsSection`, `SettingsField`, `SettingsStack`, `SettingsToggleRow`, `SettingsEmptyState` (icon is `ComponentType<{ size?: number; className?: string }>`), `SettingsPage`. Without `layout`, `SettingsPage` renders a plain `div` with a heading and the optional slots.

## useStableAuth

```ts
import { useStableAuth } from "@vvedantb/ui/app"; // 2000 ms debounce, wraps Clerk useAuth
import { createUseStableAuth } from "@vvedantb/ui/app";

const useAuth = createUseStableAuth(useClerkAuth, { debounceMs: 3000 });
```

After a signed-in session, a drop to signed-out reports `isLoaded: false` for the debounce window so Convex does not cascade. State is module-level. `resetStableAuthSession()` clears it and is for tests only.

## Develop

```sh
pnpm --filter @vvedantb/ui typecheck
pnpm --filter @vvedantb/ui test
```

Source is in `app/src` and tests in `app/tests`. Publish steps are in the root `README.md`.

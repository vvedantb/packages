# @vvedantb/app-kit

Shared web React helpers that were duplicated across apps. Compiled ESM with types. Not yet published to npm.

## Install

```sh
npm install @vvedantb/app-kit
```

## Peers

Required: `react` and `react-dom` (>=19), `@clerk/clerk-react`, `@tanstack/react-hotkeys`, `zod`.

`sonner` is not a dependency. The update watcher takes the toast API as an option. `@vvedantb/ui` is not a peer: the package uses a local class join (`cn`), so apps that do not scan `@vvedantb/ui` still work. Tailwind must scan `node_modules/@vvedantb/app-kit/dist/**/*.js` so the class names are generated, and the app needs the `@vvedantb/tokens` names (`bg-surface-card`, `divide-separator`, `text-muted` and so on).

```css
@source "../node_modules/@vvedantb/app-kit/dist/**/*.js";
```

## Confirm skip (Alt-click)

```tsx
import { ConfirmSkipHint, skipConfirmTitle, useRequestConfirm } from "@vvedantb/app-kit";

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
import { startUpdateAvailableWatcher } from "@vvedantb/app-kit";

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
import { SettingsPage, SettingsSection, SettingsToggleRow } from "@vvedantb/app-kit";

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
import { useStableAuth } from "@vvedantb/app-kit"; // 2000 ms debounce, wraps Clerk useAuth
import { createUseStableAuth } from "@vvedantb/app-kit";

const useAuth = createUseStableAuth(useClerkAuth, { debounceMs: 3000 });
```

After a signed-in session, a drop to signed-out reports `isLoaded: false` for the debounce window so Convex does not cascade. State is module-level. `resetStableAuthSession()` clears it and is for tests only.

## Develop and publish

```sh
pnpm --filter @vvedantb/app-kit build
pnpm --filter @vvedantb/app-kit test
```

Publish from a logged-in npm machine after a version bump in `package.json`. There is no CI publish.

```sh
pnpm --filter @vvedantb/app-kit exec npm publish --access public
```

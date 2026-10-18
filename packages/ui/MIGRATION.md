# Migrating to the single JavaScript entry (0.4.0-rc.1)

From 0.4.0-rc.1, `@vvedantb/ui` has one JavaScript entry: the root (`.`). Every JS subpath is removed from `exports`. Change each import to `@vvedantb/ui`. CSS and Tailwind preset paths do not change.

The public surface is `@vvedantb/ui`, plus the CSS paths and `@vvedantb/ui/tokens/tailwind-preset`. Consumers import from nothing else. The internal layout is unchanged: `src/composer/`, `src/app/`, `src/shell/`, `src/audio/` and the other folders stay separate, and `src/index.ts` only re-exports from them. Removing the JS subpath exports does not mean collapsing those directories.

## Old subpath to root replacement

| Old import | New import | Notes |
| --- | --- | --- |
| `@vvedantb/ui/cn` | `@vvedantb/ui` | `cn`. |
| `@vvedantb/ui/sonner` | `@vvedantb/ui` | `SonnerToaster`, its helpers and `toast`. |
| `@vvedantb/ui/audio` | `@vvedantb/ui` | `playChime`, `useReplyChime`, `playTone` and the floor helpers. |
| `@vvedantb/ui/shell` | `@vvedantb/ui` | `SidebarHeader`, `PillTabs`, `SessionsHoverCard` and their types. Not `cn`: use the root `cn`. |
| `@vvedantb/ui/app` | `@vvedantb/ui` | Confirm helpers, settings chrome, `useStableAuth`, update watcher and their types. |
| `@vvedantb/ui/composer` | `@vvedantb/ui` | Removed earlier in 0.4.0-rc.1. See [`composer/MIGRATION-INPUTAREA.md`](composer/MIGRATION-INPUTAREA.md). |
| `@vvedantb/ui/tokens/native` | `@vvedantb/ui` | Native tokens: `tokens` and the `Tokens` type. |

Kept paths (not JS component APIs):

- `@vvedantb/ui/tokens`, `@vvedantb/ui/tokens/tokens.css`, `@vvedantb/ui/tokens/css/*` and `@vvedantb/ui/tokens/compat/shadcn-rgb.css`: CSS.
- `@vvedantb/ui/tokens/tailwind-preset`: Tailwind `@config` needs a resolvable package path. It is a build-tool entry (`.mjs`), not a React API.
- `@vvedantb/ui/package.json`.

## Export name collisions

| Name | Shell or app copy | Root copy | Resolution |
| --- | --- | --- | --- |
| `cn` | `shell/src/cn.ts`: `filter(Boolean).join(" ")` | `utils/cn.ts`: `clsx` and `tailwind-merge` | Root `cn` only. Shell `cn` and `ClassValue` are not exported. |

The root `cn` is richer. It merges conflicting Tailwind classes, so `cn("p-2", "p-4")` returns `p-4`. The shell `cn` returned `p-2 p-4`. Output can differ where a caller relied on both classes being present. The root `cn` also accepts objects and arrays.

`tsc` reports no other duplicate names across the root, shell, app and native token exports. `tokens` and `Tokens` keep their names from `tokens/native`.

## Peer dependencies

`motion` is now optional in `peerDependenciesMeta`, with `@clerk/clerk-react`, `@tanstack/react-hotkeys` and `zod`. No peer was removed or added.

Because everything is one entry, a tool that resolves every import in the barrel (a type check, or a dev server that does not tree-shake) still needs those packages installed. A production build that tree-shakes needs them only for the features it uses. Install `motion`, `@clerk/clerk-react` and the rest if your tooling fails to resolve them.

## Known consumer files that import old JS subpaths

Source: a scan of shallow clones of public repositories. Not dated. Not re-run against current `main`. Change `from "@vvedantb/ui/<subpath>"` to `from "@vvedantb/ui"` in each file.

**vvedantb/vmem**

- `apps/web/src/providers/ConvexClientProvider.tsx`
- `apps/web/src/providers/EnsureUser.tsx`
- `apps/web/src/components/shell/BulkSelectionDeleteBar.tsx`
- `apps/web/src/components/shell/Sidebar.tsx` (`/shell`)
- `apps/web/src/components/shell/tab-pills.test.ts` (asserts the `/shell` string)
- `apps/web/src/components/sidebar/sidebar-rail.test.ts` (asserts the `/shell` string)
- `apps/web/src/components/sidebar/SidebarUserMenu.tsx`
- `apps/web/src/components/api-keys/useApiKeyActions.ts`
- `apps/web/src/components/api-keys/ApiKeyRow.tsx`
- `apps/web/src/components/teams/TeamSettings.tsx`
- `apps/web/src/components/teams/TeamMembers.tsx`
- `apps/web/src/components/files/FilePreviewModal.tsx`
- `apps/web/src/components/settings/preferences/PreferencesPage.tsx`
- `apps/web/src/components/settings/preferences/PreferencesPageSkeleton.tsx`
- `apps/web/src/components/settings/ExperimentalSettingsClient.tsx`
- `apps/web/src/components/settings/ExtensionSettingsClient.tsx`
- `apps/web/src/components/settings/ConnectorsClient.tsx`
- `apps/web/src/components/settings/ConnectorActionsMenu.tsx`
- `apps/web/src/components/settings/ConnectorCard.tsx`
- `apps/web/src/components/settings/ImportPageClient.tsx`
- `apps/web/src/components/settings/SettingsPage.tsx`
- `apps/web/src/components/settings/settingsChrome.test.ts`
- `apps/web/src/components/_components/ListItemRow.tsx`
- `apps/web/src/components/_components/TagsListView.tsx`
- `apps/web/src/components/_components/TagMemoriesPanel.tsx`
- `apps/web/src/components/_components/RelatedMemories.tsx`
- `apps/web/src/components/_components/GraphDetailPanel.tsx`
- `apps/web/src/components/memories/MemoryTimelineView.tsx`
- `apps/web/src/components/memories/MemoryDetailPanel.tsx`
- `apps/web/src/components/memories/MemorySearch.tsx`
- `apps/web/src/components/profiles/ProfileCard.tsx`
- `apps/web/src/components/profiles/ProfilesPage.tsx`
- `apps/web/src/components/profiles/DefaultProfilesSection.tsx`
- `apps/web/src/components/skills/SystemSkillDetail.tsx`
- `apps/web/src/components/skills/SkillHeaderActions.tsx`
- `apps/web/src/routes/_main/$profileId/team/route.tsx`
- `apps/web/src/routes/_main/settings/api/-components/KeysPanel.tsx`
- `apps/web/src/routes/_main/settings/data-controls/-components/DangerZonePanel.tsx`
- `apps/web/src/routes/_main/settings/data-controls/export.tsx`
- `oxlint-plugin-vmem/test/rules.test.mjs` (`/cn`)
- `oxlint-plugin-vmem/rules/no-deep-package-imports.mjs` (a comment mentions `/cn`)

`apps/web/src/globals.css` has `@source` lines into `shell/src` and `app/src`. These are filesystem globs, not export-map imports. They keep working while `files` includes those directories. CSS `@import "@vvedantb/ui/tokens..."` is unchanged.

**vvedantb/bee** and **vvedantb/eva**: no JS subpath imports found (root and tokens only).

**vvedantb/vibot**, **verve**, **velth** and **vhub**: not publicly cloneable and not found through `gh` for this scan. Not checked. Search each for `@vvedantb/ui/(cn|sonner|audio|shell|app|composer|tokens/native)`.

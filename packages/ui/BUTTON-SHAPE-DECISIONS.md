# Button shape audit (0.31.0)

Temporary file for the PR description. Delete once it has been pasted.

`Button` is now `shape="pill"` (`rounded-full`) by default. `shape="rounded"` keeps the 0.30.2 radius: `rounded-lg`, and `rounded-md` on `xs` and `icon-xs`. A caller `className` radius still merges last and wins.

Two facts shaped the decisions below:

- With the default `--radius` (1rem), `rounded-lg` is 16px and `rounded-md` is 14px. Buttons 32px tall or less (`sm`, `icon-sm`, `xs`, `icon-xs`) were already fully round in 0.30.2. The visible change is on `default`, `lg` and `icon` (40–44px) and on taller custom heights. `rounded` still follows `--radius`, so it matters for apps that set a smaller one.
- `ButtonGroup` sets its edge classes on the group (`[&>*:not(:first-child)]:rounded-l-none` and so on). They win on specificity, so pill children still join on their inner edges. Only the outer ends change, to half circles. tailwind-merge is not involved, because the classes are on different elements.

## `shape="rounded"` (opt out)

| Call site | File | Why |
| --- | --- | --- |
| `InputGroupButton` | `src/ui/input-group.tsx` | A field addon. Its size classes already set `rounded-lg`, which wins in the default path. `shape="rounded"` keeps `rounded-lg` when `UiConfig.InputGroup.classes.button.size` replaces those classes. `shape` is left out of its props, because a `shape="pill"` prop would lose to the size class. Change the radius with `className`. |
| `InputGroupButtonAlt` (deprecated) | `src/ui/input-group.alt.tsx` | Same as `InputGroupButton`. DOM unchanged (alt-wrappers snapshot). |
| `PromptInputButton`, `PromptInputSubmit`, `PromptInputActionMenuTrigger` | `src/ai-elements/prompt-input.tsx` | No code change: they render `InputGroupButton`, so they keep the field-addon radius. At the default `--radius`, the 32px submit is already a circle. An app can opt in with `className="rounded-full"` or `UiConfig.PromptInput.classes.submit`. **For review:** the brief listed "prompt submit" with buttons that become circles. |
| `MessageBranchPrevious`, `MessageBranchNext` | `src/ai-elements/message.tsx` | Joined to the page label in a `ButtonGroup` with `rounded-md` inner corners. Default `shape="rounded"`; a `shape` prop still wins. |
| `AccountTrigger` | `shell/src/SidebarAccountMenu.tsx` | A rail tile. `railTileClass` already sets `rounded-lg`. `shape` left out of its props. DOM unchanged (legacy-dom fixture). |
| `MobileMenuButton` | `shell/src/SidebarChrome.tsx` | `mobileMenuButtonClass` already sets `rounded-lg`. `shape` left out of its props. DOM unchanged. |
| `PanelClose` | `shell/src/SidebarPanel.tsx` | `panelCloseButtonClass` already sets `rounded-lg`. `shape` left out of its props. DOM unchanged. |

## Keep pill (default)

Standalone buttons, or buttons in spaced rows (`gap-*`), with no radius of their own.

| Call site | File | Note |
| --- | --- | --- |
| `AlertDialogAction`, `AlertDialogCancel` | `src/ui/alert-dialog.tsx` | Dialog footer buttons. The dialog surface radius is unchanged. |
| `ConfirmDialog.Cancel`, `ConfirmDialog.Action` (and `SignOutDialog`, built from them) | `src/ui/confirm-dialog-parts.tsx`, `shell/src/SignOutDialog.tsx` | Same. legacy-dom fixture: radius only. |
| `Pagination` | `src/ui/pagination.tsx` | `gap-1` row. |
| `SlideOverPanel` close | `src/ui/slide-over-panel.tsx` | |
| `ToggleSearch` (`large`) trigger | `src/ui/toggle-search.tsx` | `icon-sm`: already round at the default `--radius`. |
| `MessageAction` | `src/ai-elements/message.tsx` | `MessageActionsBar` is a `gap-1` row. |
| `ArtifactAction`, `ArtifactClose` | `src/ai-elements/artifact.tsx` | `ArtifactActions` is a `gap-1` row, not a joined strip. The default 40×24 action becomes a stadium. |
| `CodeBlockCopyButton` | `src/ai-elements/code-block.tsx` | |
| `ContextUsageTrigger` | `src/ai-elements/context.tsx` | |
| `AgentPlanTrigger` | `src/ai-elements/plan.tsx` | |
| Queue widget Cancel, Save, edit, remove | `src/ai-elements/queue.tsx` | `gap-2` and `gap-1` rows. Queue snapshot: radius only. |
| `WebPreviewNavigationButton` | `src/ai-elements/web-preview.tsx` | |
| Artifact list toolbar filter and grid/list toggles | `src/artifacts/artifact-list-toolbar.tsx` | The toggles are a `gap-1` row, not a segmented control. |
| `ArtifactVersionsMenu` trigger | `src/artifacts/artifact-versions-menu.tsx` | |
| `PromoBanner` action and dismiss | `src/composer/input-area/PromoBanner.tsx` | |
| Landing mobile menu trigger | `src/marketing/landing.tsx` | Ghost icon button becomes a circle. |
| `createLandingKit` GitHub link | `src/marketing/createLandingKit.tsx` | Same. |

## Unchanged: an explicit radius class wins

These pass a radius in `className`, which merges after `shape`. No `shape` prop needed.

| Call site | File | Radius |
| --- | --- | --- |
| `QueueItemAction` | `src/ai-elements/queue.tsx` | `rounded-md` |
| `AttachmentRemove` | `src/ai-elements/attachments.tsx` | `rounded-full` (grid), `rounded` (inline, list) |
| `PricingModal` CTAs | `src/marketing/PricingModal.tsx` | `rounded-xl` (monthly), `rounded-full` (plans) |
| `SiteFooter` social buttons | `src/marketing/marketing-classes.ts` | `rounded-lg`. These stay rounded squares. Removing `rounded-lg` from the class map would make them circles. Not done; say if wanted. |
| `CarouselPrevious`, `CarouselNext` | `src/ui/carousel.tsx` | `rounded-full` |
| `Suggestions` scroll arrows, `Suggestion` | `src/ai-elements/suggestion.tsx` | `rounded-full` |
| `SpeechInput` | `src/ai-elements/speech-input.tsx` | `rounded-full` |
| `ConversationScrollButton`, `ConversationDownload` | `src/ai-elements/conversation.tsx` | `rounded-full` |
| `ComposerIconButton`, add button, stop and submit | `src/composer/Composer.tsx`, `src/composer/input-area/*` | `rounded-full` |
| `SidebarUpgradeCard` | `shell/src/SidebarUpgradeCard.tsx` | `rounded-full` |

## Unchanged: not `Button`

`BulkActionBar` (native buttons, `rounded-lg`), Calendar day cells, `Tabs` pills, segmented lists and `TabsBar`, Sonner toast actions, `Input`, `Textarea`, `Select` triggers, `Card`, menus, popovers and dialog surfaces.

## Not changed, for follow-up

- `ButtonGroup` does not change its children's shape. App code that puts default `Button`s in a `ButtonGroup` gets half-circle outer ends. A follow-up could have `ButtonGroup` give its `Button` children a `rounded` default through context. That is outside this change.
- `UiConfig.Button`: the radius moved out of `classes.base` and the size strings into `classes.shape`. An app that replaced `base` and relied on that to drop the radius now gets `rounded-full`. No app in this repo sets `UiConfig.Button.classes`.

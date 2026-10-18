# Migrating the app composer to `InputArea`

Replace the app `InputAreaCore` with `InputArea` from `@vvedantb/ui` (0.4.0-rc.1). The package holds the UI. The app keeps data, routing, billing and skills. This note lists what the app passes so the output stays the same.

```ts
import {
  InputArea,
  ConnectionStatusMenuItem,
  buildComposerSlashItems,
} from "@vvedantb/ui";
```

The root export includes the types too (`InputAreaProps`, `InputAreaSlashContext`, `ConnectionStatusMenuItemProps`, `ComposerSlashItem` and others). The `@vvedantb/ui/composer` subpath was removed in 0.4.0-rc.1. The root is tree-shakeable, and an app that imports no composer symbols gets no composer code.

Source for the mapping: `apps/web/src/components/chat/input/InputAreaCore.tsx`, the chat route and `ProjectInputArea.tsx` (source tarball, not dated). Anything marked **check** could not be confirmed from the tarball.

## What `InputAreaCore` fetched itself, and where it goes

| Was inside `InputAreaCore` | Now |
| --- | --- |
| Draft in `useLocalStorage(storageKey)`, or controlled `value` and `onChange` | App passes `value` and `onChange`. Keep the storage hook in a thin app wrapper. |
| `useFileUpload()` (pending images and files, upload, remove) | App owns it. Passes `fileCount` (images plus files), `onFilesSelected={handleFilesSelect}` and `isUploading`. Preview strip goes in `attachments`. |
| `useSkillSelection()` (chips, selected ids) | App owns it. Passes `chipCount={chips.length}`, `onRemoveLastChip={removeLastChip}` and `chips={<ComposerSkillChips .../>}`. |
| `useSendMessage()` | App owns it. Passes `isStreaming`, `isSending`, `onStop={abort}`. `onSubmit` does the work below. |
| Submit handler (merge skill tokens, clear, upload, `registerTempChatFile`, send, error toasts, `PricingModal`) | App's `onSubmit(text)`. The package trims the text and calls `onChange("")` first. The app merges skill tokens, uploads, sends, and calls `setValue(text)` on failure. Project chat calls its own `onSubmit(text, files)` here. |
| `useInputFeatures()` and `getMetadata` (privacy flag) | App computes `bannerFeatures`. Passes `banners={<InputBanners features={...} styles={...} />}` and `borderClassName={getBorderStyles(features)}`. |
| `UpgradeBanner` (30 s timer, `useHasPro`, `PricingModal`) | App keeps the timer, `hasPro` and the modal. Passes `promoBanner={<PromoBanner show={visible && !dismissed} onUpgrade={openPricing} onDismiss={dismiss} />}`. |
| `useMessageQueue()` and the `Queue` markup | App passes `queue={<Queue ...>...</Queue>}` using the package `Queue` parts, as before. |
| `useComposerSlashItems()` (builds items, runs them, `navigate`) | App calls `buildComposerSlashItems({ actionFeatures, bannerFeatures, showFileUpload, includeNewChat: true, hubSkills, manualSkills, selectedManualIds })` and passes `slashItems`. `onSlashSelect(item, { openFilePicker })` runs the action: skills toggle, `new-chat` and `artifacts` navigate, `attach` calls `openFilePicker()`, `privacy` toggles the feature. |
| `SkillHoverCard` inside slash rows | `renderSlashItem={(item, row) => item.preview ? <SkillHoverCard preview={item.preview} hoverOnly><span className="flex w-full min-w-0">{row}</span></SkillHoverCard> : row}` |
| `useComposerPrediction` (Convex flag and action) | `getPrediction={(text) => completeText({ text })}` and `predictionEnabled={flags?.composerPredictions === true}`. |
| `useReplyChime(chatId, isStreaming)` | Stays in the app. Not part of the composer. |
| `SkillPicker` and the connection row in the plus menu | `plusMenuExtra={<><SkillPicker /><DropdownMenuSeparator /><ConnectionStatusMenuItem icon={<AppBrandIcon connected={connected} />} label={connected ? appName : `Connect ${appName}`} description={description} connected={connected} title={...} onClick={() => navigate(...)} /></>}`. Render nothing while preferences load, as the old row did. |
| `actionFeatures.dictate` | `showDictate={actionFeatures.dictate}` |
| `showFileUpload` | `showFileUpload` (same name) |
| `showBanners`, `showUpgradeBanner` | Pass the `banners` and `promoBanner` slots, or leave them out. |
| `placeholder` | `placeholder` (package default is `"Ask anything..."`) |

## Props for the two call sites

Both sites pass the same chrome strings. The strings below are **not in the tarball** (`chatComposerClassName`, `getBorderStyles`, `submitButtonStyles`, `bannerStyles`): the app passes its existing values.

| Prop | Value |
| --- | --- |
| `className` | `chatComposerClassName` |
| `borderClassName` | `getBorderStyles(activeBannerFeatures)` |
| `submitButtonClassName` | `submitButtonStyles.bg` |
| `submitIconClassName` | `submitButtonStyles.text` |
| `banners` `styles` | `bannerStyles` (shape `{ privacy: { wrapper, icon, title, detail } }`) |

Main chat (`chat.tsx`): `MAIN_CHAT_ACTION_FEATURES`, no `value`. Wrap the local-storage draft. Send with the app `send`.

Project chat (`ProjectInputArea.tsx`): `value` and `onChange` from the route, `CONTEXT_CHAT_ACTION_FEATURES`, and `onSubmit` forwarded to the route's `onSubmit(text, files)`. Placeholder: `Ask ... about ${projectName ?? "your project"}...`.

## Differences to check

- Ghost text: new prop `predictionTextClassName`, applied to the ghost suggestion span. The default is `text-muted`, as in the original app composer, so nothing changes on migration. To use the token-safe class, pass `predictionTextClassName="text-muted-foreground"`. The default needs a `text-muted` utility in the app theme.
- The app `@vv/ui` adapters (`Dropdown`, `DropdownTrigger`, `DropdownItem`, `Button startContent`) are not in the tarball. The package uses its own `DropdownMenu*` parts and the new optional `startContent` and `description`. **Check** that the app adapters render the same row layout (icon, then label with a second description line).
- `FadePresence` and the fast transition are rebuilt from the call sites. **Check** against the app versions.
- `InputArea` wraps itself in `LazyMotion` (`domAnimation`) and `TooltipProvider`. Nested providers are harmless.
- The hidden file input and drag-and-drop exist only when `onFilesSelected` is passed.
- The slash menu is off unless `slashItems` is non-empty.
- Brand names in the original copy ("Private mode" text, privacy banner wording) are generic in the package and can be overridden with `privacyTitle` and `privacyDetail`.

## Not done here

- The 0.3 `Composer` is deprecated, not removed. Replacing it in a later release would be cleaner, because two composers and two prediction hooks is confusing. It is a breaking change for consumers, so it needs its own release decision.
- Parity was measured against a frozen snapshot with stubs, not the live app. See `examples/parity/PARITY.md` for the limits.

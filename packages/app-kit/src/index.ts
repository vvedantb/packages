export {
  bindToWindow,
  createAltHeldStore,
  getAltHeld,
  useAltHeld,
  type AltHeldBinding,
  type AltHeldSignals,
  type AltHeldStore,
  type AltKeyEvent,
} from "./confirm/useAltHeld.js";
export { requestConfirm, shouldSkipConfirm } from "./confirm/confirmSkip.js";
export { useRequestConfirm } from "./confirm/useRequestConfirm.js";
export { ConfirmSkipHint, skipConfirmTitle } from "./confirm/ConfirmSkipHint.js";

export {
  fetchDeployFingerprint,
  fingerprintFromHtml,
} from "./update/deployFingerprint.js";
export {
  startUpdateAvailableWatcher,
  type UpdateAvailableWatcherOptions,
  type UpdateToastOptions,
} from "./update/updateWatcher.js";

export { SettingsSection } from "./settings/SettingsSection.js";
export { SettingsField } from "./settings/SettingsField.js";
export { SettingsStack } from "./settings/SettingsStack.js";
export { SettingsToggleRow } from "./settings/SettingsToggleRow.js";
export { SettingsEmptyState } from "./settings/SettingsEmptyState.js";
export {
  DefaultSettingsLayout,
  SettingsPage,
  type SettingsLayoutProps,
  type SettingsPageProps,
} from "./settings/SettingsPage.js";

export {
  createUseStableAuth,
  resetStableAuthSession,
  useStableAuth,
  type ClerkAuthSlice,
  type StableAuthOptions,
} from "./auth/useStableAuth.js";

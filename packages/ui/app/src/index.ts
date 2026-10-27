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

export {
  SettingsSection,
  type SettingsSectionConfig,
} from "./settings/SettingsSection.js";
export { SettingsField } from "./settings/SettingsField.js";
export { SettingsStack } from "./settings/SettingsStack.js";
export { SettingsToggleRow } from "./settings/SettingsToggleRow.js";
export {
  SettingsEmptyState,
  type SettingsEmptyStateConfig,
} from "./settings/SettingsEmptyState.js";
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

export {
  applyThemeClass,
  createThemeProvider,
  getSystemTheme,
  type ThemeAttribute,
  type ThemeProviderKit,
  type ThemeProviderOptions,
  type ThemeProviderProps,
  type ThemeState,
} from "./theme/createThemeProvider.js";

export {
  createPageTitleContext,
  type DocumentTitleOptions,
  type PageTitleContextKit,
  type PageTitleContextOptions,
  type PageTitleValue,
} from "./page-title/createPageTitleContext.js";

export {
  PageMotionProvider,
  useDisablePageMotion,
  type PageMotionConfigProps,
  type PageMotionProviderProps,
} from "./page-motion/PageMotionProvider.js";

export {
  formatCompactRelativeTime,
  type CompactRelativeTimeOptions,
} from "./time/compactRelativeTime.js";

export {
  ConvexClerkProvider,
  type ConvexClerkProviderProps,
  type ConvexClerkUseAuth,
} from "./convex/ConvexClerkProvider.js";
export {
  parseClientEnv,
  VITE_ENV_NAMES,
  type ClientEnv,
  type ClientEnvOptions,
  type ClientEnvSource,
  type ClientEnvWithoutViteEnv,
  type ViteEnvMode,
  type ViteEnvName,
} from "./convex/env.js";
export { useEnsureUser, type EnsureUserMutation } from "./convex/useEnsureUser.js";
export { convexErrorMessage, userFacingErrorMessage } from "./convex/errorMessage.js";
export { useHeldResult } from "./convex/useHeldResult.js";

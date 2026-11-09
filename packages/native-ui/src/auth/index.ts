// Clerk + Convex providers and the shared sign-in and sign-up screens. On
// `@vvedantb/native-ui/auth` only: they import `@clerk/clerk-expo`, `convex`,
// `expo-auth-session`, `expo-web-browser` and `expo-router`, and Metro does not
// tree-shake.
export { AuthProviders } from "./AuthProviders";
export type { AuthProvidersProps } from "./AuthProviders";
export { AuthScreen, OrDivider, FieldError } from "./AuthScreen";
export type { AuthScreenProps } from "./AuthScreen";
export {
  authErrorMessage,
  logAuthFailure,
  withAuthTimeout,
  AuthTimeoutError,
  isAuthTimeoutError,
  AUTH_TIMEOUT_CODE,
  DEFAULT_STAGE_TIMEOUT_MS,
  CREDENTIAL_ERROR_CODES,
} from "./authErrors";
export type { AuthErrorOptions } from "./authErrors";
export {
  GoogleSignInButton,
  useGoogleSignIn,
  useWarmUpBrowser,
  GOOGLE_ERROR_MESSAGE,
} from "./GoogleSignInButton";
export type {
  AuthNavigationOptions,
  GoogleSignInOptions,
  GoogleSignInButtonProps,
} from "./GoogleSignInButton";
export { SignInScreen, SignUpScreen, AUTH_MESSAGES } from "./SignInScreen";
export type { IncompleteSignIn, SignInMode, SignInScreenProps, SignUpScreenProps } from "./SignInScreen";
export { SecondFactorScreen } from "./SecondFactorScreen";
export type { SecondFactorScreenProps } from "./SecondFactorScreen";
export {
  submitTotpSecondFactor,
  submitSecondFactor,
  prepareSecondFactorIfNeeded,
  prepareFirstFactorIfNeeded,
  submitFirstFactor,
  pickFirstFactorStrategy,
  supportedFirstFactorStrategies,
  FIRST_FACTOR_PREFERENCE,
  pickSecondFactorStrategy,
  supportedSecondFactorStrategies,
  SECOND_FACTOR_PREFERENCE,
  useSecondFactor,
  TOTP_MESSAGES,
} from "./totp";
export type {
  FirstFactor,
  FirstFactorResult,
  FirstFactorSignIn,
  FirstFactorStrategy,
  SecondFactor,
  SecondFactorSignIn,
  SecondFactorStrategy,
  TotpResult,
  TotpSignIn,
  TotpSetActive,
  UseSecondFactorOptions,
  UseSecondFactorResult,
} from "./totp";

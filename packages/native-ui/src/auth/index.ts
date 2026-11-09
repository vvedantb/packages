// Clerk + Convex providers and the shared sign-in and sign-up screens. On
// `@vvedantb/native-ui/auth` only: they import `@clerk/clerk-expo`, `convex`,
// `expo-auth-session`, `expo-web-browser` and `expo-router`, and Metro does not
// tree-shake.
export { AuthProviders } from "./AuthProviders";
export type { AuthProvidersProps } from "./AuthProviders";
export { AuthScreen, OrDivider, FieldError } from "./AuthScreen";
export type { AuthScreenProps } from "./AuthScreen";
export { authErrorMessage } from "./authErrors";
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
  pickSecondFactorStrategy,
  supportedSecondFactorStrategies,
  SECOND_FACTOR_PREFERENCE,
  useSecondFactor,
  TOTP_MESSAGES,
} from "./totp";
export type {
  SecondFactor,
  SecondFactorSignIn,
  SecondFactorStrategy,
  TotpResult,
  TotpSignIn,
  TotpSetActive,
  UseSecondFactorOptions,
  UseSecondFactorResult,
} from "./totp";

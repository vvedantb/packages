// Stand-ins for the app modules the fixture copies import (Clerk, env, router,
// theme, brand icons and app-only landing sections). The parity tests pass the
// same stubs to the shared components, so both sides render identical leaves.
import type { ReactNode } from "react";

export { default as dayjs } from "dayjs";

/** Mutable switches the tests flip between renders. */
export const stubEnv = { clerk: true, dev: true, isDark: false };

export const clerkConfigured = () => stubEnv.clerk;
export const clientEnv = { VITE_ENV: "production" };
export const getAppCProPlanId = () => "plan_prod";
export const AGENT_LOGIN_PATH = "/agent-login";

// Clerk's buttons only add a click handler to their child; markup is the child's.
export function SignInButton({ children }: { mode?: "modal" | "redirect"; children: ReactNode }) {
  return <>{children}</>;
}
export function SignUpButton({ children }: { mode?: "modal" | "redirect"; children: ReactNode }) {
  return <>{children}</>;
}
export function SignedIn({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function CheckoutButton({ children }: { planId: string; planPeriod: "month" | "annual"; children: ReactNode }) {
  return <>{children}</>;
}

export const stubUser = {
  fullName: "Test User",
  imageUrl: "https://example.com/avatar.png",
  primaryEmailAddress: { emailAddress: "user@example.com" },
};
export const useUser = () => ({ user: stubUser });
export const stubClerk = {
  openUserProfile: () => undefined,
  signOut: async () => undefined,
};
export const useClerk = () => stubClerk;

export const stubToggleTheme = () => undefined;
export const useThemeContext = () => ({ isDark: stubEnv.isDark, toggleTheme: stubToggleTheme });
export const useTheme = () => ({ theme: stubEnv.isDark ? "dark" : "light", toggleTheme: stubToggleTheme });
export const useNavigate = () => (_options: { to: string }) => Promise.resolve();

export function LandingWordmark() {
  return <span data-stub="wordmark-a">app-a</span>;
}
export function AppELandingWordmark() {
  return <span data-stub="wordmark-e">app-e</span>;
}
export function AppIcon({ name, size }: { name: string; size: number; framed?: boolean }) {
  return <svg data-stub={`icon-${name}`} width={size} height={size} />;
}

function section(name: string) {
  return function Section() {
    return <section data-stub={name} />;
  };
}
export const LandingAmbientGraph = section("ambient-graph");
export const LandingAppStage = section("app-stage");
export const LandingRecallDemo = section("recall-demo");
export const LandingHowItWorks = section("how-it-works");
export const LandingSurfaces = section("surfaces");
export const LandingFeatures = section("features");
export const LandingIntegrations = section("integrations");
export const LandingConnect = section("connect");

// app-e's landing files after adopting the shared landing kit. Each section is
// the new body of the file named in its heading; the app keeps landingContent.ts
// and its landing-only sections.
import { motion } from "motion/react";
import { IconArrowRight } from "@tabler/icons-react";
import {
  Button,
  createLandingKit,
  LandingFooter as KitLandingFooter,
  LandingNavMenu as KitLandingNavMenu,
  LandingPageLayout,
  landingFooterButtonClass,
  landingFooterLinkClass,
} from "../../../../src/index";
import {
  AppELandingWordmark,
  AppIcon,
  clerkConfigured,
  LandingConnect,
  LandingFeatures,
  LandingIntegrations,
  SignInButton,
  SignUpButton,
} from "../fixtures/stubs";
import {
  APP_E_GITHUB_URL,
  LANDING_NAV_LINKS,
} from "../fixtures/app-e/landingContent";
import { LandingHero } from "../fixtures/app-e/LandingHero";

// --- LandingReveal.tsx ---
export const { LandingReveal, LandingRevealItem, LandingNav: KitLandingNav, LandingCta: KitLandingCta } =
  createLandingKit({ motion });

// --- LandingNavMenu.tsx ---
export function LandingNavMenu() {
  return (
    <KitLandingNavMenu
      links={LANDING_NAV_LINKS}
      github={{ href: APP_E_GITHUB_URL, icon: <AppIcon name="GitHub" size={16} framed={false} /> }}
    />
  );
}

// --- LandingNav.tsx ---
export function LandingNav() {
  return (
    <KitLandingNav
      brand={<AppELandingWordmark />}
      homeLabel="app-e home"
      links={LANDING_NAV_LINKS}
      github={{
        href: APP_E_GITHUB_URL,
        label: "app-e on GitHub",
        icon: <AppIcon name="GitHub" size={18} framed={false} />,
      }}
      actions={
        clerkConfigured() ? (
          <>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="text-muted hover:text-foreground">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="px-3.5">
                Get started
              </Button>
            </SignUpButton>
          </>
        ) : (
          <Button asChild size="sm" className="px-3.5">
            <a href="#instance-key">Sign in</a>
          </Button>
        )
      }
      menu={<LandingNavMenu />}
    />
  );
}

// --- LandingCta.tsx ---
export function LandingCta() {
  return (
    <KitLandingCta
      title="Put every MCP behind one key"
      description="Connect the catalog, store credentials in the vault, leave skills in app-a."
      action={
        clerkConfigured() ? (
          <SignUpButton mode="modal">
            <Button size="lg" className="sm:min-w-40">
              Get started
              <IconArrowRight size={16} aria-hidden />
            </Button>
          </SignUpButton>
        ) : (
          <Button asChild size="lg" className="sm:min-w-40">
            <a href="#instance-key">
              Open console
              <IconArrowRight size={16} aria-hidden />
            </a>
          </Button>
        )
      }
    />
  );
}

// --- LandingFooter.tsx ---
export function LandingFooter() {
  return (
    <KitLandingFooter
      brand={<AppELandingWordmark />}
      tagline="Your own hub for MCP connections and agent secrets. Skills in app-a."
      links={LANDING_NAV_LINKS}
      actions={
        clerkConfigured() ? (
          <SignInButton mode="modal">
            <Button variant="link" className={landingFooterButtonClass}>
              Sign in
            </Button>
          </SignInButton>
        ) : (
          <a href="#instance-key" className={landingFooterLinkClass}>
            Sign in
          </a>
        )
      }
      github={{
        href: APP_E_GITHUB_URL,
        label: "app-e on GitHub",
        icon: <AppIcon name="GitHub" size={18} framed={false} />,
      }}
    />
  );
}

// --- LandingPage.tsx ---
export function LandingPage() {
  return (
    <LandingPageLayout nav={<LandingNav />} hero={<LandingHero />} footer={<LandingFooter />}>
      <LandingFeatures />
      <LandingIntegrations />
      <LandingConnect />
      <LandingCta />
    </LandingPageLayout>
  );
}

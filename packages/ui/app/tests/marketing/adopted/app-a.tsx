// app-a's landing files after adopting the shared landing kit. Each section is
// the new body of the file named in its heading; the app keeps landingContent.ts,
// LandingWordmark.tsx, landing-only sections and its own extra classes.
import { motion } from "motion/react";
import { IconArrowRight, IconBrandGithub } from "@tabler/icons-react";
import {
  Button,
  createLandingKit,
  LandingFooter as KitLandingFooter,
  LandingNavMenu as KitLandingNavMenu,
  LandingPageLayout,
  landingFooterButtonClass,
} from "../../../../src/index";
import {
  AGENT_LOGIN_PATH,
  LandingAmbientGraph,
  LandingAppStage,
  LandingHowItWorks,
  LandingRecallDemo,
  LandingSurfaces,
  LandingWordmark,
  SignInButton,
  SignUpButton,
  stubEnv,
} from "../fixtures/stubs";
import {
  APP_A_GITHUB_URL,
  LANDING_HERO_CAPABILITIES,
  LANDING_NAV_LINKS,
} from "../fixtures/app-a/landingContent";

// --- LandingReveal.tsx ---
export const { LandingReveal, LandingRevealItem, LandingHero: KitLandingHero, LandingNav: KitLandingNav, LandingCta: KitLandingCta } =
  createLandingKit({ motion });

// --- LandingNavMenu.tsx ---
export function LandingNavMenu() {
  return (
    <KitLandingNavMenu
      links={LANDING_NAV_LINKS}
      github={{ href: APP_A_GITHUB_URL, icon: <IconBrandGithub size={16} aria-hidden /> }}
    />
  );
}

// --- LandingNav.tsx ---
export function LandingNav() {
  return (
    <KitLandingNav
      brand={<LandingWordmark />}
      homeLabel="app-a home"
      links={LANDING_NAV_LINKS}
      github={{ href: APP_A_GITHUB_URL, label: "app-a on GitHub", icon: <IconBrandGithub size={18} /> }}
      actions={
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
      }
      menu={<LandingNavMenu />}
    />
  );
}

// --- LandingHero.tsx ---
export function LandingHero() {
  return (
    <KitLandingHero
      eyebrow="Memory engine for AI agents"
      title={
        <>
          Memory your agents can{" "}
          <span className="italic text-foreground/85">actually use</span>
        </>
      }
      description="Store context from chats and tools, connect it in a graph, and retrieve the slice that matters — with a Context Trace that shows why each memory matched."
      actions={
        <>
          <SignUpButton mode="modal">
            <Button size="lg" className="w-full sm:w-auto sm:min-w-40">
              Get started
              <IconArrowRight size={16} aria-hidden />
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign in
            </Button>
          </SignInButton>
        </>
      }
      capabilities={LANDING_HERO_CAPABILITIES}
    />
  );
}

// --- LandingCta.tsx ---
export function LandingCta() {
  return (
    <KitLandingCta
      title="Put memory under the agents you already use"
      description="Create an account, open a profile, add a memory. Check it shows up on the graph."
      action={
        <SignUpButton mode="modal">
          <Button size="lg" className="sm:min-w-40">
            Get started
            <IconArrowRight size={16} aria-hidden />
          </Button>
        </SignUpButton>
      }
    />
  );
}

// --- LandingFooter.tsx ---
export function LandingFooter() {
  return (
    <KitLandingFooter
      brand={<LandingWordmark />}
      tagline="Graph storage, vector recall, and MCP-ready integrations for any agent stack."
      links={LANDING_NAV_LINKS}
      actions={
        <>
          <SignInButton mode="modal">
            <Button variant="link" className={landingFooterButtonClass}>
              Sign in
            </Button>
          </SignInButton>
          {stubEnv.dev ? (
            <Button
              type="button"
              variant="link"
              className={`${landingFooterButtonClass} active:scale-100`}
              onClick={() => {
                window.location.href = AGENT_LOGIN_PATH;
              }}
            >
              Continue without an account
            </Button>
          ) : null}
        </>
      }
      github={{ href: APP_A_GITHUB_URL, label: "app-a on GitHub", icon: <IconBrandGithub size={18} /> }}
    />
  );
}

// --- LandingPage.tsx ---
export function LandingPage() {
  return (
    <LandingPageLayout
      nav={<LandingNav />}
      heroBackdrop={<LandingAmbientGraph />}
      hero={<LandingHero />}
      footer={<LandingFooter />}
    >
      <LandingAppStage />
      <LandingRecallDemo />
      <LandingHowItWorks />
      <LandingSurfaces />
      <LandingCta />
    </LandingPageLayout>
  );
}

// @vitest-environment happy-dom
// Parity: each app's current component (a copy in ./fixtures) and the same
// screen rebuilt on the shared component (./adopted) must produce identical
// markup. Static parts use renderToStaticMarkup. Portalled parts (menus,
// dialogs) are mounted with react-dom and compared on document.body; React
// `useId` values differ between the two mounts, so they are normalised.
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { IconBolt } from "@tabler/icons-react";
import { afterEach, describe, expect, it } from "vitest";
import {
  LandingFeatureCard,
  LandingLattice,
  LandingSection,
  LandingSectionHeading,
  RailCollapseTile,
  TooltipProvider,
  landingItemVariants,
  landingPanelClass,
  landingShellClass,
} from "../../../src/index";
import * as aReveal from "./fixtures/app-a/LandingReveal";
import * as eReveal from "./fixtures/app-e/LandingReveal";
import { LandingFeatureCard as AFeatureCard } from "./fixtures/app-a/LandingFeatureCard";
import { LandingFeatureCard as EFeatureCard } from "./fixtures/app-e/LandingFeatureCard";
import { LandingNav as ANav } from "./fixtures/app-a/LandingNav";
import { LandingNav as ENav } from "./fixtures/app-e/LandingNav";
import { LandingNavMenu as ANavMenu } from "./fixtures/app-a/LandingNavMenu";
import { LandingNavMenu as ENavMenu } from "./fixtures/app-e/LandingNavMenu";
import { LandingHero as AHero } from "./fixtures/app-a/LandingHero";
import { LandingHero as EHero } from "./fixtures/app-e/LandingHero";
import { LandingCta as ACta } from "./fixtures/app-a/LandingCta";
import { LandingCta as ECta } from "./fixtures/app-e/LandingCta";
import { LandingFooter as AFooter } from "./fixtures/app-a/LandingFooter";
import { LandingFooter as EFooter } from "./fixtures/app-e/LandingFooter";
import { LandingPage as APage } from "./fixtures/app-a/LandingPage";
import { LandingPage as EPage } from "./fixtures/app-e/LandingPage";
import { LandingFooter as BSiteFooter } from "./fixtures/app-b/LandingFooter";
import { LandingFooter as CSiteFooter } from "./fixtures/app-c/LandingFooter";
import { LandingFooter as DSiteFooter } from "./fixtures/app-d/LandingFooter";
import { PricingModal as BPricing } from "./fixtures/app-b/PricingModal";
import { PricingModal as CPricing } from "./fixtures/app-c/PricingModal";
import { SidebarUserMenu as AUserMenu } from "./fixtures/app-a/SidebarUserMenu";
import { SidebarUserMenu as CUserMenu } from "./fixtures/app-c/SidebarUserMenu";
import { CollapseTileCopy } from "./fixtures/rail-collapse-tile";
import { stubEnv } from "./fixtures/stubs";
import * as adoptedA from "./adopted/app-a";
import * as adoptedE from "./adopted/app-e";
import { AppBLandingFooter, AppCLandingFooter, AppDLandingFooter } from "./adopted/site-footer";
import { AppBPricingModal, AppCPricingModal } from "./adopted/pricing";
import { AppASidebarUserMenu, AppCSidebarUserMenu } from "./adopted/account-menu";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * React `useId` values (`_R_2e_` on the server, `_r_1_` on the client, older
 * `«r1»` / `:r1:`) encode the tree path or mount order, which differ when the
 * app wraps the shared component, so they are replaced with one placeholder.
 */
const normaliseIds = (markup: string) =>
  markup.replace(/_[rR]_[0-9a-z]+_|«[rR][0-9a-z]+»|:[rR][0-9a-z]+:/g, "«id»");

const html = (node: ReactNode) => normaliseIds(renderToStaticMarkup(node));

async function mountBody(node: ReactNode, interact?: () => Promise<void>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(node));
  if (interact) await interact();
  const markup = normaliseIds(document.body.innerHTML);
  await act(async () => root.unmount());
  document.body.innerHTML = "";
  return markup;
}

async function press(selector: string, key: string) {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) throw new Error(`missing ${selector}`);
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

async function click(predicate: (el: HTMLElement) => boolean) {
  const el = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find(predicate);
  if (!el) throw new Error("missing menu item");
  await act(async () => {
    el.click();
  });
}

const openMenu = () => press("button[aria-haspopup=menu]", "Enter");

afterEach(() => {
  stubEnv.clerk = true;
  stubEnv.dev = true;
  stubEnv.isDark = false;
});

describe("landing kit (app-a, app-e)", () => {
  it("shares the constants and variants", () => {
    for (const app of [aReveal, eReveal]) {
      expect(landingShellClass).toBe(app.landingShellClass);
      expect(landingItemVariants).toEqual(app.landingItemVariants);
    }
    expect(landingPanelClass).toBe(aReveal.landingPanelClass);
  });

  it.each([
    ["app-a", aReveal, adoptedA],
    ["app-e", eReveal, adoptedE],
  ] as const)("%s: reveal, section, heading and lattice", (_label, app, adopted) => {
    const tree = (parts: {
      LandingReveal: (p: { children: ReactNode; className?: string; delay?: number }) => ReactNode;
      LandingRevealItem: (p: { children: ReactNode; className?: string }) => ReactNode;
      LandingSection: (p: { id?: string; children: ReactNode; className?: string }) => ReactNode;
      LandingSectionHeading: (p: { eyebrow: string; heading: string; intro?: string; className?: string }) => ReactNode;
      LandingLattice: (p: { children: ReactNode; className?: string }) => ReactNode;
    }) => (
      <parts.LandingSection id="how" className="pb-10">
        <parts.LandingReveal className="grid" delay={0.2}>
          <parts.LandingRevealItem className="col-span-2">
            <parts.LandingSectionHeading eyebrow="How" heading="Three steps" intro="Short intro" className="mx-auto" />
            <parts.LandingSectionHeading eyebrow="Plain" heading="No intro" />
          </parts.LandingRevealItem>
          <parts.LandingRevealItem>
            <parts.LandingLattice className="sm:grid-cols-2">cells</parts.LandingLattice>
          </parts.LandingRevealItem>
        </parts.LandingReveal>
        <parts.LandingReveal>default delay</parts.LandingReveal>
      </parts.LandingSection>
    );
    const shared = {
      LandingReveal: adopted.LandingReveal,
      LandingRevealItem: adopted.LandingRevealItem,
      LandingSection,
      LandingSectionHeading,
      LandingLattice,
    };
    const expected = html(tree(app));
    expect(expected).toContain("scroll-mt-24");
    expect(html(tree(shared))).toBe(expected);
  });

  it.each([
    ["app-a", AFeatureCard],
    ["app-e", EFeatureCard],
  ] as const)("%s: feature card", (_label, Copy) => {
    const props = { icon: IconBolt, title: "Graph", description: "Linked memories" };
    expect(html(<LandingFeatureCard {...props} />)).toBe(html(<Copy {...props} />));
  });

  const sections = [
    ["nav", ANav, adoptedA.LandingNav, ENav, adoptedE.LandingNav],
    ["nav menu (closed)", ANavMenu, adoptedA.LandingNavMenu, ENavMenu, adoptedE.LandingNavMenu],
    ["hero", AHero, adoptedA.LandingHero, EHero, adoptedE.LandingHero],
    ["cta", ACta, adoptedA.LandingCta, ECta, adoptedE.LandingCta],
    ["footer", AFooter, adoptedA.LandingFooter, EFooter, adoptedE.LandingFooter],
    ["page", APage, adoptedA.LandingPage, EPage, adoptedE.LandingPage],
  ] as const;

  it.each(sections)("app-a: %s", (_name, Copy, Adopted) => {
    for (const dev of [true, false]) {
      stubEnv.dev = dev;
      expect(html(<Adopted />)).toBe(html(<Copy />));
    }
  });

  it.each(sections)("app-e: %s, with and without Clerk", (_name, _a, _aa, Copy, Adopted) => {
    for (const clerk of [true, false]) {
      stubEnv.clerk = clerk;
      expect(html(<Adopted />)).toBe(html(<Copy />));
    }
  });

  it.each([
    ["app-a", ANavMenu, adoptedA.LandingNavMenu],
    ["app-e", ENavMenu, adoptedE.LandingNavMenu],
  ] as const)("%s: nav menu (open)", async (_label, Copy, Adopted) => {
    const expected = await mountBody(<Copy />, openMenu);
    expect(expected).toContain('role="menu"');
    expect(expected).toContain("GitHub");
    expect(await mountBody(<Adopted />, openMenu)).toBe(expected);
  });
});

describe("SiteFooter (app-b, app-c, app-d)", () => {
  it.each([
    ["app-b", BSiteFooter, AppBLandingFooter],
    ["app-c", CSiteFooter, AppCLandingFooter],
    ["app-d", DSiteFooter, AppDLandingFooter],
  ] as const)("%s", (_label, Copy, Adopted) => {
    const expected = html(<Copy />);
    expect(expected).toContain("All rights reserved.");
    expect(html(<Adopted />)).toBe(expected);
  });
});

describe("PricingModal (app-b, app-c)", () => {
  it.each([
    ["app-b", BPricing, AppBPricingModal],
    ["app-c", CPricing, AppCPricingModal],
  ] as const)("%s (open)", async (_label, Copy, Adopted) => {
    const onClose = () => undefined;
    const expected = await mountBody(<Copy isOpen onClose={onClose} />);
    expect(expected).toContain("What you get");
    expect(await mountBody(<Adopted isOpen onClose={onClose} />)).toBe(expected);
  });

  it.each([
    ["app-b", BPricing, AppBPricingModal],
    ["app-c", CPricing, AppCPricingModal],
  ] as const)("%s (closed)", async (_label, Copy, Adopted) => {
    const onClose = () => undefined;
    expect(await mountBody(<Adopted isOpen={false} onClose={onClose} />)).toBe(
      await mountBody(<Copy isOpen={false} onClose={onClose} />),
    );
  });
});

describe("SidebarAccountMenu themeToggle and signOut (app-a, app-c)", () => {
  const onOpenSearch = () => undefined;
  const labels = [
    ["app-a", () => <AUserMenu />, () => <AppASidebarUserMenu />],
    ["app-c", () => <CUserMenu onOpenSearch={onOpenSearch} />, () => <AppCSidebarUserMenu onOpenSearch={onOpenSearch} />],
  ] as const;

  it.each(labels)("%s: closed trigger", async (_label, copy, adopted) => {
    expect(await mountBody(adopted())).toBe(await mountBody(copy()));
  });

  it.each(labels)("%s: open menu, light and dark", async (_label, copy, adopted) => {
    for (const isDark of [false, true]) {
      stubEnv.isDark = isDark;
      const expected = await mountBody(copy(), openMenu);
      expect(expected).toContain(isDark ? "Light mode" : "Dark mode");
      expect(expected).toContain("Sign out");
      expect(await mountBody(adopted(), openMenu)).toBe(expected);
    }
  });

  it.each(labels)("%s: sign-out confirm dialog", async (_label, copy, adopted) => {
    const signOut = async () => {
      await openMenu();
      await click((el) => el.textContent?.includes("Sign out") ?? false);
    };
    const expected = await mountBody(copy(), signOut);
    expect(expected).toContain("Sign out of your account?");
    expect(await mountBody(adopted(), signOut)).toBe(expected);
  });
});

describe("RailCollapseTile (app-a, app-b, app-e)", () => {
  it.each([true, false])("collapsed=%s", (collapsed) => {
    const onToggle = () => undefined;
    const expected = html(
      <TooltipProvider>
        <CollapseTileCopy isCollapsed={collapsed} onToggleCollapse={onToggle} />
      </TooltipProvider>,
    );
    expect(expected).toContain(collapsed ? "Show sidebar" : "Hide sidebar");
    expect(
      html(
        <TooltipProvider>
          <RailCollapseTile collapsed={collapsed} onToggle={onToggle} />
        </TooltipProvider>,
      ),
    ).toBe(expected);
  });
});

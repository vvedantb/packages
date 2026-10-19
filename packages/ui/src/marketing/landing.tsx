import type { ComponentType, ReactNode } from "react";
import { IconMenu2 } from "@tabler/icons-react";
import type { Variants } from "motion/react";
import { motionDuration, motionEase } from "../motion/presets";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../utils/cn";
import { landingClasses, landingFooterLinkClass, landingShellClass } from "./marketing-classes";

export type LandingLink = { href: string; label: string };

/** Variants for one revealed child: fade, rise 14px and unblur. */
export const landingItemVariants: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: motionDuration.slow, ease: motionEase },
  },
};

export type LandingSectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
};

/** Landing column with section spacing and a `scroll-mt-24` anchor offset. */
export function LandingSection({ id, children, className }: LandingSectionProps) {
  return (
    <section
      id={id}
      className={cn(landingShellClass, "scroll-mt-24 py-20 sm:py-28 lg:py-32", className)}
    >
      {children}
    </section>
  );
}

export type LandingSectionHeadingProps = {
  eyebrow: string;
  heading: string;
  intro?: string;
  className?: string;
};

/** Mono eyebrow, large heading and optional intro. */
export function LandingSectionHeading({ eyebrow, heading, intro, className }: LandingSectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className={landingClasses.eyebrow}>{eyebrow}</p>
      <h2 className="text-balance font-semibold text-3xl leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
        {heading}
      </h2>
      {intro ? <p className={landingClasses.sectionIntro}>{intro}</p> : null}
    </div>
  );
}

export type LandingLatticeProps = { children: ReactNode; className?: string };

/** Shared border through 1px gaps so adjacent cells don't double a hairline. */
export function LandingLattice({ children, className }: LandingLatticeProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-separator">
      <div className={cn("grid gap-px bg-separator", className)}>{children}</div>
    </div>
  );
}

export type LandingFeature = {
  /** Rendered with `size={18} stroke={1.5}`, for example a Tabler icon. */
  icon: ComponentType<{ size?: number; stroke?: number }>;
  title: string;
  description: string;
};

/** Feature tile: inverted icon square, title and description, with a hover lift and edge bar. */
export function LandingFeatureCard({ icon: Icon, title, description }: LandingFeature) {
  return (
    <div className="group relative flex gap-3 overflow-hidden rounded-2xl border border-separator bg-surface px-3.5 py-3.5 transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-surface-secondary sm:gap-4 sm:px-5 sm:py-4">
      <div
        className="absolute inset-y-3 left-0 w-1 rounded-full bg-foreground/0 transition-[background-color] duration-200 group-hover:bg-foreground/20"
        aria-hidden
      />
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-transform duration-200 ease-out group-hover:scale-[1.04]">
        <Icon size={18} stroke={1.5} />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className={landingClasses.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

export type LandingNavMenuProps = {
  links: readonly LandingLink[];
  /** Last item, after a separator: opens in a new tab and reads "GitHub". */
  github: { href: string; icon: ReactNode };
};

/**
 * Overflow menu below `md`. Section links do not fit a phone-width bar;
 * the auth buttons stay in the bar itself.
 */
export function LandingNavMenu({ links, github }: LandingNavMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open menu" className="md:hidden">
          <IconMenu2 size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[70dvh] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto"
      >
        {links.map((link) => (
          <DropdownMenuItem key={link.href} asChild className="max-sm:py-2.5">
            <a href={link.href}>{link.label}</a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="max-sm:py-2.5">
          <a href={github.href} target="_blank" rel="noreferrer">
            {github.icon}
            GitHub
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type LandingFooterProps = {
  /** Wordmark above the tagline. */
  brand: ReactNode;
  tagline: ReactNode;
  links: readonly LandingLink[];
  /** After the links, before GitHub. Style with `landingFooterLinkClass` or `landingFooterButtonClass`. */
  actions?: ReactNode;
  /** `label` is the link's `aria-label`. */
  github: { href: string; label: string; icon: ReactNode };
};

/** Footer row: brand and tagline, then section links, app actions and a GitHub icon link. */
export function LandingFooter({ brand, tagline, links, actions, github }: LandingFooterProps) {
  return (
    <footer className="border-t border-separator">
      <div
        className={`${landingShellClass} flex flex-col gap-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div>
          {brand}
          <p className={landingClasses.footerTagline}>{tagline}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Footer">
          {links.map((link) => (
            <a key={link.href} href={link.href} className={landingFooterLinkClass}>
              {link.label}
            </a>
          ))}
          {actions}
          <a
            href={github.href}
            target="_blank"
            rel="noreferrer"
            aria-label={github.label}
            className={landingClasses.footerGithub}
          >
            {github.icon}
          </a>
        </nav>
      </div>
    </footer>
  );
}

export type LandingPageLayoutProps = {
  /** Sticky header, usually `LandingNav`. */
  nav: ReactNode;
  /** Inside the hero's atmosphere block, before `hero` (for example an ambient graphic). */
  heroBackdrop?: ReactNode;
  hero: ReactNode;
  /** Sections after the hero, inside `<main>`. */
  children?: ReactNode;
  footer: ReactNode;
};

/**
 * Page frame: `#top` root, nav, a `<main>` whose first block is the hero on the
 * grid-and-grain atmosphere, then the sections and the footer. Import
 * `@vvedantb/ui/landing.css` for the atmosphere, grain and pulse classes.
 */
export function LandingPageLayout({ nav, heroBackdrop, hero, children, footer }: LandingPageLayoutProps) {
  return (
    <div id="top" className="relative min-h-[100dvh] bg-background text-foreground">
      {nav}
      <main>
        <div className="landing-atmosphere landing-grain relative overflow-hidden border-b border-separator">
          {heroBackdrop}
          {hero}
        </div>
        {children}
      </main>
      {footer}
    </div>
  );
}

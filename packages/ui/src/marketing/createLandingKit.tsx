import type { ReactNode } from "react";
import type { motion as motionNamespace } from "motion/react";
import { motionDuration, motionEase } from "../motion/presets";
import { Button } from "../ui/button";
import { cn } from "../utils/cn";
import { landingItemVariants, type LandingLink } from "./landing";
import { landingClasses, landingShellClass } from "./marketing-classes";

/** The `motion` export of `motion/react`. Only these elements are used. */
export type LandingMotion = Pick<typeof motionNamespace, "div" | "p" | "h1" | "ul" | "header">;

export type LandingKitOptions = {
  /** Pass `motion` from `motion/react`. The package does not import Motion itself. */
  motion: LandingMotion;
};

export type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds before the first child starts. Default `0`. */
  delay?: number;
};

export type LandingRevealItemProps = { children: ReactNode; className?: string };

export type LandingHeroProps = {
  /** Pill above the title, after a pulsing dot. */
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  /** Inside the button row, for example Get started and Sign in. The row renders even when empty. */
  actions?: ReactNode;
  /** Mono pills under the buttons. */
  capabilities: readonly string[];
};

export type LandingNavProps = {
  /** Wordmark inside the `#top` home link. */
  brand: ReactNode;
  /** `aria-label` of the home link. */
  homeLabel: string;
  /** Section links, shown from `md`. */
  links: readonly LandingLink[];
  /** Icon button from `sm`. `label` is its `aria-label`. */
  github: { href: string; label: string; icon: ReactNode };
  /** After the GitHub button, for example Sign in and Get started. */
  actions?: ReactNode;
  /** Last in the bar, usually `LandingNavMenu`. */
  menu?: ReactNode;
};

export type LandingCtaProps = {
  title: ReactNode;
  description: ReactNode;
  /** Under the text, for example a large Get started button. */
  action?: ReactNode;
};

export type LandingKit = {
  LandingReveal: (props: LandingRevealProps) => ReactNode;
  LandingRevealItem: (props: LandingRevealItemProps) => ReactNode;
  LandingHero: (props: LandingHeroProps) => ReactNode;
  LandingNav: (props: LandingNavProps) => ReactNode;
  LandingCta: (props: LandingCtaProps) => ReactNode;
};

const heroContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

/**
 * Builds the animated landing parts on the app's Motion. Call it once at
 * module scope: `export const { LandingHero, ... } = createLandingKit({ motion })`.
 */
export function createLandingKit({ motion }: LandingKitOptions): LandingKit {
  /** Staggers its `LandingRevealItem` children in once, when 20% is in view. */
  function LandingReveal({ children, className, delay = 0 }: LandingRevealProps) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: 0.1, delayChildren: delay },
          },
        }}
      >
        {children}
      </motion.div>
    );
  }

  function LandingRevealItem({ children, className }: LandingRevealItemProps) {
    return (
      <motion.div className={cn(className)} variants={landingItemVariants}>
        {children}
      </motion.div>
    );
  }

  /** Centred hero: eyebrow pill, title, description, actions and capability pills, revealed on mount. */
  function LandingHero({ eyebrow, title, description, actions, capabilities }: LandingHeroProps) {
    return (
      <section className={`${landingShellClass} pb-16 pt-12 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24`}>
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial="hidden"
          animate="show"
          variants={heroContainer}
        >
          <motion.p className={landingClasses.heroEyebrow} variants={landingItemVariants}>
            <span className="landing-pulse-dot size-1.5 rounded-full bg-foreground" aria-hidden />
            {eyebrow}
          </motion.p>

          <motion.h1
            className="text-balance font-semibold text-[2.35rem] leading-[1] tracking-[-0.035em] text-foreground min-[400px]:text-[2.85rem] sm:text-6xl lg:text-[4.85rem]"
            variants={landingItemVariants}
            transition={{ duration: motionDuration.slow, ease: motionEase }}
          >
            {title}
          </motion.h1>

          <motion.p className={landingClasses.heroDescription} variants={landingItemVariants}>
            {description}
          </motion.p>

          <motion.div
            className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:mt-9 sm:flex-row sm:items-center sm:gap-3"
            variants={landingItemVariants}
          >
            {actions}
          </motion.div>

          <motion.ul
            className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-10"
            variants={landingItemVariants}
          >
            {capabilities.map((label) => (
              <li key={label} className={landingClasses.heroCapability}>
                {label}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </section>
    );
  }

  /** Sticky blurred header that rises in on mount. */
  function LandingNav({ brand, homeLabel, links, github, actions, menu }: LandingNavProps) {
    return (
      <motion.header
        className="sticky top-0 z-30 border-b border-separator bg-background/80 backdrop-blur-md"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionDuration.base, ease: motionEase }}
      >
        <div className={cn(landingShellClass, "flex h-14 items-center justify-between gap-3 sm:h-16")}>
          <a
            href="#top"
            className="group min-w-0 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={homeLabel}
          >
            {brand}
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Page">
            {links.map((link) => (
              <a key={link.href} href={link.href} className={landingClasses.navLink}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="icon-sm" className="hidden sm:inline-flex">
              <a href={github.href} target="_blank" rel="noreferrer" aria-label={github.label}>
                {github.icon}
              </a>
            </Button>
            {actions}
            {menu}
          </div>
        </div>
      </motion.header>
    );
  }

  /** Closing call to action on the atmosphere background. */
  function LandingCta({ title, description, action }: LandingCtaProps) {
    return (
      <div className="landing-atmosphere landing-grain relative overflow-hidden border-t border-separator">
        <section className={`${landingShellClass} relative z-10 py-20 sm:py-28`}>
          <LandingReveal className="flex flex-col items-center text-center">
            <h2 className="max-w-2xl text-balance font-semibold text-3xl leading-[1.1] tracking-[-0.03em] text-foreground sm:text-5xl">
              {title}
            </h2>
            <p className={landingClasses.ctaDescription}>{description}</p>
            <div className="mt-9">{action}</div>
          </LandingReveal>
        </section>
      </div>
    );
  }

  return { LandingReveal, LandingRevealItem, LandingHero, LandingNav, LandingCta };
}

// Class strings for the landing kit, `SiteFooter` and `PricingModal`, copied
// from the apps' markup. Some read the bare muted text colour the apps already
// ship (apps map `--color-muted` to the secondary text colour), so each such
// line carries the token check's allow marker. Every string is a literal so
// Tailwind's source scan sees it.

/** Centred landing column: `max-w-6xl` with responsive side padding. */
export const landingShellClass = "relative mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10";

/** Bordered surface card used by landing product mocks. */
export const landingPanelClass = "overflow-hidden rounded-2xl border border-separator bg-surface";

/** Text link in `LandingFooter`, also for app links placed in its `actions` slot. */
export const landingFooterLinkClass = "max-sm:py-1 text-sm text-muted hover:text-foreground"; // check-tokens-allow: text-muted

/** `Button variant="link"` in `LandingFooter`'s `actions` slot (for example Sign in). */
export const landingFooterButtonClass = "h-auto p-0 text-sm text-muted hover:text-foreground"; // check-tokens-allow: text-muted

export const landingClasses = {
  eyebrow:
    "mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-muted sm:text-xs sm:tracking-[0.28em]", // check-tokens-allow: text-muted
  sectionIntro:
    "mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:mt-5 sm:text-base", // check-tokens-allow: text-muted
  featureDescription:
    "mt-1 text-pretty text-xs leading-relaxed text-muted sm:text-[0.8125rem]", // check-tokens-allow: text-muted
  navLink:
    "inline-flex h-10 items-center rounded-lg px-3 text-sm text-muted transition-[color,background-color] duration-150 hover:bg-surface-tertiary hover:text-foreground", // check-tokens-allow: text-muted
  heroEyebrow:
    "mb-6 inline-flex items-center gap-2 rounded-full border border-separator bg-surface/70 px-3 py-1 text-xs text-muted", // check-tokens-allow: text-muted
  heroDescription:
    "mx-auto mt-5 max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-muted sm:mt-6 sm:text-lg", // check-tokens-allow: text-muted
  heroCapability:
    "rounded-full border border-separator bg-surface/60 px-3 py-1 font-mono text-[11px] text-muted", // check-tokens-allow: text-muted
  ctaDescription:
    "mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base", // check-tokens-allow: text-muted
  footerTagline:
    "mt-3 max-w-sm text-pretty text-xs leading-relaxed text-muted", // check-tokens-allow: text-muted
  footerGithub: "max-sm:py-1 text-muted hover:text-foreground", // check-tokens-allow: text-muted
} as const;

/**
 * `SiteFooter` class sets. `muted` and `muted-foreground` differ only in the
 * secondary text colour; `touch` adds `max-sm:hit-target` targets and a
 * safe-area bottom padding.
 */
export const siteFooterClasses = {
  muted: {
    footer: "bg-background text-foreground py-8 md:py-16 max-w-5xl mx-auto",
    tagline: "text-sm text-muted mb-4 md:mb-6 max-w-sm", // check-tokens-allow: text-muted
    socialButton:
      "w-9 h-9 md:w-8 md:h-8 bg-default rounded-lg flex items-center justify-center hover:bg-surface-tertiary transition-[background-color]",
    socialIcon: "w-4 h-4 text-muted", // check-tokens-allow: text-muted
    heading: "font-thin tracking-wide mb-3 md:mb-4 text-muted", // check-tokens-allow: text-muted
    links: "flex flex-col gap-2 md:gap-3 text-sm text-muted font-thin tracking-wide", // check-tokens-allow: text-muted
    link: "hover:text-foreground transition-[color]",
    imageLink: "hover:text-foreground transition-[color] flex flex-row items-center gap-2",
    copyright: "text-xs md:text-sm text-muted", // check-tokens-allow: text-muted
    rights: "text-xs md:text-sm text-muted/80", // check-tokens-allow: text-muted
    legalLink:
      "underline text-xs md:text-sm text-muted hover:text-foreground transition-[color]", // check-tokens-allow: text-muted
  },
  "muted-foreground": {
    footer: "bg-background text-foreground py-8 md:py-16 max-w-5xl mx-auto",
    tagline: "text-sm text-muted-foreground mb-4 md:mb-6 max-w-sm",
    socialButton:
      "w-9 h-9 md:w-8 md:h-8 bg-default rounded-lg flex items-center justify-center hover:bg-surface-tertiary transition-[background-color]",
    socialIcon: "w-4 h-4 text-muted-foreground",
    heading: "font-thin tracking-wide mb-3 md:mb-4 text-muted-foreground",
    links: "flex flex-col gap-2 md:gap-3 text-sm text-muted-foreground font-thin tracking-wide",
    link: "hover:text-foreground transition-[color]",
    imageLink: "hover:text-foreground transition-[color] flex flex-row items-center gap-2",
    copyright: "text-xs md:text-sm text-muted-foreground",
    rights: "text-xs md:text-sm text-muted-foreground/80",
    legalLink:
      "underline text-xs md:text-sm text-muted-foreground hover:text-foreground transition-[color]",
  },
  touch: {
    footer:
      "mx-auto max-w-5xl bg-background pt-8 text-foreground pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-16 md:pb-16",
    tagline: "text-sm text-muted-foreground mb-4 md:mb-6 max-w-sm",
    socialButton:
      "max-sm:hit-target h-9 w-9 rounded-lg bg-default hover:bg-surface-tertiary md:h-8 md:w-8",
    socialIcon: "h-4 w-4 text-muted-foreground",
    heading: "font-thin tracking-wide mb-3 md:mb-4 text-muted-foreground",
    links: "flex flex-col gap-2 text-sm font-thin tracking-wide text-muted-foreground md:gap-3",
    link: "max-sm:hit-target max-sm:py-1 hover:text-foreground",
    imageLink: "max-sm:hit-target flex flex-row items-center gap-2 max-sm:py-1 hover:text-foreground",
    copyright: "text-xs md:text-sm text-muted-foreground",
    rights: "text-xs md:text-sm text-muted-foreground/80",
    legalLink:
      "max-sm:hit-target text-xs underline text-muted-foreground hover:text-foreground md:text-sm",
  },
} as const;

export type SiteFooterVariant = keyof typeof siteFooterClasses;

/** `PricingModal` class sets for the two secondary text colours. */
export const pricingModalClasses = {
  muted: {
    period: "pb-1 text-sm text-muted", // check-tokens-allow: text-muted
    /** After `mt-4 max-w-[28ch]` and the optional font class. */
    tagline: "text-lg italic leading-snug text-muted", // check-tokens-allow: text-muted
    note: "mt-3 text-center text-xs text-muted", // check-tokens-allow: text-muted
    featuresHeading:
      "mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-muted", // check-tokens-allow: text-muted
  },
  "muted-foreground": {
    period: "pb-1 text-sm text-muted-foreground",
    tagline: "text-lg italic leading-snug text-muted-foreground",
    note: "mt-3 text-center text-xs text-muted-foreground",
    featuresHeading: "mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground",
  },
} as const;

export type PricingModalTone = keyof typeof pricingModalClasses;

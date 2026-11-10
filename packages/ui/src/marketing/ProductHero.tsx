import type { ComponentProps, MouseEventHandler, ReactNode } from "react";
import { Button } from "../ui/button";
import { pageTitleClass } from "../ui/page-title";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../utils/cn";
import { landingShellClass, productHeroSocialProofClass } from "./marketing-classes";
import { PROJECT_V_HOME_URL } from "./projectV";

export type ProductHeroAction = {
  label: string;
  /** Renders an `a`. Without it the action renders a `button`. */
  href?: string;
  /** Passed to the `a`. Only used with `href`. */
  rel?: string;
  /** Passed to the `a`. Only used with `href`. */
  target?: string;
  onClick?: MouseEventHandler;
  /** Default: `"default"` for the primary action and `"outline"` for the secondary action. */
  variant?: ComponentProps<typeof Button>["variant"];
};

export type ProductHeroProps = {
  /** The only `h1` of the hero. Instrument Sans, weight 600, `leading-tight`, `tracking-tight` (`pageTitleClass`), at a display scale. */
  title: ReactNode;
  /** Short product description under the title. */
  tagline: ReactNode;
  primaryCta: ProductHeroAction;
  secondaryCta?: ProductHeroAction;
  /**
   * Renders exactly one "Sign in" control. Omit it for none. The hero never renders two,
   * so leave the page nav without its own Sign in. Set `href` or `onClick`.
   */
  signIn?: { href?: string; onClick?: MouseEventHandler };
  /**
   * An animated concept visual in the style of https://projectv.uk: a glowing ring, orbit
   * or particle field that conveys the idea of the product.
   *
   * It must NOT be an app replica, a screenshot or a mock of the product UI. Those age as
   * the app changes and are the drift this component removes.
   *
   * If the visual animates, it must respect `prefers-reduced-motion` itself.
   */
  visual: ReactNode;
  /** Gives the visual region `role="img"` and this accessible name. Without it the region is decorative (`aria-hidden`). */
  visualLabel?: string;
  /**
   * Live user count for social proof under the actions: "Free to use · 1,284+ people already here",
   * with a pulsing green dot (static under `prefers-reduced-motion: reduce`).
   *
   * The package does no fetching. The app calls a Convex action that wraps the Clerk backend SDK
   * `clerk.users.getCount()` (needs `CLERK_SECRET_KEY`), once on mount or cached server-side.
   * Pass `undefined` while loading and the positive number once it resolves. The row stays hidden
   * for `undefined`, `null` and any value of 0 or less, so a loading `0` never shows "0+ people".
   */
  userCount?: number | null;
  /** Default `true`. Renders "a product of Project V", always linked to `PROJECT_V_HOME_URL`. The link target cannot be changed; `false` hides the whole line. */
  showProductOf?: boolean;
  className?: string;
};

// Same family, weight, leading and tracking as `PageTitle`; only the size changes with the viewport.
// Joined as plain strings: `cn` would drop `leading-tight` because a `text-*` size class conflicts with it.
const titleClass = `text-balance text-4xl sm:text-5xl lg:text-6xl ${pageTitleClass.replace(/\btext-xl\s*/, "")}`;

function UserCountProof({ count }: { count: number }) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  return (
    <p className={productHeroSocialProofClass} data-testid="user-count">
      <span data-testid="user-count-dot" aria-hidden="true" className={cn("size-2 rounded-full bg-success", !reducedMotion && "animate-pulse")} />
      <span>Free to use · {new Intl.NumberFormat("en-GB").format(count)}+ people already here</span>
    </p>
  );
}

function ActionControl({ action, variant, size = "lg" }: { action: ProductHeroAction; variant: NonNullable<ProductHeroAction["variant"]>; size?: ComponentProps<typeof Button>["size"] }) {
  const v = action.variant ?? variant;
  if (action.href !== undefined) {
    return (
      <Button asChild variant={v} size={size}>
        <a href={action.href} rel={action.rel} target={action.target} onClick={action.onClick}>
          {action.label}
        </a>
      </Button>
    );
  }
  return (
    <Button type="button" variant={v} size={size} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

/**
 * Shared hero for a product landing page. Copy first, then the visual on mobile; side by
 * side from `lg`. The title, calls to action, single Sign in and product-of line are fixed
 * by the component so every product renders the same hero.
 */
export function ProductHero({ title, tagline, primaryCta, secondaryCta, signIn, visual, visualLabel, userCount, showProductOf = true, className }: ProductHeroProps) {
  return (
    <section className={cn(landingShellClass, "py-12 sm:py-16 lg:py-24", className)}>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start text-left">
          <h1 className={titleClass}>{title}</h1>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">{tagline}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ActionControl action={primaryCta} variant="default" />
            {secondaryCta ? <ActionControl action={secondaryCta} variant="outline" /> : null}
            {signIn ? <ActionControl action={{ label: "Sign in", ...signIn }} variant="secondary" /> : null}
          </div>
          {userCount != null && userCount > 0 ? <UserCountProof count={userCount} /> : null}
          {showProductOf ? (
            <p className="mt-8 text-sm text-muted-foreground">
              a product of{" "}
              <a href={PROJECT_V_HOME_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                Project V
              </a>
            </p>
          ) : null}
        </div>
        <div
          className="relative flex min-h-64 items-center justify-center overflow-hidden lg:min-h-96"
          {...(visualLabel ? { role: "img", "aria-label": visualLabel } : { "aria-hidden": true })}
        >
          {visual}
        </div>
      </div>
    </section>
  );
}

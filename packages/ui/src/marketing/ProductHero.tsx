import type { ComponentProps, MouseEventHandler, ReactNode } from "react";
import { Button } from "../ui/button";
import { pageTitleClass } from "../ui/page-title";
import { cn } from "../utils/cn";
import { landingShellClass } from "./marketing-classes";
import { PROJECT_V_HOME_URL } from "./projectV";

export type ProductHeroAction = {
  label: string;
  /** Renders an `a`. Without it the action renders a `button`. */
  href?: string;
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
  /** Default `true`. Renders "a product of Project V", linked to `PROJECT_V_HOME_URL`. */
  showProductOf?: boolean;
  className?: string;
};

// Same family, weight, leading and tracking as `PageTitle`; only the size changes with the viewport.
// Joined as plain strings: `cn` would drop `leading-tight` because a `text-*` size class conflicts with it.
const titleClass = `text-balance text-4xl sm:text-5xl lg:text-6xl ${pageTitleClass.replace(/\btext-xl\s*/, "")}`;

function ActionControl({ action, variant, size = "lg" }: { action: ProductHeroAction; variant: NonNullable<ProductHeroAction["variant"]>; size?: ComponentProps<typeof Button>["size"] }) {
  const v = action.variant ?? variant;
  if (action.href !== undefined) {
    return (
      <Button asChild variant={v} size={size}>
        <a href={action.href} onClick={action.onClick}>
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
export function ProductHero({ title, tagline, primaryCta, secondaryCta, signIn, visual, visualLabel, showProductOf = true, className }: ProductHeroProps) {
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

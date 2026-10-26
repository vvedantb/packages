import { useRef, useState, type ReactElement, type ReactNode } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { APP_ICONS, FAMILY_APPS, IconProjectV, familyApp, type AppIconProps, type AppName } from "../brand";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { VisuallyHidden } from "../ui/visually-hidden";
import { pricingModalClasses, pricingMultiClasses, type PricingModalTone } from "./marketing-classes";

export type PricingModalPeriod = "month" | "year";

export type PricingModalLegacyProps = {
  /** Absent in the single-plan layout. Set `plans` for the multi-plan layout. */
  plans?: undefined;
  open: boolean;
  /** Called when the dialog asks to close and by the `closeButton`. */
  onClose: () => void;
  /** Accessible dialog title, for example "Pro". Not visible. */
  title: string;
  /** Accessible description. Not visible. When set, the title is an `sr-only` `DialogTitle` followed by this. */
  description?: string;
  /** Logo before the wordmark: `dark` shows in dark mode, `light` in light mode. 28px. */
  logo: { dark: string; light: string };
  /** Text after the logo, before the PRO badge. */
  wordmark: string;
  /** For example "$9". */
  price: string;
  /** Adds a monthly/yearly toggle. Without it the modal is monthly only and `price` is the only price. */
  yearly?: {
    /** Yearly price per month, for example "$8.33". */
    pricePerMonth: string;
    /** Yearly total shown in the note, for example "$100". */
    total?: string;
    /** Badge on the yearly option. Default "Save 2 months". */
    saveLabel?: string;
  };
  /** Selected period, when the parent controls it. Needs `yearly`. */
  billingPeriod?: PricingModalPeriod;
  /** Called with the period the user picks. */
  onBillingPeriodChange?: (period: PricingModalPeriod) => void;
  /** Initial period when `billingPeriod` is not set. Default `"month"`. */
  defaultBillingPeriod?: PricingModalPeriod;
  tagline: ReactNode;
  /** Extra font class on the tagline, placed after `max-w-[28ch]`. */
  taglineFontClassName?: string;
  /** Plan features under "What you get". */
  features: readonly string[];
  /** Label of the full-width checkout button. Default "Get Pro". */
  ctaLabel?: string;
  /** Wraps the checkout button, for example in the billing provider's checkout and signed-in gates. `period` is the selected period, for `planPeriod`; it is always `"month"` without `yearly`. */
  renderCheckout: (button: ReactElement, period: PricingModalPeriod) => ReactNode;
  /** Second, compact close button in the top-right corner. Default `false`. */
  closeButton?: boolean;
  /** Secondary text colour class. Default `"muted"`. */
  tone?: PricingModalTone;
};

export type PricingPlanBenefit = {
  label: ReactNode;
  /** `"check"` (default) or an app mark. */
  icon?: "check" | AppName;
  /** Dimmed row. */
  muted?: boolean;
};

/** Benefits for one app, shown under that app's icon and name. */
export type PricingPlanAppBenefit = {
  app: Exclude<AppName, "projectv">;
  items: readonly string[];
};

/**
 * Per-app copy for V Pro.
 * TODO: empty until the real per-app copy arrives. Do not add limits here without a source.
 */
export const V_PRO_APP_BENEFITS: readonly PricingPlanAppBenefit[] = [];

export type PricingPlan = {
  id: string;
  name: string;
  /** Display strings per month, for example `{ month: "$10", year: "$8" }`. The yearly price is still per month. */
  price: { month: string; year: string };
  /** Default "Get started". */
  ctaLabel?: string;
  /** Line above the highlight, for example "Everything in Free, and:". */
  intro?: ReactNode;
  /** Large title with small text under it. */
  highlight?: { title: string; description: string };
  benefits?: readonly PricingPlanBenefit[];
  /** Grouped per app, shown after `benefits`. The `currentApp` group comes first, the rest in `FAMILY_APPS` order. */
  appBenefits?: readonly PricingPlanAppBenefit[];
  /** The plan the user is on: the button reads "Current plan" and is disabled. */
  current?: boolean;
  /** Subtle ring on the card. `highlighted` is an alias. */
  featured?: boolean;
  highlighted?: boolean;
  /** Text after the price. Default "/month". */
  periodSuffix?: string;
};

export type PricingModalMultiProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible dialog title. Not visible. */
  title: string;
  /** Accessible description. Not visible. */
  description?: string;
  /** Cards, left to right. Sized for 1 to 4. */
  plans: readonly PricingPlan[];
  /** App marks at the top left. */
  apps?: readonly AppName[];
  /** App the dialog is shown in. Its `appBenefits` group comes first. */
  currentApp?: Exclude<AppName, "projectv">;
  /** Centred headline, for example "One plan. Every V app." */
  headline?: ReactNode;
  /** Small print under the cards. */
  finePrint?: ReactNode;
  billingPeriod?: PricingModalPeriod;
  onBillingPeriodChange?: (period: PricingModalPeriod) => void;
  /** Default `"month"`. */
  defaultBillingPeriod?: PricingModalPeriod;
  /** Wraps each plan's button, for example in the billing provider's checkout. Not called for the `current` plan. */
  renderCheckout: (button: ReactElement, plan: PricingPlan, period: PricingModalPeriod) => ReactNode;
  tone?: PricingModalTone;
};

export type PricingModalProps = PricingModalLegacyProps | PricingModalMultiProps;

/** Upgrade dialog. With `plans`: wide multi-plan layout. Without: the single-plan layout. */
function AppIcon({ app, ...props }: AppIconProps & { app: AppName }) {
  const Icon = APP_ICONS[app];
  return <Icon {...props} />;
}

function sortAppBenefits(groups: readonly PricingPlanAppBenefit[], currentApp?: AppName) {
  const rank = (app: AppName) => (app === currentApp ? -1 : FAMILY_APPS.findIndex((entry) => entry.app === app));
  return [...groups].sort((a, b) => rank(a.app) - rank(b.app));
}

export function PricingModal(props: PricingModalProps) {
  return props.plans ? <PricingModalMulti {...props} /> : <PricingModalSingle {...props} />;
}

function PricingModalSingle({
  open,
  onClose,
  title,
  description,
  logo,
  wordmark,
  price,
  yearly,
  billingPeriod,
  onBillingPeriodChange,
  defaultBillingPeriod = "month",
  tagline,
  taglineFontClassName,
  features,
  ctaLabel = "Get Pro",
  renderCheckout,
  closeButton = false,
  tone = "muted",
}: PricingModalLegacyProps) {
  const c = pricingModalClasses[tone];
  const [localPeriod, setLocalPeriod] = useState<PricingModalPeriod>(defaultBillingPeriod);
  const period: PricingModalPeriod = yearly ? (billingPeriod ?? localPeriod) : "month";
  const selectPeriod = (next: PricingModalPeriod) => {
    setLocalPeriod(next);
    onBillingPeriodChange?.(next);
  };
  const taglineClass = ["mt-4 max-w-[28ch]", taglineFontClassName, c.tagline].filter(Boolean).join(" ");
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        {description ? (
          <>
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <DialogDescription className="sr-only">{description}</DialogDescription>
          </>
        ) : (
          <VisuallyHidden>
            <DialogTitle>{title}</DialogTitle>
          </VisuallyHidden>
        )}

        {closeButton ? (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-[background-color,transform] duration-100 ease-out active:scale-[0.96] hover:bg-surface-tertiary hover:text-foreground"
          >
            <IconX className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        ) : null}

        <div className="bg-surface-secondary px-8 pb-8 pt-10 dark:bg-surface-secondary/40">
          <div className="flex items-center">
            <img src={logo.dark} alt="" width={28} height={28} className="hidden dark:block" />
            <img src={logo.light} alt="" width={28} height={28} className="block dark:hidden" />
            <span className="font-michroma text-xl tracking-wider text-foreground">{wordmark}</span>
            <span className="ml-2 rounded-md bg-segment px-2 py-0.5 font-michroma text-[10px] tracking-[0.25em] text-segment-foreground">
              PRO
            </span>
          </div>

          {yearly ? (
            <div role="group" aria-label="Billing period" className="mt-8 inline-flex rounded-lg bg-surface-tertiary p-0.5">
              {(["month", "year"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={period === value}
                  onClick={() => selectPeriod(value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors duration-100 ${
                    period === value ? "bg-segment text-segment-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {value === "month" ? "Monthly" : `Yearly · ${yearly.saveLabel ?? "Save 2 months"}`}
                </button>
              ))}
            </div>
          ) : null}

          <div className={yearly ? "mt-5 flex items-end gap-2" : "mt-8 flex items-end gap-2"}>
            <span className="text-5xl font-medium tabular-nums leading-none tracking-tight text-foreground">
              {yearly && period === "year" ? yearly.pricePerMonth : price}
            </span>
            <span className={c.period}>/ month</span>
          </div>

          <p className={taglineClass}>{tagline}</p>
        </div>

        <div className="px-8 pb-8 pt-6">
          {renderCheckout(
            <Button size="lg" className="h-11 w-full rounded-xl">
              {ctaLabel}
            </Button>,
            period,
          )}

          <p className={c.note}>
            {period === "year"
              ? `Cancel anytime. ${yearly?.total ? `${yearly.total} billed yearly.` : "Billed yearly."}`
              : "Cancel anytime. Billed monthly."}
          </p>

          <div className="mt-8">
            <p className={c.featuresHeading}>What you get</p>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-default dark:bg-default/80">
                    <IconCheck className="size-3 text-foreground" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm leading-snug text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const multiWidth = {
  1: "sm:max-w-md",
  2: "sm:max-w-3xl",
  3: "sm:max-w-5xl",
  4: "sm:max-w-6xl",
} as const;

const multiColumns = {
  1: "",
  2: "sm:grid-cols-2",
  3: "md:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

function PricingModalMulti({
  open,
  onClose,
  title,
  description,
  plans,
  apps,
  currentApp,
  headline,
  finePrint,
  billingPeriod,
  onBillingPeriodChange,
  defaultBillingPeriod = "month",
  renderCheckout,
  tone = "muted",
}: PricingModalMultiProps) {
  const c = pricingMultiClasses[tone];
  const [localPeriod, setLocalPeriod] = useState<PricingModalPeriod>(defaultBillingPeriod);
  const period = billingPeriod ?? localPeriod;
  const selectPeriod = (next: PricingModalPeriod) => {
    setLocalPeriod(next);
    onBillingPeriodChange?.(next);
  };
  const contentRef = useRef<HTMLDivElement>(null);
  const count = Math.min(Math.max(plans.length, 1), 4) as 1 | 2 | 3 | 4;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        ref={contentRef}
        hideCloseButton
        // Focus the dialog, not the first segment button, so no ring shows on open.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        className={`max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 font-sans sm:w-[calc(100vw-2rem)] ${multiWidth[count]}`}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {description ? <DialogDescription className="sr-only">{description}</DialogDescription> : null}

        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 pb-4 pt-5 sm:grid-cols-[1fr_auto_1fr] sm:px-6">
          <div className="flex items-center gap-2 text-foreground" data-testid="pricing-apps">
            <TooltipProvider delayDuration={200}>
              {apps?.map((app) => {
                const { name, url } = familyApp(app);
                return (
                  <Tooltip key={app}>
                    <TooltipTrigger asChild>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={name}
                        className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                      >
                        <AppIcon app={app} size={20} />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent portal>{name}</TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
          <div className="flex items-center justify-end gap-2 sm:order-last">
            <div role="group" aria-label="Billing period" className="inline-flex rounded-full bg-surface-tertiary p-0.5">
              {(["month", "year"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={period === value}
                  onClick={() => selectPeriod(value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none ${
                    period === value ? "bg-segment text-segment-foreground" : `${c.switchIdle} hover:text-foreground`
                  }`}
                >
                  {value === "month" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-[background-color,transform] duration-100 ease-out hover:bg-surface-tertiary hover:text-foreground active:scale-[0.96] motion-reduce:transition-none"
            >
              <IconX className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          {headline ? (
            <p className="col-span-2 text-balance text-center text-xl font-medium tracking-tight text-foreground sm:order-none sm:col-span-1 sm:text-2xl">
              {headline}
            </p>
          ) : (
            <span className="hidden sm:block" />
          )}
        </div>

        <div className={`grid grid-cols-1 gap-3 px-4 sm:px-6 ${multiColumns[count]}`}>
          {plans.map((plan) => {
            const emphasised = plan.featured ?? plan.highlighted;
            const button = (
              <Button
                size="lg"
                variant={plan.current ? "outline" : emphasised ? "default" : "secondary"}
                disabled={plan.current}
                className="h-12 w-full rounded-full"
              >
                {plan.current ? "Current plan" : (plan.ctaLabel ?? "Get started")}
              </Button>
            );
            return (
              <section
                key={plan.id}
                data-plan={plan.id}
                aria-label={plan.name}
                className={`flex flex-col rounded-3xl bg-surface-secondary p-5 ${
                  emphasised ? "ring-1 ring-foreground/25" : "ring-1 ring-separator"
                }`}
              >
                {emphasised ? (
                  <div className="flex items-center gap-2 text-base text-foreground">
                    <IconProjectV size={16} className="shrink-0" />
                    <h3>{plan.name}</h3>
                  </div>
                ) : (
                  <h3 className="text-base text-foreground">{plan.name}</h3>
                )}
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-medium tabular-nums leading-none tracking-tight text-foreground">
                    {plan.price[period]}
                  </span>
                  <span className={c.suffix}>{plan.periodSuffix ?? "/month"}</span>
                </p>
                <div className="mt-5">{plan.current ? button : renderCheckout(button, plan, period)}</div>
                {plan.intro ? <p className={`mt-6 text-sm ${c.suffix}`}>{plan.intro}</p> : null}
                {plan.highlight ? (
                  <div className="mt-3">
                    <p className="text-2xl font-medium leading-tight text-foreground">{plan.highlight.title}</p>
                    <p className="text-sm text-foreground">{plan.highlight.description}</p>
                  </div>
                ) : null}
                {plan.benefits?.length ? (
                  <ul className="mt-5 space-y-2.5 border-t border-separator pt-4">
                    {plan.benefits.map((benefit, index) => (
                      <li
                        key={index}
                        className={`flex items-start gap-2.5 text-sm leading-snug ${
                          benefit.muted ? c.suffix : "text-foreground"
                        }`}
                      >
                        <span className="mt-0.5 flex h-4 w-5 shrink-0 items-center justify-center">
                          {benefit.icon && benefit.icon !== "check" ? (
                            <AppIcon app={benefit.icon} size={12} className="max-w-full" />
                          ) : (
                            <IconCheck className="size-4" strokeWidth={2} />
                          )}
                        </span>
                        <span>{benefit.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {plan.appBenefits?.length ? (
                  <div className="mt-5 space-y-4 border-t border-separator pt-4">
                    {sortAppBenefits(plan.appBenefits, currentApp).map((group) => (
                      <div key={group.app} data-app-benefits={group.app}>
                        <p className="flex items-center gap-2 text-sm text-foreground">
                          <AppIcon app={group.app} size={12} className="shrink-0" />
                          {familyApp(group.app).name}
                        </p>
                        <ul className="mt-2 space-y-1.5 pl-5">
                          {group.items.map((item, index) => (
                            <li key={index} className="text-sm leading-snug text-foreground">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        {finePrint ? <p className={`px-4 pb-5 pt-4 text-xs sm:px-6 ${c.suffix}`}>{finePrint}</p> : <div className="pb-4" />}
      </DialogContent>
    </Dialog>
  );
}

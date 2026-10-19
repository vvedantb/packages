import type { ReactElement, ReactNode } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { VisuallyHidden } from "../ui/visually-hidden";
import { pricingModalClasses, type PricingModalTone } from "./marketing-classes";

export type PricingModalProps = {
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
  tagline: ReactNode;
  /** Extra font class on the tagline, placed after `max-w-[28ch]`. */
  taglineFontClassName?: string;
  /** Plan features under "What you get". */
  features: readonly string[];
  /** Label of the full-width checkout button. Default "Get Pro". */
  ctaLabel?: string;
  /** Wraps the checkout button, for example in the billing provider's checkout and signed-in gates. */
  renderCheckout: (button: ReactElement) => ReactNode;
  /** Second, compact close button in the top-right corner. Default `false`. */
  closeButton?: boolean;
  /** Secondary text colour class. Default `"muted"`. */
  tone?: PricingModalTone;
};

/** Single-plan upgrade dialog: brand header with price and tagline, checkout button and feature list. */
export function PricingModal({
  open,
  onClose,
  title,
  description,
  logo,
  wordmark,
  price,
  tagline,
  taglineFontClassName,
  features,
  ctaLabel = "Get Pro",
  renderCheckout,
  closeButton = false,
  tone = "muted",
}: PricingModalProps) {
  const c = pricingModalClasses[tone];
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

          <div className="mt-8 flex items-end gap-2">
            <span className="text-5xl font-medium tabular-nums leading-none tracking-tight text-foreground">
              {price}
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
          )}

          <p className={c.note}>Cancel anytime. Billed monthly.</p>

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

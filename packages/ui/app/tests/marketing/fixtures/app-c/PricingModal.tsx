import { memo } from "react";
import { SignedIn } from "../stubs";
import { CheckoutButton } from "../stubs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  VisuallyHidden,
  Button,
} from "../../../../../src/index";
import { IconCheck, IconX } from "@tabler/icons-react";
import { getAppCProPlanId } from "../stubs";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  "AI rewrite & summarize",
  "Export to PDF & Word",
  "Unlimited pages & tasks",
  "File & image attachments",
  "Focus session analytics",
  "Priority support",
];

export const PricingModal = memo(function PricingModal({
  isOpen,
  onClose,
}: PricingModalProps) {
  const planId = getAppCProPlanId();

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <VisuallyHidden>
          <DialogTitle>App C Pro</DialogTitle>
        </VisuallyHidden>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-[background-color,transform] duration-100 ease-out active:scale-[0.96] hover:bg-surface-tertiary hover:text-foreground"
        >
          <IconX className="size-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="bg-surface-secondary px-8 pb-8 pt-10 dark:bg-surface-secondary/40">
          <div className="flex items-center">
            <img
              src="/app-c-icon-light.png"
              alt=""
              width={28}
              height={28}
              className="hidden dark:block"
            />
            <img
              src="/app-c-icon-dark.png"
              alt=""
              width={28}
              height={28}
              className="block dark:hidden"
            />
            <span className="font-michroma text-xl tracking-wider text-foreground">
              PP-C
            </span>
            <span className="ml-2 rounded-md bg-segment px-2 py-0.5 font-michroma text-[10px] tracking-[0.25em] text-segment-foreground">
              PRO
            </span>
          </div>

          <div className="mt-8 flex items-end gap-2">
            <span className="text-5xl font-medium tabular-nums leading-none tracking-tight text-foreground">
              $4
            </span>
            <span className="pb-1 text-sm text-muted-foreground">/ month</span>
          </div>

          <p className="mt-4 max-w-[28ch] font-instrumentSans text-lg italic leading-snug text-muted-foreground">
            Unlock the full potential of App C.
          </p>
        </div>

        <div className="px-8 pb-8 pt-6">
          <SignedIn>
            <CheckoutButton planId={planId} planPeriod="month">
              <Button size="lg" className="h-11 w-full rounded-xl">
                Get Pro
              </Button>
            </CheckoutButton>
          </SignedIn>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Cancel anytime. Billed monthly.
          </p>

          <div className="mt-8">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              What you get
            </p>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-default dark:bg-default/80">
                    <IconCheck
                      className="size-3 text-foreground"
                      strokeWidth={2.5}
                    />
                  </span>
                  <span className="text-sm leading-snug text-foreground">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

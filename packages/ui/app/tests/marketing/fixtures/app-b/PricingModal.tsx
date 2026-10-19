import { SignedIn } from "../stubs";
import { CheckoutButton } from "../stubs";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../../../src/index";
import { IconCheck } from "@tabler/icons-react";
import { clientEnv } from "../stubs";
interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}
const features = [
  "Smarter models",
  "Advanced report and document generation",
  "Advanced image generation",
  "Deep research with high quality sources",
  "Custom AI personalities",
  "Priority support and response times",
];
export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const planId =
    clientEnv.VITE_ENV === "production"
      ? "plan_prod"
      : "plan_dev";
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogTitle className="sr-only">App B Pro</DialogTitle>
        <DialogDescription className="sr-only">
          Upgrade to App B Pro for advanced AI capabilities
        </DialogDescription>

        <div className="bg-surface-secondary px-8 pb-8 pt-10 dark:bg-surface-secondary/40">
          <div className="flex items-center">
            <img
              src="/app-b-light.png"
              alt=""
              width={28}
              height={28}
              className="hidden dark:block"
            />
            <img
              src="/app-b-dark.png"
              alt=""
              width={28}
              height={28}
              className="block dark:hidden"
            />
            <span className="font-michroma text-xl tracking-wider text-foreground">
              PP-B
            </span>
            <span className="ml-2 rounded-md bg-segment px-2 py-0.5 font-michroma text-[10px] tracking-[0.25em] text-segment-foreground">
              PRO
            </span>
          </div>

          <div className="mt-8 flex items-end gap-2">
            <span className="text-5xl font-medium tabular-nums leading-none tracking-tight text-foreground">
              $9
            </span>
            <span className="pb-1 text-sm text-muted">/ month</span>
          </div>

          <p className="mt-4 max-w-[28ch] text-lg italic leading-snug text-muted">
            Everything you need to think, create, and ship without limits.
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

          <p className="mt-3 text-center text-xs text-muted">
            Cancel anytime. Billed monthly.
          </p>

          <div className="mt-8">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
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
}

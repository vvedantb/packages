// PricingModal.tsx of app-b and app-c after adopting the shared `PricingModal`.
import { PricingModal as KitPricingModal } from "../../../../src/index";
import { CheckoutButton, clientEnv, getAppCProPlanId, SignedIn } from "../fixtures/stubs";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- app-b: components/modals/PricingModal.tsx ---
const APP_B_FEATURES = [
  "Smarter models",
  "Advanced report and document generation",
  "Advanced image generation",
  "Deep research with high quality sources",
  "Custom AI personalities",
  "Priority support and response times",
];

export function AppBPricingModal({ isOpen, onClose }: PricingModalProps) {
  const planId = clientEnv.VITE_ENV === "production" ? "plan_prod" : "plan_dev";
  return (
    <KitPricingModal
      open={isOpen}
      onClose={onClose}
      title="App B Pro"
      description="Upgrade to App B Pro for advanced AI capabilities"
      logo={{ dark: "/app-b-light.png", light: "/app-b-dark.png" }}
      wordmark="PP-B"
      price="$9"
      tagline="Everything you need to think, create, and ship without limits."
      features={APP_B_FEATURES}
      renderCheckout={(button) => (
        <SignedIn>
          <CheckoutButton planId={planId} planPeriod="month">
            {button}
          </CheckoutButton>
        </SignedIn>
      )}
    />
  );
}

// --- app-c: lib/components/PricingModal.tsx ---
const APP_C_FEATURES = [
  "AI rewrite & summarize",
  "Export to PDF & Word",
  "Unlimited pages & tasks",
  "File & image attachments",
  "Focus session analytics",
  "Priority support",
];

export function AppCPricingModal({ isOpen, onClose }: PricingModalProps) {
  const planId = getAppCProPlanId();
  return (
    <KitPricingModal
      open={isOpen}
      onClose={onClose}
      title="App C Pro"
      logo={{ dark: "/app-c-icon-light.png", light: "/app-c-icon-dark.png" }}
      wordmark="PP-C"
      price="$4"
      tagline="Unlock the full potential of App C."
      taglineFontClassName="font-instrumentSans"
      features={APP_C_FEATURES}
      closeButton
      tone="muted-foreground"
      renderCheckout={(button) => (
        <SignedIn>
          <CheckoutButton planId={planId} planPeriod="month">
            {button}
          </CheckoutButton>
        </SignedIn>
      )}
    />
  );
}

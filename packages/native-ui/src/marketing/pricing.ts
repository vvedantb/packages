// Plan types and pure helpers for `PricingModal`, the same shapes and rules as
// the web `PricingModal` multi-plan layout. No React Native imports.
import type { ReactNode } from "react";
import type { AppName } from "../brand/svg";
import { V_PRO_APP_BENEFITS, type PricingPlanAppBenefit } from "../brand/vProAppBenefits";

export type PricingModalPeriod = "month" | "year";

export type PricingPlanBenefit = {
  label: ReactNode;
  /** `"check"` (default) or an app mark. */
  icon?: "check" | AppName;
  /** Dimmed row. */
  muted?: boolean;
};

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
  /** Grouped per app, after `benefits`. The featured plan defaults to `V_PRO_APP_BENEFITS`. */
  appBenefits?: readonly PricingPlanAppBenefit[];
  /** The plan the user is on: the button reads "Current plan" and is disabled. */
  current?: boolean;
  /** Subtle ring on the card. `highlighted` is an alias. */
  featured?: boolean;
  highlighted?: boolean;
  /** Text after the price. Default "/month". */
  periodSuffix?: string;
};

/** `featured`, else `highlighted` (the web rule: `featured ?? highlighted`). */
export function isEmphasised(plan: PricingPlan): boolean {
  return Boolean(plan.featured ?? plan.highlighted);
}

/** The plan's app groups: its own, else `V_PRO_APP_BENEFITS` for the emphasised plan, else none. */
export function planAppBenefits(
  plan: PricingPlan,
): readonly PricingPlanAppBenefit[] | undefined {
  return plan.appBenefits ?? (isEmphasised(plan) ? V_PRO_APP_BENEFITS : undefined);
}

/** Stable sort: the current app's group first, the rest in their order. */
export function sortAppBenefits(
  groups: readonly PricingPlanAppBenefit[],
  currentApp?: AppName,
): PricingPlanAppBenefit[] {
  return [...groups].sort(
    (a, b) => Number(b.app === currentApp) - Number(a.app === currentApp),
  );
}

/** Label, variant and state of a plan's button, as on the web. */
export function planButton(plan: PricingPlan): {
  label: string;
  variant: "default" | "secondary" | "outline";
  disabled: boolean;
} {
  if (plan.current) {
    return { label: "Current plan", variant: "outline", disabled: true };
  }
  return {
    label: plan.ctaLabel ?? "Get started",
    variant: isEmphasised(plan) ? "default" : "secondary",
    disabled: false,
  };
}

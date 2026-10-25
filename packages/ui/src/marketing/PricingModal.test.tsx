// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PricingModal, type PricingModalProps } from "./PricingModal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const base: PricingModalProps = {
  open: true,
  onClose: () => undefined,
  title: "Pro",
  logo: { dark: "/d.svg", light: "/l.svg" },
  wordmark: "V",
  price: "$10",
  tagline: "Tagline",
  features: ["One"],
  renderCheckout: (button) => button,
};

async function mount(props: Partial<PricingModalProps>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<PricingModal {...base} {...props} />));
  return () => act(async () => root.unmount());
}

const pick = (name: string) =>
  [...document.body.querySelectorAll("button")].find((b) => b.textContent?.startsWith(name));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("PricingModal yearly", () => {
  it("has no toggle without yearly and passes month to renderCheckout", async () => {
    const renderCheckout = vi.fn<PricingModalProps["renderCheckout"]>((button) => button);
    await mount({ renderCheckout });
    expect(document.body.textContent).toContain("Billed monthly.");
    expect(document.body.querySelector("[aria-label='Billing period']")).toBeNull();
    expect(renderCheckout.mock.calls.at(-1)?.[1]).toBe("month");
  });

  it("switches price, note and period (uncontrolled)", async () => {
    const renderCheckout = vi.fn<PricingModalProps["renderCheckout"]>((button) => button);
    await mount({ yearly: { pricePerMonth: "$8.33", total: "$100" }, renderCheckout });
    expect(document.body.textContent).toContain("$10");
    expect(document.body.textContent).toContain("Save 2 months");
    await act(async () => pick("Yearly")?.click());
    expect(document.body.textContent).toContain("$8.33");
    expect(document.body.textContent).toContain("$100 billed yearly.");
    expect(renderCheckout.mock.calls.at(-1)?.[1]).toBe("year");
  });

  it("follows billingPeriod and reports picks (controlled)", async () => {
    const onBillingPeriodChange = vi.fn();
    await mount({ yearly: { pricePerMonth: "$8.33" }, billingPeriod: "month", onBillingPeriodChange });
    await act(async () => pick("Yearly")?.click());
    expect(onBillingPeriodChange).toHaveBeenCalledWith("year");
    expect(document.body.textContent).toContain("Billed monthly.");
  });
});

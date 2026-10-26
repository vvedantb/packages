// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PricingModal, V_PRO_APP_BENEFITS, type PricingModalMultiProps, type PricingModalLegacyProps } from "./PricingModal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const base: PricingModalLegacyProps = {
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

async function mount(props: Partial<PricingModalLegacyProps>) {
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
    const renderCheckout = vi.fn<PricingModalLegacyProps["renderCheckout"]>((button) => button);
    await mount({ renderCheckout });
    expect(document.body.textContent).toContain("Billed monthly.");
    expect(document.body.querySelector("[aria-label='Billing period']")).toBeNull();
    expect(renderCheckout.mock.calls.at(-1)?.[1]).toBe("month");
  });

  it("switches price, note and period (uncontrolled)", async () => {
    const renderCheckout = vi.fn<PricingModalLegacyProps["renderCheckout"]>((button) => button);
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

const multi: PricingModalMultiProps = {
  open: true,
  onClose: () => undefined,
  title: "Plans",
  apps: ["vibot", "verve", "velth", "vmem", "vhub"],
  headline: "One plan. Every V app.",
  finePrint: "Cancel anytime. Taxes may apply.",
  plans: [
    { id: "free", name: "Free", price: { month: "$0", year: "$0" }, current: true, benefits: [{ label: "Basics" }] },
    {
      id: "pro",
      name: "V Pro",
      price: { month: "$15", year: "$10" },
      ctaLabel: "Upgrade",
      featured: true,
      intro: "Everything in Free, and:",
      highlight: { title: "Shared", description: "usage across every V app" },
      benefits: [{ label: "Chat", icon: "vibot" }, { label: "Dim", muted: true }],
    },
  ],
  renderCheckout: (button) => button,
};

async function mountMulti(props: Partial<PricingModalMultiProps> = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<PricingModal {...multi} {...props} />));
  return () => act(async () => root.unmount());
}

describe("PricingModal multi-plan", () => {
  it("renders plans, headline, app marks and fine print", async () => {
    await mountMulti();
    const text = document.body.textContent ?? "";
    expect(document.body.querySelectorAll("section[data-plan]")).toHaveLength(2);
    expect(text).toContain("One plan. Every V app.");
    expect(text).toContain("Cancel anytime. Taxes may apply.");
    expect(text).toContain("Everything in Free, and:");
    expect(text).toContain("/month");
    const marks = [...document.body.querySelectorAll("[data-testid='pricing-apps'] svg")];
    expect(marks.map((m) => m.getAttribute("data-app"))).toEqual(["vibot", "verve", "velth", "vmem", "vhub"]);
    expect(document.body.querySelector("[role='dialog']")?.textContent).toContain("Close");
  });

  it("links each app icon to its site with a tooltip name", async () => {
    await mountMulti();
    const links = [...document.body.querySelectorAll<HTMLAnchorElement>("[data-testid='pricing-apps'] a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "https://vibot.projectv.uk",
      "https://verve.projectv.uk",
      "https://velth.projectv.uk",
      "https://vmem.projectv.uk",
      "https://vhub.projectv.uk",
    ]);
    for (const a of links) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
      expect(a.className).toContain("focus-visible:ring");
    }
    await act(async () => {
      links[1]!.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(document.body.querySelector("[role='tooltip']")?.textContent).toBe("Verve");
  });

  it("groups appBenefits per app with the current app first, after benefits", async () => {
    const plans = [
      {
        id: "pro",
        name: "V Pro",
        price: { month: "$15", year: "$10" },
        benefits: [{ label: "Plain" }],
        appBenefits: [
          { app: "vmem", items: ["M1"] },
          { app: "vibot", items: ["B1", "B2"] },
          { app: "velth", items: ["L1"] },
        ],
      },
    ] satisfies PricingModalMultiProps["plans"];
    await mountMulti({ plans, currentApp: "velth" });
    const groups = [...document.body.querySelectorAll("[data-app-benefits]")];
    expect(groups.map((g) => g.getAttribute("data-app-benefits"))).toEqual(["velth", "vmem", "vibot"]);
    expect(groups[0]!.querySelector("svg")?.getAttribute("data-app")).toBe("velth");
    expect(groups[0]!.textContent).toBe("VelthL1");
    expect(groups[2]!.querySelectorAll("li")).toHaveLength(2);
    const section = document.body.querySelector("section[data-plan='pro']") as HTMLElement;
    expect(section.textContent!.indexOf("Plain")).toBeLessThan(section.textContent!.indexOf("Velth"));
  });

  it("keeps the provided order without currentApp", async () => {
    await mountMulti({
      plans: [
        { id: "p", name: "P", price: { month: "$1", year: "$1" }, appBenefits: [{ app: "vhub", items: ["H"] }, { app: "verve", items: ["V"] }] },
      ],
    });
    expect([...document.body.querySelectorAll("[data-app-benefits]")].map((g) => g.getAttribute("data-app-benefits"))).toEqual(["vhub", "verve"]);
    expect(document.body.querySelector("section[data-plan='free']")).toBeNull();
  });

  it("has the approved V_PRO_APP_BENEFITS copy in order", () => {
    expect(V_PRO_APP_BENEFITS.map((g) => g.app)).toEqual(["vibot", "vmem", "vhub", "velth", "verve"]);
    expect(V_PRO_APP_BENEFITS[0]!.items).toEqual([
      "1000 messages / day",
      "100 image gens / day",
      "100 deep & 20 extreme searches / day",
      "Smarter AI for chats, documents & sub-agents",
    ]);
    expect(V_PRO_APP_BENEFITS.every((g) => g.items.length > 0)).toBe(true);
  });

  it("defaults the featured plan to V_PRO_APP_BENEFITS, current app first, with display-name casing", async () => {
    await mountMulti({
      currentApp: "velth",
      plans: [
        { id: "free", name: "Free", price: { month: "$0", year: "$0" } },
        { id: "pro", name: "V Pro", price: { month: "$15", year: "$10" }, featured: true },
      ],
    });
    const pro = document.body.querySelector("section[data-plan='pro']") as HTMLElement;
    const groups = [...pro.querySelectorAll("[data-app-benefits]")];
    expect(groups.map((g) => g.getAttribute("data-app-benefits"))).toEqual(["velth", "vibot", "vmem", "vhub", "verve"]);
    expect(groups.map((g) => g.querySelector("p")?.textContent)).toEqual(["Velth", "vibot", "vmem", "vhub", "Verve"]);
    expect(pro.querySelector("[data-app-benefits]")!.parentElement!.className).toContain("overflow-y-auto");
    expect(document.body.querySelector("section[data-plan='free']")!.querySelector("[data-app-benefits]")).toBeNull();
  });

  it("shows the Project V mark beside the paid plan name only", async () => {
    await mountMulti();
    const pro = document.body.querySelector("section[data-plan='pro']") as HTMLElement;
    const free = document.body.querySelector("section[data-plan='free']") as HTMLElement;
    const mark = pro.querySelector("h3")?.previousElementSibling;
    expect(mark?.getAttribute("data-app")).toBe("projectv");
    expect(mark?.getAttribute("height")).toBe("16");
    expect(free.querySelector("h3")?.previousElementSibling).toBeNull();
  });

  it("switches prices and the renderCheckout period", async () => {
    const renderCheckout = vi.fn<PricingModalMultiProps["renderCheckout"]>((button) => button);
    await mountMulti({ renderCheckout });
    expect(document.body.textContent).toContain("$15");
    expect(renderCheckout.mock.calls.at(-1)?.[1].id).toBe("pro");
    expect(renderCheckout.mock.calls.at(-1)?.[2]).toBe("month");
    await act(async () => pick("Annual")?.click());
    expect(document.body.textContent).toContain("$10");
    expect(document.body.textContent).not.toContain("$15");
    expect(pick("Annual")?.getAttribute("aria-pressed")).toBe("true");
    expect(renderCheckout.mock.calls.at(-1)?.[2]).toBe("year");
  });

  it("disables the current plan and skips checkout for it", async () => {
    const renderCheckout = vi.fn<PricingModalMultiProps["renderCheckout"]>((button) => button);
    await mountMulti({ renderCheckout });
    const current = pick("Current plan") as HTMLButtonElement;
    expect(current.disabled).toBe(true);
    expect(current.className).toContain("border");
    expect(renderCheckout.mock.calls.every(([, plan]) => plan.id !== "free")).toBe(true);
    expect(pick("Upgrade")?.hasAttribute("disabled")).toBe(false);
    expect(pick("Upgrade")?.className).toContain("bg-primary");
    expect(current.className).not.toContain("bg-primary");
  });

  it("works uncontrolled and controlled", async () => {
    const unmount = await mountMulti({ defaultBillingPeriod: "year" });
    expect(document.body.textContent).toContain("$10");
    await unmount();
    document.body.innerHTML = "";
    const onBillingPeriodChange = vi.fn();
    await mountMulti({ billingPeriod: "month", onBillingPeriodChange });
    await act(async () => pick("Annual")?.click());
    expect(onBillingPeriodChange).toHaveBeenCalledWith("year");
    expect(document.body.textContent).toContain("$15");
  });
});

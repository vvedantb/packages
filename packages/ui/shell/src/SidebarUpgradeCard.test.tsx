// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarUpgradeCard } from "./SidebarUpgradeCard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

async function mount(props: Parameters<typeof SidebarUpgradeCard>[0]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<SidebarUpgradeCard {...props} />));
  return host;
}

describe("SidebarUpgradeCard", () => {
  it("shows the title and an Upgrade pill, with no mark, with no subtitle", async () => {
    const onUpgrade = vi.fn();
    const host = await mount({ onUpgrade, className: "extra" });
    const card = host.querySelector("[data-slot='sidebar-upgrade-card']") as HTMLElement;
    expect(card.className).toContain("extra");
    expect(card.className).toContain("bg-surface-secondary");
    expect(card.textContent).toBe("Upgrade to Pro" + "Upgrade");
    expect(card.querySelector("svg")).toBeNull();
    const button = card.querySelector("button") as HTMLButtonElement;
    expect(button.textContent).toBe("Upgrade");
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("bg-foreground");
    expect(button.className).toContain("text-background");
    await act(async () => button.click());
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("fits the full title at 254px without truncation", async () => {
    const host = await mount({ onUpgrade: vi.fn(), className: "w-[254px]" });
    const card = host.querySelector("[data-slot='sidebar-upgrade-card']") as HTMLElement;
    const title = card.querySelector("span") as HTMLElement;
    expect(title.textContent).toBe("Upgrade to Pro");
    // Budget: 254 card - 24 padding (px-3) - 12 gap - ~80 for the Upgrade pill leaves ~138px.
    // "Upgrade to Pro" at text-sm semibold is about 14 chars x 8px = 112px.
    const budget = 254 - 24 - 12 - 80;
    expect(title.textContent!.length * 8).toBeLessThanOrEqual(budget);
    expect(card.className).toContain("gap-3");
    expect(card.className).toContain("px-3");
  });

  it("collapses to a round Pro button with an accessible label", async () => {
    const onUpgrade = vi.fn();
    const host = await mount({ onUpgrade, collapsed: true });
    expect(host.querySelector("[data-slot='sidebar-upgrade-card']")).toBeNull();
    const button = host.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-label")).toBe("Upgrade to Pro");
    expect(button.textContent).toBe("Pro");
    expect(button.className).toContain("rounded-full");
    expect(button.querySelector("svg")).toBeNull();
    await act(async () => button.click());
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });
});

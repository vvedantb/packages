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
  it("shows the mark, the title and an Upgrade pill, with no subtitle", async () => {
    const onUpgrade = vi.fn();
    const host = await mount({ onUpgrade, className: "extra" });
    const card = host.querySelector("[data-slot='sidebar-upgrade-card']") as HTMLElement;
    expect(card.className).toContain("extra");
    expect(card.className).toContain("bg-surface-secondary");
    expect(card.textContent).toBe("Upgrade to Pro" + "Upgrade");
    const mark = card.querySelector("svg") as SVGElement;
    expect(mark.getAttribute("data-app")).toBe("projectv");
    expect(mark.getAttribute("height")).toBe("14");
    expect(mark.getAttribute("width")).not.toBe("14");
    const button = card.querySelector("button") as HTMLButtonElement;
    expect(button.textContent).toBe("Upgrade");
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("bg-foreground");
    expect(button.className).toContain("text-background");
    await act(async () => button.click());
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("collapses to an icon-only round button with an accessible label", async () => {
    const onUpgrade = vi.fn();
    const host = await mount({ onUpgrade, collapsed: true });
    expect(host.querySelector("[data-slot='sidebar-upgrade-card']")).toBeNull();
    const button = host.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-label")).toBe("Upgrade to Pro");
    expect(button.textContent).toBe("");
    expect(button.className).toContain("rounded-full");
    expect(button.querySelector("svg")?.getAttribute("data-app")).toBe("projectv");
    await act(async () => button.click());
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });
});

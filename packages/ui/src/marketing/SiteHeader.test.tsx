// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SITE_HEADER_WORDMARK_SIZE, SiteHeader, type SiteHeaderProps } from "./SiteHeader";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const links = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `Link ${i + 1}`, href: `#l${i + 1}` }));

const base: SiteHeaderProps = {
  app: "velth",
  homeLabel: "velth home",
  links: links(3),
  cta: <button type="button">Get the app</button>,
};

async function mount(props: Partial<SiteHeaderProps> = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<SiteHeader {...base} {...props} />));
  return () => act(async () => root.unmount());
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("SiteHeader", () => {
  it("renders the wordmark at 20px with a 28px icon", async () => {
    expect(SITE_HEADER_WORDMARK_SIZE).toBe(20);
    await mount();
    const home = document.body.querySelector('a[aria-label="velth home"]')!;
    expect(home.getAttribute("href")).toBe("#home");
    const svg = home.querySelector("svg");
    expect(svg?.getAttribute("data-app")).toBe("velth");
    expect(svg?.getAttribute("width")).toBe("28");
    expect((home.firstElementChild as HTMLElement).style.fontSize).toBe("20px");
  });

  it("sits in a fixed floating bar with a spacer", async () => {
    await mount();
    const header = document.body.querySelector("header")!;
    for (const c of ["fixed", "top-0", "z-50"]) {
      expect(header.classList.contains(c)).toBe(true);
    }
    expect(header.previousElementSibling?.hasAttribute("data-floating-bar-spacer")).toBe(true);
    const bar = header.querySelector("[data-floating-bar]")!;
    expect(bar.classList.contains("rounded-full")).toBe(true);
    expect(bar.querySelector('a[aria-label="velth home"]')).not.toBeNull();
  });

  it("warns above four links and not at four", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await mount({ links: links(4) });
    expect(warn).not.toHaveBeenCalled();
    document.body.innerHTML = "";
    await mount({ links: links(5) });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain("SiteHeader supports at most 4 links");
    expect(document.body.querySelectorAll("nav a")).toHaveLength(4);
  });

  it("renders the one CTA in the bar", async () => {
    await mount();
    const ctas = [...document.body.querySelectorAll("button")].filter((b) => b.textContent === "Get the app");
    expect(ctas).toHaveLength(1);
  });

  it("renders the GitHub link when githubUrl is set", async () => {
    await mount({ githubUrl: "https://github.com/x/y" });
    const a = document.body.querySelector('a[aria-label="velth on GitHub"]')!;
    expect(a.getAttribute("href")).toBe("https://github.com/x/y");
    expect(a.getAttribute("target")).toBe("_blank");
  });

  it("has no GitHub link without githubUrl", async () => {
    await mount();
    expect(document.body.querySelector('a[aria-label$="on GitHub"]')).toBeNull();
  });

  it("opens the mobile menu in order: links, CTA, GitHub", async () => {
    await mount({ githubUrl: "https://github.com/x/y" });
    const trigger = document.body.querySelector<HTMLButtonElement>('button[aria-label="Open menu"]')!;
    expect(trigger).not.toBeNull();
    await act(async () => {
      trigger.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, ctrlKey: false }));
    });
    const menu = document.body.querySelector('[role="menu"]')!;
    expect(menu).not.toBeNull();
    expect(document.body.querySelector('button[aria-label="Close menu"]')).not.toBeNull();
    const text = [...menu.querySelectorAll("a, [data-site-header-cta]")].map((n) => n.textContent?.trim());
    expect(text).toEqual(["Link 1", "Link 2", "Link 3", "Get the app", "GitHub"]);
  });
});

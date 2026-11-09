// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PROJECT_V_LEGAL_LINKS, PROJECT_V_SOCIALS, SITE_FOOTER_WORDMARK_SIZE, SiteFooter, type SiteFooterAppProps, type SiteFooterLegacyProps, type SiteFooterLink } from "./SiteFooter";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const base: SiteFooterLegacyProps = {
  brand: "V",
  tagline: "Tagline",
  socials: [],
  columns: [],
  name: "Project V",
  year: 2026,
  legalLinks: [],
};

async function mount(links: readonly SiteFooterLink[]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<SiteFooter {...base} columns={[{ heading: "Apps", links }]} />));
  return () => act(async () => root.unmount());
}

const link = (label: string) => [...document.body.querySelectorAll("a")].find((a) => a.textContent === label)!;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SiteFooter links", () => {
  it("renders the app glyph before the label", async () => {
    await mount([{ href: "https://vibot.projectv.uk", label: "vibot", external: true, app: "vibot" }]);
    const a = link("vibot");
    const svg = a.querySelector("svg");
    expect(svg?.getAttribute("data-app")).toBe("vibot");
    expect(svg?.getAttribute("width")).toBe("14");
    expect(svg?.getAttribute("height")).toBe("14");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.querySelector("title")).toBeNull();
    expect(a.firstChild).toBe(svg);
    expect(a.lastChild?.textContent).toBe("vibot");
    expect(a.getAttribute("target")).toBe("_blank");
  });

  it("lays out the app glyph and label in a centred row with a gap", async () => {
    await mount([{ href: "/vhub", label: "vhub", app: "vhub" }]);
    const classes = link("vhub").className.split(" ");
    expect(classes).toEqual(expect.arrayContaining(["flex", "flex-row", "items-center", "gap-2"]));
  });

  it("still renders a round image without app", async () => {
    await mount([{ href: "/a", label: "Alpha", image: { src: "/a.png", alt: "Alpha logo" } }]);
    const a = link("Alpha");
    const img = a.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/a.png");
    expect(img?.getAttribute("alt")).toBe("Alpha logo");
    expect(img?.getAttribute("width")).toBe("20");
    expect(img?.className).toContain("rounded-full");
    expect(a.querySelector("svg")).toBeNull();
    expect(a.className).toContain("items-center");
  });

  it("prefers app over image", async () => {
    await mount([{ href: "/vmem", label: "vmem", app: "vmem", image: { src: "/m.png", alt: "vmem logo" } }]);
    const a = link("vmem");
    expect(a.querySelector("svg")?.getAttribute("data-app")).toBe("vmem");
    expect(a.querySelector("img")).toBeNull();
  });

  it("renders a plain link without app or image", async () => {
    await mount([{ href: "/about", label: "About" }]);
    const a = link("About");
    expect(a.getAttribute("href")).toBe("/about");
    expect(a.getAttribute("target")).toBeNull();
    expect(a.querySelector("svg, img")).toBeNull();
    expect(a.className.split(" ")).not.toContain("flex");
  });
});

describe("SiteFooter app path", () => {
  const appProps: SiteFooterAppProps = {
    app: "vibot",
    tagline: "Tagline",
    year: 2026,
    columns: [{ heading: "Navigation", links: [{ href: "#features", label: "Features" }] }],
  };

  async function mountApp(props: Partial<SiteFooterAppProps> = {}) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(<SiteFooter {...appProps} {...props} />));
    return host;
  }

  const hrefs = (host: HTMLElement) => [...host.querySelectorAll("a")].map((a) => a.getAttribute("href"));

  it("renders AppWordmark at size 18 without the Michroma wrapper", async () => {
    const host = await mountApp();
    expect(SITE_FOOTER_WORDMARK_SIZE).toBe(18);
    const wm = host.querySelector<HTMLElement>("[data-app='vibot']")!;
    expect(wm.style.fontSize).toBe("18px");
    expect(wm.parentElement?.className).toBe("mb-3 md:mb-4");
    expect(host.innerHTML).not.toContain("font-michroma");
  });

  it("defaults socials to X, Instagram and GitHub", async () => {
    const host = await mountApp();
    const socials = [...host.querySelectorAll("a[aria-label]")];
    expect(socials.map((a) => [a.getAttribute("href"), a.getAttribute("aria-label")])).toEqual([
      ["https://x.com/projectvdotuk", "Project V on X"],
      ["https://www.instagram.com/projectvdotuk/", "Project V on Instagram"],
      ["https://github.com/projectvdotuk", "Project V on GitHub"],
    ]);
    expect(PROJECT_V_SOCIALS).toHaveLength(3);
    expect(host.innerHTML).not.toMatch(/linkedin|twitter\.com/i);
  });

  it("hides socials with an empty array", async () => {
    const host = await mountApp({ socials: [] });
    expect(host.querySelectorAll("a[aria-label]")).toHaveLength(0);
  });

  it("renders the product-of line with a Project V link", async () => {
    const host = await mountApp();
    const p = [...host.querySelectorAll("p")].find((el) => el.textContent === "vibot is a product of Project V.")!;
    expect(p).toBeDefined();
    const a = p.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("https://projectv.uk");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("hides the product-of line with showProductOf false", async () => {
    const host = await mountApp({ showProductOf: false });
    expect(host.textContent).not.toContain("is a product of");
  });

  it("uses the app id as the copyright name", async () => {
    const host = await mountApp();
    expect(host.textContent).toContain("Copyright © 2026 vibot");
  });

  it("defaults legal links", async () => {
    const host = await mountApp();
    expect(PROJECT_V_LEGAL_LINKS.map((l) => l.href)).toEqual(["https://projectv.uk/privacy", "https://projectv.uk/terms"]);
    expect(hrefs(host)).toEqual(expect.arrayContaining(["https://projectv.uk/privacy", "https://projectv.uk/terms"]));
    expect(link("Privacy Policy").getAttribute("target")).toBe("_blank");
  });

  it("appends the Apps column in order with glyphs", async () => {
    const host = await mountApp();
    const headings = [...host.querySelectorAll("h4")].map((h) => h.textContent);
    expect(headings).toEqual(["Navigation", "Apps"]);
    const appLinks = [...host.querySelectorAll("a")].filter((a) => a.getAttribute("href")?.endsWith(".projectv.uk") && a.querySelector("svg"));
    expect(appLinks.map((a) => [a.getAttribute("href"), a.textContent, a.querySelector("svg")?.getAttribute("data-app"), a.getAttribute("target")])).toEqual(
      ["vibot", "vmem", "verve", "velth", "vhub"].map((id) => [`https://${id}.projectv.uk`, id, id, "_blank"]),
    );
  });

  it("skips the Apps column when includeAppsColumn is false", async () => {
    const host = await mountApp({ includeAppsColumn: false });
    expect([...host.querySelectorAll("h4")].map((h) => h.textContent)).toEqual(["Navigation"]);
  });

  it("does not duplicate an Apps column the app passes (case-insensitive)", async () => {
    const host = await mountApp({ columns: [{ heading: "apps", links: [{ href: "/x", label: "X" }] }] });
    expect([...host.querySelectorAll("h4")].map((h) => h.textContent)).toEqual(["apps"]);
  });

  it("renders the actions slot", async () => {
    const host = await mountApp({ actions: <button type="button">Sign in</button> });
    expect([...host.querySelectorAll("button")].map((b) => b.textContent)).toContain("Sign in");
  });

  it("keeps the Michroma brand wrapper on the legacy path", async () => {
    await mount([]);
    expect(document.body.innerHTML).toContain("font-michroma");
    expect(document.body.textContent).not.toContain("is a product of");
  });
});

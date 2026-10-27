// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SiteFooter, type SiteFooterLink, type SiteFooterProps } from "./SiteFooter";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const base: SiteFooterProps = {
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

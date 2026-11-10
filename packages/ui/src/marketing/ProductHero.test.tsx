// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductHero, type ProductHeroProps } from "./ProductHero";
import { PROJECT_V_HOME_URL } from "./projectV";


// Testing Library is not a dependency of this package, so these helpers query by ARIA role
// the same way: implicit roles from the element, explicit `role` attributes, accessible name from text or `aria-label`.
const SELECTORS: Record<string, string> = {
  heading: "h1,h2,h3,h4,h5,h6,[role='heading']",
  link: "a[href],[role='link']",
  button: "button,[role='button']",
  img: "[role='img']",
};
type RoleOpts = { name?: string; level?: number };
const nameOf = (el: Element): string => el.getAttribute("aria-label") ?? (el.textContent ?? "").trim();
function queryAllByRole(root: HTMLElement, role: string, { name, level }: RoleOpts = {}) {
  return [...root.querySelectorAll<HTMLElement>(SELECTORS[role]!)].filter(
    (el) => !el.closest("[aria-hidden='true']") && (name === undefined || nameOf(el) === name) && (level === undefined || el.tagName === `H${level}`),
  );
}
const getAllByRole = (root: HTMLElement, role: string, opts?: RoleOpts) => {
  const found = queryAllByRole(root, role, opts);
  if (found.length === 0) throw new Error(`No ${role} found${opts?.name ? ` named "${opts.name}"` : ""}`);
  return found;
};
const getByRole = (root: HTMLElement, role: string, opts?: RoleOpts) => {
  const found = getAllByRole(root, role, opts);
  if (found.length > 1) throw new Error(`Several ${role} elements found`);
  return found[0] as HTMLElement;
};
const queryByRole = (root: HTMLElement, role: string, opts?: RoleOpts) => queryAllByRole(root, role, opts)[0] ?? null;
const getByTestId = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`[data-testid='${id}']`)!;
const queryTestId = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`[data-testid='${id}']`);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const base: ProductHeroProps = {
  title: "Make something useful",
  tagline: "A short product description.",
  primaryCta: { label: "Get started", href: "#start" },
  visual: <div data-testid="visual">concept</div>,
};

async function mount(props: Partial<ProductHeroProps> = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<ProductHero {...base} {...props} />));
  return host;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ProductHero", () => {
  it("renders the title as the only h1 with the page title contract", async () => {
    const host = await mount();
    const headings = queryAllByRole(host, "heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]!.textContent).toBe("Make something useful");
    const classes = headings[0]!.className.split(" ");
    expect(classes).toEqual(expect.arrayContaining(["font-semibold", "leading-tight", "tracking-tight", "text-4xl", "sm:text-5xl", "lg:text-6xl"]));
    expect(classes).not.toContain("text-xl");
    expect(classes).not.toContain("font-light");
    expect(classes).not.toContain("font-normal");
  });

  it("renders the tagline", async () => {
    const host = await mount();
    expect(host.textContent).toContain("A short product description.");
  });

  it("renders the visual slot", async () => {
    const host = await mount();
    expect(getByTestId(host, "visual").textContent).toBe("concept");
  });

  it("renders a primary link with its href", async () => {
    const host = await mount();
    expect(getByRole(host, "link", { name: "Get started" }).getAttribute("href")).toBe("#start");
  });

  it("renders a CTA with href, rel and target as a plain anchor", async () => {
    const host = await mount({ secondaryCta: { label: "Download", href: "https://example.com/get", rel: "nofollow", target: "_blank" } });
    const link = getByRole(host, "link", { name: "Download" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("https://example.com/get");
    expect(link.getAttribute("rel")).toBe("nofollow");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.hasAttribute("data-prefetch")).toBe(false);
  });

  it("renders a primary button and calls onClick when there is no href", async () => {
    const onClick = vi.fn();
    const host = await mount({ primaryCta: { label: "Start now", onClick } });
    const button = getByRole(host, "button", { name: "Start now" });
    await act(async () => button.click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the optional secondary action only when set", async () => {
    const without = await mount();
    expect(queryByRole(without, "link", { name: "See more" })).toBeNull();
    document.body.innerHTML = "";
    const host = await mount({ secondaryCta: { label: "See more", href: "#more" } });
    expect(getByRole(host, "link", { name: "See more" }).getAttribute("href")).toBe("#more");
  });

  it("pills both actions", async () => {
    const host = await mount({ secondaryCta: { label: "See more", href: "#more" } });
    for (const name of ["Get started", "See more"]) {
      expect(getByRole(host, "link", { name }).className).toContain("rounded-full");
    }
  });

  describe("Sign in", () => {
    const signIns = (host: HTMLElement) => [...queryAllByRole(host, "link"), ...queryAllByRole(host, "button")].filter((el) => el.textContent === "Sign in");

    it("renders none when signIn is omitted", async () => {
      expect(signIns(await mount())).toHaveLength(0);
    });

    it("renders exactly one link with href", async () => {
      const host = await mount({ signIn: { href: "/sign-in" } });
      expect(signIns(host)).toHaveLength(1);
      expect(queryAllByRole(host, "link", { name: "Sign in" })).toHaveLength(1);
      expect(getByRole(host, "link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
    });

    it("renders exactly one button with onClick", async () => {
      const onClick = vi.fn();
      const host = await mount({ signIn: { onClick }, secondaryCta: { label: "See more", href: "#more" } });
      expect(signIns(host)).toHaveLength(1);
      const buttons = queryAllByRole(host, "button", { name: "Sign in" });
      expect(buttons).toHaveLength(1);
      await act(async () => buttons[0]!.click());
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("product-of line", () => {
    it("links to Project V by default", async () => {
      const host = await mount();
      expect(PROJECT_V_HOME_URL).toBe("https://projectv.uk");
      const a = getByRole(host, "link", { name: "Project V" });
      expect(a.getAttribute("href")).toBe("https://projectv.uk");
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
      expect(a.parentElement?.textContent).toBe("a product of Project V");
    });

    it("always links to PROJECT_V_HOME_URL, whatever extra props are passed", async () => {
      const host = await mount({
        productOfHref: "https://vedantb.com",
        productOfUrl: "https://vedantb.com",
        href: "https://vedantb.com",
      } as unknown as Partial<ProductHeroProps>);
      const a = getByRole(host, "link", { name: "Project V" });
      expect(a.getAttribute("href")).toBe("https://projectv.uk");
      expect(a.getAttribute("href")).toBe(PROJECT_V_HOME_URL);
      expect(host.querySelectorAll("a[href*='vedantb.com']")).toHaveLength(0);
    });

    it("has no prop that takes a product-of URL", () => {
      // Type-level: showProductOf is a boolean and no URL prop exists.
      const keys: (keyof ProductHeroProps)[] = ["showProductOf"];
      const props: ProductHeroProps = { ...base, showProductOf: true };
      expect(typeof props[keys[0]!]).toBe("boolean");
      // @ts-expect-error productOfHref is not a prop
      const bad: ProductHeroProps = { ...base, productOfHref: "https://vedantb.com" };
      expect(bad).toBeDefined();
    });

    it("is hidden with showProductOf false", async () => {
      const host = await mount({ showProductOf: false });
      expect(host.textContent).not.toContain("a product of");
      expect(queryByRole(host, "link", { name: "Project V" })).toBeNull();
    });
  });

  describe("userCount", () => {
    const stubMotion = (reduced: boolean) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)" ? reduced : false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }));
    };
    afterEach(() => vi.unstubAllGlobals());

    it("is hidden when userCount is undefined", async () => {
      const host = await mount();
      expect(queryTestId(host, "user-count")).toBeNull();
      expect(host.textContent).not.toContain("people already here");
    });

    it("is hidden when userCount is 0 or null", async () => {
      for (const userCount of [0, null, -1]) {
        document.body.innerHTML = "";
        const host = await mount({ userCount });
        expect(queryTestId(host, "user-count")).toBeNull();
        expect(host.textContent).not.toContain("0+");
      }
    });

    it("shows the formatted count", async () => {
      stubMotion(false);
      const host = await mount({ userCount: 1284 });
      const text = getByTestId(host, "user-count").textContent ?? "";
      expect(text).toContain("Free to use");
      expect(text).toContain("1,284+");
      expect(text).toContain("people already here");
    });

    it("places the row after the actions", async () => {
      stubMotion(false);
      const host = await mount({ userCount: 1284 });
      const cta = getByRole(host, "link", { name: "Get started" });
      expect(cta.compareDocumentPosition(getByTestId(host, "user-count")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("pulses the dot when motion is allowed", async () => {
      stubMotion(false);
      const host = await mount({ userCount: 1284 });
      const dot = getByTestId(host, "user-count-dot");
      expect(dot.className).toContain("animate-pulse");
      expect(dot.className).toContain("bg-success");
    });

    it("renders a static dot under prefers-reduced-motion", async () => {
      stubMotion(true);
      const host = await mount({ userCount: 1284 });
      const dot = getByTestId(host, "user-count-dot");
      expect(dot.className).not.toContain("animate-pulse");
      expect(dot.className).toContain("bg-success");
    });
  });

  describe("visual accessibility", () => {
    it("is decorative without visualLabel", async () => {
      const host = await mount();
      const region = getByTestId(host, "visual").parentElement!;
      expect(region.getAttribute("aria-hidden")).toBe("true");
      expect(region.getAttribute("role")).toBeNull();
      expect(queryByRole(host, "img")).toBeNull();
    });

    it("is a labelled image with visualLabel", async () => {
      const host = await mount({ visualLabel: "Orbiting rings" });
      const img = getByRole(host, "img", { name: "Orbiting rings" });
      expect(img.getAttribute("aria-hidden")).toBeNull();
      expect(img.contains(getByTestId(host, "visual"))).toBe(true);
    });
  });

  it("orders the copy before the visual and keeps all actions labelled", async () => {
    const host = await mount({ secondaryCta: { label: "See more", href: "#more" }, signIn: { href: "/sign-in" } });
    const h1 = getByRole(host, "heading", { level: 1 });
    const visual = getByTestId(host, "visual");
    expect(h1.compareDocumentPosition(visual) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const el of getAllByRole(host, "link")) expect(el.textContent?.trim()).not.toBe("");
  });

  it("merges className on the section", async () => {
    const host = await mount({ className: "custom-hero" });
    expect(host.querySelector("section")?.className).toContain("custom-hero");
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PAGE_HEADER_HEIGHT,
  PAGE_TITLE_CLASS,
  pageTitleStyle,
  sizeStyle,
  trackingStyle,
  typeStyle,
} from "../src/controlStyles";
import { tokens } from "../src/tokens";

// `PageTitle` and `PageHeader` against the web page title, the classes on the
// `Breadcrumb` nav (`breadcrumb.tsx`). The component checks call them with
// React Native, NativeWind and the safe-area insets stubbed, and read the
// element tree they return.

const scheme = vi.hoisted(() => ({ colorScheme: "light" as "light" | "dark" }));
vi.mock("react-native", () => ({ Text: "Text", View: "View" }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("nativewind", () => ({ useColorScheme: () => scheme }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const breadcrumb = readFileSync(join(root, "..", "ui", "src/ui/breadcrumb.tsx"), "utf8");
const source = readFileSync(join(root, "src/PageTitle.tsx"), "utf8");

/** The web page title classes, on the `Breadcrumb` nav. */
const WEB_TITLE = "text-xl font-semibold leading-tight tracking-tight";

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : ((style as Record<string, unknown>) ?? {});

const children = (element: Element) => [element.props.children].flat() as (Element | null)[];

afterEach(() => {
  scheme.colorScheme = "light";
});

describe("page title type (web contract)", () => {
  it("the web Breadcrumb still sets text-xl font-semibold leading-tight tracking-tight", () => {
    expect(breadcrumb).toContain(`"flex min-w-0 items-center gap-1.5 ${WEB_TITLE}"`);
  });

  it("PAGE_TITLE_CLASS is the web classes with the Instrument Sans semibold face", () => {
    const web = WEB_TITLE.replace("font-semibold", "font-instrument-sans-semibold");
    expect(PAGE_TITLE_CLASS.split(" ").sort()).toEqual(web.split(" ").sort());
  });

  it("pageTitleStyle is Instrument Sans 600 at 20 / 25 with -0.5 letter spacing", () => {
    // Tailwind: text-xl 1.25rem, leading-tight 1.25, tracking-tight -0.025em.
    expect(pageTitleStyle()).toEqual({ fontSize: 20, lineHeight: 25, fontWeight: "600", letterSpacing: -0.5 });
    expect(pageTitleStyle()).toEqual({
      ...sizeStyle("text-xl", "tight"),
      ...typeStyle("semibold"),
      ...trackingStyle(20, "tight"),
    });
    expect(Number(pageTitleStyle().fontWeight)).toBe(600);
  });

  it("trackingStyle is tracking-tight (-0.025em) in points", () => {
    expect(trackingStyle(20, "tight")).toEqual({ letterSpacing: -0.5 });
    expect(trackingStyle(24, "tight").letterSpacing).toBeCloseTo(-0.6);
    expect(trackingStyle(16, "tight").letterSpacing).toBeCloseTo(-0.4);
  });
});

describe("PageTitle", () => {
  async function render(props: Record<string, unknown> = {}) {
    const { PageTitle } = await import("../src/PageTitle");
    return PageTitle({ children: "Apps", ...props }) as unknown as Element;
  }

  it("draws the web page title: semibold face and 600, 20 / 25, -0.5, foreground", async () => {
    const title = await render();
    expect(title.type).toBe("Text");
    expect(title.props.children).toBe("Apps");
    expect(title.props.className).toBe(PAGE_TITLE_CLASS);
    expect(String(title.props.className).split(" ")).toContain("font-instrument-sans-semibold");
    expect(flatten(title.props.style)).toEqual({
      color: tokens.color.foreground.light,
      fontSize: 20,
      lineHeight: 25,
      fontWeight: "600",
      letterSpacing: -0.5,
    });
  });

  it("is a header, one line, and leaves font scaling on", async () => {
    const title = await render();
    expect(title.props.accessibilityRole).toBe("header");
    expect(title.props.numberOfLines).toBe(1);
    expect(title.props).not.toHaveProperty("allowFontScaling");
    expect(title.props).not.toHaveProperty("maxFontSizeMultiplier");
    expect(source).not.toMatch(/allowFontScaling|maxFontSizeMultiplier/);
  });

  it("follows the dark scheme with a style, not a text-foreground class", async () => {
    scheme.colorScheme = "dark";
    const title = await render();
    expect(flatten(title.props.style).color).toBe(tokens.color.foreground.dark);
    expect(String(title.props.className)).not.toMatch(/text-foreground/);
  });

  it("takes className, style, testID and Text props after its own", async () => {
    const title = await render({ className: "text-center", style: { color: "#123456" }, testID: "t", numberOfLines: 2 });
    expect(title.props.className).toBe(`${PAGE_TITLE_CLASS} text-center`);
    expect(flatten(title.props.style)).toMatchObject({ color: "#123456", fontWeight: "600", fontSize: 20 });
    expect(title.props.testID).toBe("t");
    expect(title.props.numberOfLines).toBe(2);
  });
});

describe("PageHeader", () => {
  async function render(props: Record<string, unknown> = {}) {
    const mod = await import("../src/PageTitle");
    const header = mod.PageHeader({ title: "Apps", ...props } as never) as unknown as Element;
    const [title, slot] = children(header);
    return { header, title: title!, slot, PageTitle: mod.PageTitle };
  }

  it("pads the top by the safe-area inset by default, with a 56 row below it", async () => {
    const { header } = await render();
    expect(header.type).toBe("View");
    expect(flatten(header.props.style)).toEqual({ paddingTop: 47, minHeight: 47 + PAGE_HEADER_HEIGHT });
    expect(PAGE_HEADER_HEIGHT).toBe(56);
  });

  it("drops the inset with safeTop={false}", async () => {
    const { header } = await render({ safeTop: false });
    expect(flatten(header.props.style)).toEqual({ paddingTop: 0, minHeight: PAGE_HEADER_HEIGHT });
  });

  it("is a row with the ScreenContainer side padding, the title first and able to shrink", async () => {
    const { header, title, PageTitle } = await render();
    expect(header.props.className).toBe("flex-row items-center justify-between gap-3 px-4");
    expect(readFileSync(join(root, "src/ScreenContainer.tsx"), "utf8")).toMatch(/className="flex-col gap-4 p-4"/);
    expect(title.type).toBe(PageTitle);
    expect(title.props.children).toBe("Apps");
    expect(title.props.className).toBe("min-w-0 flex-1");
  });

  it("renders the action at the end, in a view that does not shrink", async () => {
    const action = createElement("Button", { children: "Update all" });
    const { slot } = await render({ action });
    expect(slot).not.toBeNull();
    expect(slot!.type).toBe("View");
    expect(slot!.props.className).toBe("shrink-0");
    expect(slot!.props.children).toBe(action);
  });

  it("renders no action slot without an action", async () => {
    const { header, slot } = await render();
    expect(slot).toBeNull();
    expect(children(header).filter(Boolean)).toHaveLength(1);
  });

  it("takes className, titleClassName, style and View props", async () => {
    const { header, title } = await render({
      className: "px-0",
      titleClassName: "text-center",
      style: { backgroundColor: "#fff" },
      testID: "header",
    });
    expect(header.props.className).toBe("flex-row items-center justify-between gap-3 px-4 px-0");
    expect(title.props.className).toBe("min-w-0 flex-1 text-center");
    expect(flatten(header.props.style)).toEqual({ paddingTop: 47, minHeight: 47 + 56, backgroundColor: "#fff" });
    expect(header.props.testID).toBe("header");
  });
});

describe("Page title in the gallery", () => {
  it("shows PageTitle and a PageHeader with an Update all action in a Page title section, first", () => {
    const gallery = readFileSync(join(root, "src/examples/ParityGallery.tsx"), "utf8");
    const start = gallery.indexOf('<Section title="Page title">');
    expect(start).toBeGreaterThan(0);
    expect(start).toBeLessThan(gallery.indexOf('<Section title="Brand">'));
    const section = gallery.slice(start, gallery.indexOf('<Section title="Brand">'));
    expect(section).toMatch(/<PageTitle>Updates<\/PageTitle>/);
    expect(section).toMatch(/<PageHeader\s+title="Apps"/);
    expect(section).toMatch(/action=\{\s*<Button [^>]*fullWidth=\{false\}(?:=>|[^>])*>\s*Update all\s*<\/Button>/);
  });
});

// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, createRef, type ComponentType, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as root from "../index";
import {
  AutomationIcon,
  BarChartIcon,
  BoardIcon,
  BoltIcon,
  BuildingIcon,
  ChecklistIcon,
  DocumentIcon,
  DraftIcon,
  FilesIcon,
  FlaskIcon,
  InboxArrowIcon,
  InboxIcon,
  MemoryIcon,
  ReviewIcon,
  SearchIcon,
  SettingsIcon,
  SidebarToggleIcon,
  TerminalIcon,
  type IconProps,
} from "./index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const CSS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../tokens/src/css");

/** Every icon with its default stroke width. */
const ICONS: [string, ComponentType<IconProps>, string][] = [
  ["MemoryIcon", MemoryIcon, "1.7"],
  ["BoltIcon", BoltIcon, "1.7"],
  ["FilesIcon", FilesIcon, "1.7"],
  ["InboxIcon", InboxIcon, "1.7"],
  ["BuildingIcon", BuildingIcon, "1.7"],
  ["SettingsIcon", SettingsIcon, "1.7"],
  ["BoardIcon", BoardIcon, "1.75"],
  ["ChecklistIcon", ChecklistIcon, "1.75"],
  ["TerminalIcon", TerminalIcon, "1.75"],
  ["DocumentIcon", DocumentIcon, "1.75"],
  ["ReviewIcon", ReviewIcon, "1.75"],
  ["FlaskIcon", FlaskIcon, "1.75"],
  ["InboxArrowIcon", InboxArrowIcon, "1.75"],
  ["DraftIcon", DraftIcon, "1.75"],
  ["AutomationIcon", AutomationIcon, "1.75"],
  ["BarChartIcon", BarChartIcon, "1.75"],
  ["SearchIcon", SearchIcon, "1.75"],
  ["SidebarToggleIcon", SidebarToggleIcon, "1.75"],
];

const FILLABLE = new Set(["TerminalIcon", "InboxArrowIcon", "AutomationIcon"]);

let reactRoot: Root | null = null;
let host: HTMLElement | null = null;

async function render(node: ReactNode): Promise<SVGSVGElement> {
  await cleanup();
  const el = document.createElement("div");
  document.body.appendChild(el);
  const r = createRoot(el);
  host = el;
  reactRoot = r;
  await act(async () => {
    r.render(node);
  });
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("no svg rendered");
  return svg;
}

async function cleanup() {
  await act(async () => reactRoot?.unmount());
  host?.remove();
  reactRoot = null;
  host = null;
}

afterEach(cleanup);

describe.each(ICONS)("%s", (name, Icon, stroke) => {
  it("renders the source defaults", async () => {
    const svg = await render(<Icon />);
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("width")).toBe("20");
    expect(svg.getAttribute("height")).toBe("20");
    expect(svg.getAttribute("stroke-width")).toBe(stroke);
    expect(svg.getAttribute("fill")).toBe("none");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
    expect(svg.getAttribute("stroke-linecap")).toBe("round");
    expect(svg.getAttribute("stroke-linejoin")).toBe("round");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.hasAttribute("role")).toBe(false);
    expect(svg.querySelector("title")).toBeNull();
    expect(svg.getAttribute("class")).toBe("vv-icon");
    expect(svg.getAttribute("data-animate")).toBe("hover");
    expect(svg.getAttribute("data-hover-scale")).toBe(stroke === "1.7" ? "1.15" : "1.12");
    expect(svg.hasAttribute("style")).toBe(false);
    expect(svg.hasAttribute("data-active")).toBe(false);
  });

  it("applies size, colour, class, style and stroke width", async () => {
    let svg = await render(<Icon size={32} />);
    expect([svg.getAttribute("width"), svg.getAttribute("height")]).toEqual(["32", "32"]);
    svg = await render(<Icon size="1.5em" />);
    expect([svg.getAttribute("width"), svg.getAttribute("height")]).toEqual(["1.5em", "1.5em"]);

    svg = await render(<Icon color="red" className="text-primary extra" style={{ opacity: 0.5 }} strokeWidth={2.5} />);
    expect(svg.style.color).toBe("red");
    expect(svg.style.opacity).toBe("0.5");
    expect(svg.classList.contains("vv-icon")).toBe(true);
    expect(svg.classList.contains("text-primary")).toBe(true);
    expect(svg.classList.contains("extra")).toBe(true);
    expect(svg.getAttribute("stroke-width")).toBe("2.5");

    svg = await render(<Icon color="currentColor" />);
    expect(svg.hasAttribute("style")).toBe(false);
  });

  it("labels the icon when given a title", async () => {
    const svg = await render(<Icon title={`${name} label`} />);
    const title = svg.querySelector("title");
    expect(title?.textContent).toBe(`${name} label`);
    expect(svg.firstElementChild).toBe(title);
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.hasAttribute("aria-hidden")).toBe(false);
    expect(title?.id).toBeTruthy();
    expect(svg.getAttribute("aria-labelledby")).toBe(title?.id);
  });

  it("reflects animate and duration", async () => {
    let svg = await render(<Icon animate />);
    expect(svg.getAttribute("data-animate")).toBe("true");
    svg = await render(<Icon animate={false} />);
    expect(svg.getAttribute("data-animate")).toBe("false");
    svg = await render(<Icon animate="hover" duration={0} />);
    expect(svg.getAttribute("data-animate")).toBe("hover");
    expect(svg.hasAttribute("style")).toBe(false);
    svg = await render(<Icon duration={5000} />);
    expect(Number(svg.style.getPropertyValue("--vv-icon-duration-scale"))).toBeGreaterThan(0);
  });

  it("forwards other svg props and the ref", async () => {
    const onClick = vi.fn();
    const ref = createRef<SVGSVGElement>();
    const svg = await render(<Icon data-testid="icon" id="icon-id" onClick={onClick} ref={ref} />);
    expect(svg.getAttribute("data-testid")).toBe("icon");
    expect(svg.id).toBe("icon-id");
    expect(ref.current).toBe(svg);
    await act(async () => {
      svg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  if (!FILLABLE.has(name)) {
    it("active only adds data-active", async () => {
      const idle = (await render(<Icon />)).innerHTML;
      const svg = await render(<Icon active />);
      expect(svg.getAttribute("data-active")).toBe("true");
      expect(svg.innerHTML).toBe(idle);
    });
  }
});

describe("duration", () => {
  it("scales against the icon's longest loop", async () => {
    let svg = await render(<MemoryIcon duration={2000} />);
    expect(svg.style.getPropertyValue("--vv-icon-duration-scale")).toBe("2");
    svg = await render(<SettingsIcon duration={1250} />);
    expect(svg.style.getPropertyValue("--vv-icon-duration-scale")).toBe("0.5");
  });

  it("uses each SettingsIcon variant's own loop", async () => {
    let svg = await render(<SettingsIcon variant="spin" duration={1250} />);
    expect(svg.style.getPropertyValue("--vv-icon-duration-scale")).toBe("0.5");
    svg = await render(<SettingsIcon variant="turn" duration={1200} />);
    expect(svg.style.getPropertyValue("--vv-icon-duration-scale")).toBe("0.5");
    svg = await render(<SettingsIcon variant="turn" duration={2400} />);
    expect(svg.style.getPropertyValue("--vv-icon-duration-scale")).toBe("1");
  });
});

/** `<SettingsIcon />` as 0.11.0 rendered it. */
const SETTINGS_0_11_0 =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="vv-icon" data-animate="hover" data-hover-scale="1.15" aria-hidden="true"><g class="vv-icon-gear"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></g></svg>';

const TURN_GEAR =
  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065";

describe("SettingsIcon variant", () => {
  it("renders the 0.11.0 markup by default and with variant=\"spin\"", async () => {
    expect((await render(<SettingsIcon />)).outerHTML).toBe(SETTINGS_0_11_0);
    expect((await render(<SettingsIcon variant="spin" />)).outerHTML).toBe(SETTINGS_0_11_0);
  });

  it("turn draws the hub-first gear with its own stroke and hover scale", async () => {
    const svg = await render(<SettingsIcon variant="turn" />);
    expect(svg.getAttribute("stroke-width")).toBe("1.75");
    expect(svg.getAttribute("data-hover-scale")).toBe("1.12");
    expect(svg.getAttribute("data-animate")).toBe("hover");
    expect(svg.getAttribute("class")).toBe("vv-icon");
    expect(svg.hasAttribute("style")).toBe(false);
    expect(svg.querySelector(".vv-icon-gear")).toBeNull();
    expect(svg.children).toHaveLength(1);
    const gear = svg.firstElementChild;
    expect(gear?.tagName.toLowerCase()).toBe("g");
    expect(gear?.getAttribute("class")).toBe("vv-icon-gear-turn");
    expect([...(gear?.children ?? [])].map((el) => el.tagName.toLowerCase())).toEqual(["circle", "path"]);
    const circle = gear?.querySelector("circle");
    expect([circle?.getAttribute("cx"), circle?.getAttribute("cy"), circle?.getAttribute("r")]).toEqual(["12", "12", "3"]);
    expect(gear?.querySelector("path")?.getAttribute("d")).toBe(TURN_GEAR);
  });

  it("turn takes the shared props", async () => {
    let svg = await render(<SettingsIcon variant="turn" strokeWidth={2} animate size={24} className="extra" />);
    expect(svg.getAttribute("stroke-width")).toBe("2");
    expect(svg.getAttribute("data-animate")).toBe("true");
    expect(svg.getAttribute("width")).toBe("24");
    expect(svg.getAttribute("class")).toBe("vv-icon extra");
    const idle = svg.innerHTML;
    svg = await render(<SettingsIcon variant="turn" strokeWidth={2} animate size={24} className="extra" active />);
    expect(svg.getAttribute("data-active")).toBe("true");
    expect(svg.innerHTML).toBe(idle);
  });
});

describe("inner stroke widths", () => {
  it("keep their own value when strokeWidth changes", async () => {
    const svg = await render(<BarChartIcon strokeWidth={3} />);
    expect(svg.querySelector("polyline")?.getAttribute("stroke-width")).toBe("1.3");
  });
});

describe("active solid variants", () => {
  it("TerminalIcon fills the window and cuts out the prompt and characters", async () => {
    let svg = await render(<TerminalIcon />);
    expect(svg.querySelector("rect")?.getAttribute("fill")).toBe("none");
    expect(svg.querySelector(".vv-icon-terminal-prompt")?.hasAttribute("style")).toBe(false);

    svg = await render(<TerminalIcon active />);
    expect(svg.getAttribute("data-active")).toBe("true");
    expect(svg.querySelector("rect")?.getAttribute("fill")).toBe("currentColor");
    const prompt = svg.querySelector<SVGElement>(".vv-icon-terminal-prompt");
    expect(prompt?.style.stroke).toContain("--sidebar-accent");
    for (const el of svg.querySelectorAll<SVGElement>(".vv-icon-terminal-typed, .vv-icon-terminal-cursor")) {
      expect(el.style.fill).toContain("--sidebar-accent");
    }

    svg = await render(<TerminalIcon active cutoutColor="red" />);
    expect(svg.querySelector<SVGElement>(".vv-icon-terminal-prompt")?.style.stroke).toBe("red");
    expect(svg.querySelector<SVGElement>(".vv-icon-terminal-cursor")?.style.fill).toBe("red");
  });

  it("InboxArrowIcon fills the tray, cuts out the divider and adds the arrow halo", async () => {
    let svg = await render(<InboxArrowIcon />);
    expect(svg.querySelectorAll(".vv-icon-inbox-arrow line")).toHaveLength(1);

    svg = await render(<InboxArrowIcon active cutoutColor="red" />);
    const [body, divider] = [...svg.children].filter((el) => el.tagName.toLowerCase() === "path");
    expect(body?.getAttribute("fill")).toBe("currentColor");
    expect(divider?.getAttribute("style")).toBe("stroke: red;");
    const halo = svg.querySelector<SVGElement>(".vv-icon-inbox-arrow > g");
    expect(halo?.getAttribute("stroke-width")).toBe("4");
    expect(halo?.style.stroke).toBe("red");
    expect(svg.querySelectorAll(".vv-icon-inbox-arrow line")).toHaveLength(2);
  });

  it("AutomationIcon adds the inner disc and cuts out the play triangle", async () => {
    let svg = await render(<AutomationIcon />);
    expect(svg.querySelector('circle[r="6.5"]')).toBeNull();

    svg = await render(<AutomationIcon active />);
    expect(svg.querySelector('circle[r="6.5"]')?.getAttribute("fill")).toBe("currentColor");
    expect(svg.querySelector<SVGElement>(".vv-icon-automation-play")?.style.fill).toContain("--sidebar-accent");
  });
});

describe("SidebarToggleIcon", () => {
  it("points the chevron out and marks the root when collapsed", async () => {
    let svg = await render(<SidebarToggleIcon className="extra" />);
    expect(svg.querySelector(".vv-icon-sidebar-chevron")?.getAttribute("d")).toBe("M16 9l-3 3 3 3");
    expect(svg.classList.contains("vv-icon-sidebar-collapsed")).toBe(false);

    svg = await render(<SidebarToggleIcon collapsed className="extra" />);
    expect(svg.querySelector(".vv-icon-sidebar-chevron")?.getAttribute("d")).toBe("M13 9l3 3-3 3");
    expect(svg.getAttribute("class")).toBe("vv-icon vv-icon-sidebar-collapsed extra");
  });
});

describe("root entry", () => {
  it("exports every icon and the base", () => {
    for (const [name] of ICONS) expect(root, name).toHaveProperty(name);
    expect(root).toHaveProperty("NavIconBase");
  });
});

describe("nav-icons.css", () => {
  const css = readFileSync(join(CSS_DIR, "nav-icons.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("is imported by index.css", () => {
    expect(readFileSync(join(CSS_DIR, "index.css"), "utf8")).toMatch(/^@import "\.\/nav-icons\.css";$/m);
  });

  it("animates every shape class the icons use, with defined keyframes", async () => {
    // Classes that group shapes and carry no animation of their own.
    const hooks = new Set([
      "vv-icon-building-window", "vv-icon-board-card", "vv-icon-checklist-ring", "vv-icon-checklist-line",
      "vv-icon-checklist-check", "vv-icon-terminal-typed", "vv-icon-document-line", "vv-icon-flask-bubble",
      "vv-icon-chart-bar", "vv-icon-draft-pencil", "vv-icon-sidebar-collapsed",
    ]);
    const animated = new Set<string>();
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const value = body?.match(/animation:([^;]+);/)?.[1];
      if (!selectors || !value) continue;
      for (const sel of selectors.split(",")) {
        const last = sel.trim().match(/\.(vv-icon-[\w-]+)$/)?.[1];
        if (last) animated.add(last);
      }
      for (const [keyframes] of value.matchAll(/(?<![\w-])vv-icon-[\w-]+/g)) {
        expect(css, keyframes).toContain(`@keyframes ${keyframes} {`);
      }
    }

    const used = new Set<string>();
    const variants = [
      ...ICONS.flatMap(([name, Icon]) => [<Icon key={name} />, <Icon key={`${name}-active`} active />]),
      <SidebarToggleIcon key="collapsed" collapsed />,
      <SettingsIcon key="turn" variant="turn" />,
    ];
    for (const node of variants) {
      const svg = await render(node);
      for (const el of [svg, ...svg.querySelectorAll("*")]) {
        for (const c of el.classList) if (c.startsWith("vv-icon-")) used.add(c);
      }
    }
    for (const c of used) if (!hooks.has(c)) expect(animated, c).toContain(c);
    for (const c of animated) expect(used, c).toContain(c);
  });

  it("gives every shape it transforms its own transform box", async () => {
    const fillBox = new Set(
      [...css.matchAll(/([^{}]+)\{[^{}]*transform-box: fill-box;[^{}]*\}/g)].flatMap(([, selectors]) =>
        (selectors ?? "").split(",").map((sel) => sel.trim().replace(/^\./, "")),
      ),
    );
    const transforming = new Set<string>();
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const name = body?.match(/animation:\s*(vv-icon-[\w-]+)/)?.[1];
      const keyframes = name ? css.match(new RegExp(`@keyframes ${name} \\{((?:[^{}]*\\{[^{}]*\\})*)`))?.[1] : undefined;
      if (!selectors || !keyframes?.includes("transform:")) continue;
      for (const sel of selectors.split(",")) {
        const last = sel.trim().match(/\.(vv-icon-[\w-]+)$/)?.[1];
        if (last) transforming.add(last);
      }
    }
    expect(transforming).toContain("vv-icon-gear-turn");
    // ReviewIcon's marks keep the svg's box on purpose (see review-icon.tsx).
    const icons = [
      ...ICONS.filter(([name]) => name !== "ReviewIcon").map(([name, Icon]) => <Icon key={name} active />),
      <SettingsIcon key="turn" variant="turn" />,
    ];
    for (const node of icons) {
      const svg = await render(node);
      for (const el of svg.querySelectorAll("*")) {
        const classes = [...el.classList];
        if (classes.some((c) => transforming.has(c))) expect(classes.some((c) => fillBox.has(c)), classes.join(" ")).toBe(true);
      }
    }
  });
});

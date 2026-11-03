// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import * as client from "../client";
import * as root from "../index";
import * as logos from "./index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let reactRoot: Root | null = null;
let host: HTMLElement | null = null;

async function render(node: ReactNode): Promise<HTMLElement> {
  host = document.createElement("div");
  document.body.appendChild(host);
  reactRoot = createRoot(host);
  await act(async () => reactRoot?.render(node));
  return host;
}

afterEach(async () => {
  await act(async () => reactRoot?.unmount());
  host?.remove();
  reactRoot = null;
  host = null;
});

const NAMES = [
  "ChromeIcon", "ClaudeIcon", "ConvexIcon", "CursorIcon", "DropboxIcon", "FigmaIcon", "GitHubIcon", "GmailIcon",
  "GoogleDriveIcon", "LinearIcon", "NotionIcon", "OneDriveIcon", "SharePointIcon", "SlackIcon", "VercelIcon",
] as const;

type Logo = (props: logos.LogoProps) => ReactNode;
const LOGOS = logos as unknown as Record<(typeof NAMES)[number], Logo>;

describe("third-party logos", () => {
  it("exports exactly these logos from ./logos, the root and /client", () => {
    expect(Object.keys(logos).sort()).toEqual([...NAMES].sort());
    for (const name of NAMES) {
      expect((root as Record<string, unknown>)[name], name).toBe(LOGOS[name]);
      expect((client as Record<string, unknown>)[name], name).toBe(LOGOS[name]);
    }
  });

  it.each(NAMES)("%s renders a decorative 24px svg by default", async (name) => {
    const Icon = LOGOS[name];
    const el = await render(<Icon className="x" />);
    const svg = el.querySelector("svg")!;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("width")).toBe("24");
    expect(svg.getAttribute("height")).toBe("24");
    expect(svg.getAttribute("viewBox")).toBeTruthy();
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.getAttribute("class")).toBe("x");
    expect(svg.querySelector("path, rect, polygon")).not.toBeNull();
  });

  it("title makes a labelled img and size sets width and height", async () => {
    const el = await render(<logos.SlackIcon size={16} title="Slack" data-testid="s" />);
    const svg = el.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Slack");
    expect(svg.getAttribute("aria-hidden")).toBeNull();
    expect(svg.querySelector("title")?.textContent).toBe("Slack");
    expect(svg.getAttribute("width")).toBe("16");
    expect(svg.getAttribute("data-testid")).toBe("s");
  });

  it("aria-label without title also makes a labelled img", async () => {
    const el = await render(<logos.GitHubIcon aria-label="GitHub" />);
    const svg = el.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-hidden")).toBeNull();
  });

  it.each(["OneDriveIcon", "SharePointIcon"] as const)("%s gives each instance its own gradient ids", async (name) => {
    const Icon = LOGOS[name];
    const el = await render(<><Icon /><Icon /></>);
    const ids = [...el.querySelectorAll("[id]")].map((n) => n.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const svg of el.querySelectorAll("svg")) {
      const own = new Set([...svg.querySelectorAll("[id]")].map((n) => n.id));
      const refs = svg.outerHTML.match(/url\(#([^)]+)\)/g) ?? [];
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) expect(own.has(ref.slice(5, -1)), ref).toBe(true);
    }
  });
});

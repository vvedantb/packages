// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../../src/ui/tooltip";
import { AppShell } from "./AppShell";
import { AppSidebar } from "./AppSidebar";
import { RailDivider, RailTile, SidebarRail } from "./SidebarRail";
import { SidebarPanel } from "./SidebarPanel";
import { SidebarAccountMenu } from "./SidebarAccountMenu";
import { railTileClass, railTileStateClass } from "./app-shell-classes";
import { cn } from "../../src/utils/cn";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
let host: HTMLElement | null = null;

async function mount(node: React.ReactNode) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const r = createRoot(el);
  host = el;
  root = r;
  await act(async () => {
    r.render(<TooltipProvider>{node}</TooltipProvider>);
  });
}

async function rerender(node: React.ReactNode) {
  await act(async () => {
    root?.render(<TooltipProvider>{node}</TooltipProvider>);
  });
}

function q(selector: string, scope: ParentNode | null = host): HTMLElement {
  const el = scope?.querySelector(selector);
  if (!(el instanceof HTMLElement)) throw new Error(`missing ${selector}`);
  return el;
}

function first(scope: Element | null = host): HTMLElement {
  const el = scope?.firstElementChild;
  if (!(el instanceof HTMLElement)) throw new Error("missing first child");
  return el;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  document.body.innerHTML = "";
  root = null;
  host = null;
});

const MAIN_TRANSITION =
  "md:transition-[margin-left] md:[transition-duration:280ms] md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]";

describe("AppShell", () => {
  it("sets the default width variables and renders the reference markup", async () => {
    await mount(<AppShell sidebar={<nav data-testid="sb" />}>Page</AppShell>);
    const shell = first();
    expect(shell.className).toBe("relative h-dvh overflow-hidden bg-background");
    expect(shell.style.getPropertyValue("--app-shell-rail-width")).toBe("4rem");
    expect(shell.style.getPropertyValue("--app-shell-sidebar-width")).toBe("20rem");
    expect(shell.style.getPropertyValue("--app-shell-mobile-header-height")).toBe(
      "calc(3.5rem + env(safe-area-inset-top, 0px))",
    );

    const skip = q("a", shell);
    expect(skip.getAttribute("href")).toBe("#main-content");
    expect(skip.textContent).toBe("Skip to main content");
    expect(skip.nextElementSibling?.getAttribute("data-testid")).toBe("sb");

    const main = q("main", shell);
    expect(main.id).toBe("main-content");
    expect(main.tabIndex).toBe(-1);
    expect(main.className).toBe(
      `relative z-10 flex h-full min-h-0 outline-none md:p-2 md:ml-[var(--app-shell-sidebar-width)] ${MAIN_TRANSITION}`,
    );
    expect(first(main).className).toBe(
      "flex min-h-0 flex-1 flex-col overflow-hidden bg-surface pt-[var(--app-shell-mobile-header-height)] md:rounded-lg md:pt-0",
    );
    expect(main.textContent).toBe("Page");
  });

  it("switches the main margin with panelHidden and takes custom widths", async () => {
    await mount(<AppShell panelHidden railWidth="3.5rem" sidebarWidth="18rem" mainId="content" />);
    const shell = first();
    expect(shell.style.getPropertyValue("--app-shell-rail-width")).toBe("3.5rem");
    expect(shell.style.getPropertyValue("--app-shell-sidebar-width")).toBe("18rem");
    const main = q("main", shell);
    expect(main.className).toContain("md:ml-[var(--app-shell-rail-width)]");
    expect(main.className).not.toContain("md:ml-[var(--app-shell-sidebar-width)]");
    expect(q("a", shell).getAttribute("href")).toBe("#content");
  });
});

describe("SidebarRail", () => {
  it("wraps top, body and footer slots and merges className overrides", async () => {
    await mount(
      <SidebarRail
        showDivider
        className="w-14"
        top={<span>top</span>}
        bodyClassName="scrollbar-thin"
        footer={<span>foot</span>}
        footerClassName="border-t border-separator"
      >
        <span>body</span>
      </SidebarRail>,
    );
    const rail = first();
    expect(rail.className).toBe(
      "flex h-full shrink-0 flex-col items-center bg-background border-r border-separator w-14",
    );
    const [top, body, footer] = Array.from(rail.children);
    expect(top?.className).toBe("flex w-full flex-col items-center gap-1.5 px-0 pt-3");
    expect(body?.className).toBe(
      "flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto py-2 scrollbar-thin",
    );
    expect(footer?.className).toBe(
      "flex w-full flex-col items-center gap-1.5 py-3 border-t border-separator",
    );
    expect(body?.textContent).toBe("body");
  });

  it("uses the rail width variable by default and renders the body as its child with bodyAsChild", async () => {
    await mount(
      <SidebarRail bodyAsChild>
        <ul data-testid="list" />
      </SidebarRail>,
    );
    const rail = first();
    expect(rail.className).toBe(
      "flex h-full w-[var(--app-shell-rail-width)] shrink-0 flex-col items-center bg-background",
    );
    expect(rail.children).toHaveLength(1);
    const list = first(rail);
    expect(list.tagName).toBe("UL");
    expect(list.className).toBe("flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto py-2");
  });
});

describe("RailTile", () => {
  it("renders its child with tile classes, aria-current and the badge inside", async () => {
    await mount(
      <RailTile asChild label="Inbox" active badge={<span data-testid="badge">3</span>}>
        <a href="/inbox">
          <svg data-testid="icon" />
        </a>
      </RailTile>,
    );
    const link = q("a");
    expect(link.getAttribute("aria-label")).toBe("Inbox");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.className).toBe(cn(railTileClass, "group", railTileStateClass(true)));
    expect(Array.from(link.children).map((c) => c.getAttribute("data-testid"))).toEqual(["icon", "badge"]);
  });

  it("renders a ghost button tile without aria-current when inactive", async () => {
    const onClick = vi.fn();
    await mount(
      <RailTile label="Search" onClick={onClick}>
        <svg />
      </RailTile>,
    );
    const button = q("button");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Search");
    expect(button.hasAttribute("aria-current")).toBe(false);
    expect(button.className).toContain("group h-11 w-11 p-0");
    expect(button.className).toContain(railTileStateClass(false));
    await act(async () => button.click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the divider", async () => {
    await mount(<RailDivider />);
    const divider = first();
    expect(divider.className).toBe("h-px w-8 bg-separator");
    expect(divider.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("AppSidebar", () => {
  it("is an inert drawer when closed on mobile and closes on Escape", async () => {
    const onMobileOpenChange = vi.fn();
    await mount(
      <AppSidebar
        id="drawer"
        rail={<div data-testid="rail" />}
        panel={<div data-testid="panel" />}
        isDesktop={false}
        mobileOpen={false}
        onMobileOpenChange={onMobileOpenChange}
        asideProps={{ "data-vt": "sidebar" }}
        mobileTitle="Title"
      />,
    );
    const aside = q("aside");
    expect(aside.id).toBe("drawer");
    expect(aside.getAttribute("data-sidebar-layout")).toBe("drawer");
    expect(aside.getAttribute("data-vt")).toBe("sidebar");
    expect(aside.hasAttribute("inert")).toBe(true);
    expect(aside.className).toContain("w-[min(var(--app-shell-sidebar-width),calc(100vw-1.5rem))]");
    expect(aside.className).toContain("md:w-[var(--app-shell-sidebar-width)]");
    expect(q("h1").textContent).toBe("Title");

    const menu = q("header button");
    expect(menu.getAttribute("aria-label")).toBe("Open navigation menu");
    expect(menu.getAttribute("aria-controls")).toBe("drawer");
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    await act(async () => menu.click());
    expect(onMobileOpenChange).toHaveBeenLastCalledWith(true);

    await rerender(
      <AppSidebar
        id="drawer"
        rail={<div />}
        isDesktop={false}
        mobileOpen
        onMobileOpenChange={onMobileOpenChange}
      />,
    );
    expect(q("aside").hasAttribute("inert")).toBe(false);
    expect(host?.querySelector('button[aria-label="Close navigation"]')).not.toBeNull();
    await act(async () => {
      q("aside").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onMobileOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("closes the drawer at the desktop breakpoint and hides the panel with panelHidden", async () => {
    const onMobileOpenChange = vi.fn();
    const props = { rail: <div />, panel: <div data-testid="panel" />, onMobileOpenChange, mobileOpen: true };
    await mount(<AppSidebar {...props} isDesktop={false} />);
    expect(onMobileOpenChange).not.toHaveBeenCalled();
    await rerender(<AppSidebar {...props} isDesktop panelHidden />);
    expect(onMobileOpenChange).toHaveBeenCalledWith(false);
    const aside = q("aside");
    expect(aside.getAttribute("data-sidebar-layout")).toBe("desktop");
    expect(aside.className).toContain("md:w-[var(--app-shell-rail-width)]");
    expect(host?.querySelector('[data-testid="panel"]')).toBeNull();
  });
});

describe("SidebarPanel", () => {
  it("renders the header with trailing content and the close button", async () => {
    const onClose = vi.fn();
    await mount(
      <SidebarPanel title="Library" headerTrailing={<span data-testid="extra" />} onClose={onClose} collapsed>
        <div data-testid="body" />
      </SidebarPanel>,
    );
    const panel = first();
    expect(panel.className).toBe(
      "relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background md:hidden",
    );
    expect(q("h2", panel).textContent).toBe("Library");
    const close = q('button[aria-label="Close navigation"]', panel);
    expect(close.previousElementSibling?.getAttribute("data-testid")).toBe("extra");
    await act(async () => close.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(panel.lastElementChild?.getAttribute("data-testid")).toBe("body");
  });

  it("omits the trailing slot without headerTrailing or onClose", async () => {
    await mount(<SidebarPanel title="Library" />);
    expect(host?.querySelector("button")).toBeNull();
    expect(host?.querySelector(".justify-end")).toBeNull();
  });
});

describe("SidebarAccountMenu", () => {
  it("labels the trigger with the name and renders the avatar image", async () => {
    await mount(<SidebarAccountMenu name="Test User" imageUrl="https://example.test/a.png" />);
    const trigger = q("button");
    expect(trigger.getAttribute("aria-label")).toBe("Account menu for Test User");
    expect(trigger.getAttribute("title")).toBe("Test User");
    expect(q("img", trigger).className).toBe(
      "h-7 w-7 rounded-full object-cover outline outline-1 -outline-offset-1 outline-separator",
    );
  });

  it("falls back to initials without an image", async () => {
    await mount(<SidebarAccountMenu name="test user extra" />);
    const avatar = q("button span");
    expect(avatar.textContent).toBe("TU");
    expect(avatar.className).toContain("h-7 w-7");
  });
});

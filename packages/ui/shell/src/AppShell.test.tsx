// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../../src/ui/tooltip";
import { Tabs, TabsContent } from "../../src/ui/tabs";
import { AppShell } from "./AppShell";
import { AppSidebar } from "./AppSidebar";
import { RailDivider, RailTile, SidebarRail } from "./SidebarRail";
import { SidebarPanel } from "./SidebarPanel";
import { SidebarAccountMenu } from "./SidebarAccountMenu";
import { useAppShellResize, type SidebarResizeOptions } from "./SidebarResize";
import { railTileClass, railTileStateClass } from "./app-shell-classes";
import { cn } from "../../src/utils/cn";
import { Button } from "../../src/ui/button";

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
  localStorage.clear();
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

  it("spreads extra HTML attributes onto the root div", async () => {
    await mount(
      <SidebarRail id="rail" data-vt="rail" aria-label="Primary">
        <span>body</span>
      </SidebarRail>,
    );
    const rail = first();
    expect(rail.id).toBe("rail");
    expect(rail.getAttribute("data-vt")).toBe("rail");
    expect(rail.getAttribute("aria-label")).toBe("Primary");
    expect(rail.className).toBe(
      "flex h-full w-[var(--app-shell-rail-width)] shrink-0 flex-col items-center bg-background",
    );
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

  it("renders a native button tile without aria-current when inactive", async () => {
    const onClick = vi.fn();
    await mount(
      <RailTile label="Search" onClick={onClick}>
        <svg width="22" />
      </RailTile>,
    );
    const button = q("button");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Search");
    expect(button.hasAttribute("aria-current")).toBe(false);
    expect(button.className).toBe(cn(railTileClass, "group", railTileStateClass(false)));
    expect(button.className).toContain("size-11");
    expect(button.className).not.toContain("[&_svg:not([class*='size-'])]:size-4");
    expect(button.querySelector("svg")?.getAttribute("width")).toBe("22");
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

describe("AppSidebar mobileHeaderActions", () => {
  const base = { rail: <div />, isDesktop: false, mobileOpen: false, onMobileOpenChange: () => {} };
  const SPACER = "h-11 w-11 shrink-0 justify-self-end";

  it("keeps the end spacer by default", async () => {
    await mount(<AppSidebar {...base} mobileTitle="Title" />);
    const header = q("header");
    const spacer = header.lastElementChild;
    expect(spacer?.className).toBe(SPACER);
    expect(spacer?.getAttribute("aria-hidden")).toBe("true");
    expect(spacer?.children).toHaveLength(0);
    expect(header.querySelector("[data-app-sidebar-mobile-actions]")).toBeNull();
    expect(header.classList.contains("bg-surface")).toBe(true);
    expect(header.className).not.toContain("bg-background/80");
    expect(header.className).not.toContain("backdrop-blur-md");
  });

  it("renders the actions at the end of the header in place of the spacer", async () => {
    await mount(
      <AppSidebar
        {...base}
        mobileTitle="Title"
        mobileHeaderActions={
          <>
            <button type="button" data-testid="a" />
            <button type="button" data-testid="b" />
          </>
        }
      />,
    );
    const header = q("header");
    const actions = q("[data-app-sidebar-mobile-actions]", header);
    expect(header.lastElementChild).toBe(actions);
    expect(actions.className).toBe("flex shrink-0 items-center justify-self-end gap-2");
    expect(actions.hasAttribute("aria-hidden")).toBe(false);
    expect(Array.from(actions.children).map((c) => c.getAttribute("data-testid"))).toEqual(["a", "b"]);
    expect(header.querySelector(`[class="${SPACER}"]`)).toBeNull();
    expect(q("h1", header).textContent).toBe("Title");
  });

  it("lays the header out as three columns so the title truncates beside the actions", async () => {
    await mount(
      <AppSidebar
        {...base}
        mobileTitle="A long title that must not overlap the actions"
        mobileHeaderActions={
          <>
            <button type="button" data-testid="a" />
            <button type="button" data-testid="b" />
          </>
        }
      />,
    );
    const header = q("header");
    for (const cls of [
      "grid",
      "grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)]",
      "items-center",
      "md:hidden",
    ]) {
      expect(header.classList.contains(cls)).toBe(true);
    }
    expect(header.classList.contains("flex")).toBe(false);
    expect(header.children).toHaveLength(3);
    const title = q("h1", header);
    expect(header.children[1]).toBe(title);
    expect(title.classList.contains("truncate")).toBe(true);
    expect(title.classList.contains("min-w-0")).toBe(true);
    expect(title.classList.contains("absolute")).toBe(false);
    expect(title.classList.contains("text-balance")).toBe(false);
    expect(q("header > button").classList.contains("justify-self-start")).toBe(true);
  });

  it("keeps three columns without a title", async () => {
    await mount(<AppSidebar {...base} />);
    const header = q("header");
    expect(header.children).toHaveLength(3);
    expect(header.querySelector("h1")).toBeNull();
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

  async function openMenu() {
    const trigger = q("button");
    await act(async () => {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    return q('[role="menu"]', document.body);
  }

  const NAME_LINE = "block truncate text-sm font-medium text-foreground";

  it("uses a one-line label without email by default", async () => {
    await mount(<SidebarAccountMenu name="Test User" />);
    const menu = await openMenu();
    const label = q("span.truncate", menu);
    expect(label.className).toBe("truncate text-sm font-medium text-foreground");
    expect(label.textContent).toBe("Test User");
    expect(menu.querySelector("span.min-w-0")).toBeNull();
  });

  it("uses the two-line label with email", async () => {
    await mount(<SidebarAccountMenu name="Test User" email="user@example.test" />);
    const menu = await openMenu();
    const stack = q("span.min-w-0", menu);
    expect(stack.children).toHaveLength(2);
    expect(stack.children[0]?.className).toBe(NAME_LINE);
    expect(stack.children[1]?.textContent).toBe("user@example.test");
  });

  it("uses the two-line layout without email when stackedLabel is set", async () => {
    await mount(<SidebarAccountMenu name="Test User" stackedLabel />);
    const menu = await openMenu();
    const stack = q("span.min-w-0", menu);
    expect(stack.children).toHaveLength(1);
    expect(stack.children[0]?.className).toBe(NAME_LINE);
    expect(stack.textContent).toBe("Test User");
  });
});

describe("SidebarAccountMenu opt-in props", () => {
  const TRIGGER = cn(railTileClass, "h-11 w-11 p-0", railTileStateClass(false));

  /** The 0.5.1 trigger classes: a ghost `Button` with the tile classes. */
  async function referenceTriggerClass(extra?: string) {
    await mount(<Button variant="ghost" className={cn(TRIGGER, extra)} />);
    const className = q("button").className;
    await act(async () => root?.unmount());
    host?.remove();
    return className;
  }
  const BADGE =
    "pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-danger transition-opacity duration-150 ease-out";

  async function openMenu() {
    await act(async () => {
      q("button").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    return q('[role="menu"]', document.body);
  }

  it("renders the 0.5.1 trigger and content without the new props", async () => {
    const reference = await referenceTriggerClass();
    await mount(<SidebarAccountMenu name="Test User" />);
    const trigger = q("button");
    expect(trigger.className).toBe(reference);
    expect(trigger.children).toHaveLength(1);
    expect(trigger.parentElement).toBe(host);
    expect(host?.children).toHaveLength(1);
    expect(host?.querySelector("[data-account-badge]")).toBeNull();
    const menu = await openMenu();
    expect(menu.className).toContain("w-56");
    expect(menu.className).not.toContain("max-sm:max-h-[min(70dvh,var(--vv-height,70dvh))]");
    expect(menu.hasAttribute("aria-label")).toBe(false);
  });

  /** The dot is the last child of a `relative` wrapper, after the trigger, not inside it. */
  function badgeDot() {
    const trigger = q("button");
    const wrapper = trigger.parentElement;
    expect(wrapper?.parentElement).toBe(host);
    expect(wrapper?.tagName).toBe("DIV");
    expect(wrapper?.className).toBe("relative");
    const dot = q("[data-account-badge]");
    expect(trigger.contains(dot)).toBe(false);
    expect(wrapper?.lastElementChild).toBe(dot);
    expect(trigger.children).toHaveLength(1);
    expect(dot.getAttribute("aria-hidden")).toBe("true");
    return dot;
  }

  it("shows the badge dot beside the trigger when badge is true", async () => {
    const reference = await referenceTriggerClass();
    await mount(<SidebarAccountMenu name="Test User" badge />);
    expect(q("button").className).toBe(reference);
    expect(badgeDot().className).toBe(`${BADGE} opacity-100`);
  });

  it("keeps the badge dot mounted at zero opacity when badge is false", async () => {
    await mount(<SidebarAccountMenu name="Test User" badge={false} />);
    expect(badgeDot().className).toBe(`${BADGE} opacity-0`);
  });

  it("spreads triggerProps over the defaults and merges className", async () => {
    const reference = await referenceTriggerClass("mt-1");
    await mount(
      <SidebarAccountMenu
        name="Test User"
        triggerProps={{ "aria-label": "Account", title: "You", className: "mt-1", id: "account" }}
      />,
    );
    const trigger = q("button");
    expect(trigger.getAttribute("aria-label")).toBe("Account");
    expect(trigger.getAttribute("title")).toBe("You");
    expect(trigger.id).toBe("account");
    expect(trigger.className).toBe(reference);
    expect(trigger.className.endsWith(" mt-1")).toBe(true);
  });

  it("spreads contentProps onto the menu content", async () => {
    await mount(
      <SidebarAccountMenu
        name="Test User"
        contentClassName="p-2"
        contentProps={{ "aria-label": "Account actions", fitViewport: true }}
      />,
    );
    const menu = await openMenu();
    expect(menu.getAttribute("aria-label")).toBe("Account actions");
    expect(menu.className).toContain("w-56");
    expect(menu.className).toContain("p-2");
    expect(menu.className).toContain("max-sm:max-h-[min(70dvh,var(--vv-height,70dvh))]");
  });
});

describe("opt-in defaults", () => {
  it("renders no resize handle and no tab roles without resizable or tabs", async () => {
    await mount(
      <AppShell
        sidebar={
          <AppSidebar
            isDesktop
            mobileOpen={false}
            onMobileOpenChange={() => {}}
            rail={
              <SidebarRail>
                <RailTile label="Home">
                  <svg />
                </RailTile>
              </SidebarRail>
            }
            panel={<SidebarPanel title="Library" />}
          />
        }
      />,
    );
    expect(host?.querySelector('[role="separator"]')).toBeNull();
    expect(host?.querySelector('[role="tablist"], [role="tab"]')).toBeNull();
    expect(first().style.getPropertyValue("--app-shell-sidebar-width")).toBe("20rem");
    expect(q("main").className).toContain(MAIN_TRANSITION);
    expect(q("aside").className).toContain(
      "md:transition-[width] md:[transition-duration:280ms] md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
    );
    expect(q("aside").lastElementChild?.tagName).toBe("DIV");
    expect(q('button[aria-label="Home"]').querySelector(".sr-only")).toBeNull();
  });
});

describe("AppShell resizable", () => {
  const resizable: SidebarResizeOptions = {
    storageKey: "test-sidebar-width",
    defaultWidth: 256,
    minWidth: 200,
    maxWidth: 400,
  };

  function WidthProbe() {
    const resize = useAppShellResize();
    return <output data-testid="probe">{resize ? String(resize.width) : "none"}</output>;
  }

  function shell(props: { collapsed?: boolean; isDesktop?: boolean } = {}) {
    return (
      <AppShell
        resizable={resizable}
        sidebar={
          <AppSidebar
            isDesktop={props.isDesktop ?? true}
            collapsed={props.collapsed}
            mobileOpen={false}
            onMobileOpenChange={() => {}}
            rail={<SidebarRail />}
            panel={<SidebarPanel title="Library" />}
          />
        }
      >
        <WidthProbe />
      </AppShell>
    );
  }

  const handle = () => q('[role="separator"]');
  const sidebarWidth = () => first().style.getPropertyValue("--app-shell-sidebar-width");

  it("renders the handle on the aside edge and sets the width variable", async () => {
    await mount(shell());
    const separator = handle();
    expect(q("aside").lastElementChild).toBe(separator);
    expect(separator.getAttribute("aria-orientation")).toBe("vertical");
    expect(separator.getAttribute("aria-label")).toBe("Resize sidebar");
    expect(separator.getAttribute("aria-valuemin")).toBe("200");
    expect(separator.getAttribute("aria-valuemax")).toBe("400");
    expect(separator.getAttribute("aria-valuenow")).toBe("256");
    expect(separator.tabIndex).toBe(0);
    expect(sidebarWidth()).toBe("calc(4rem + 256px)");
    expect(q('[data-testid="probe"]').textContent).toBe("256");
  });

  it("steps 16px with ArrowRight, persists it and resets on double-click", async () => {
    await mount(shell());
    await act(async () => {
      handle().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(handle().getAttribute("aria-valuenow")).toBe("272");
    expect(sidebarWidth()).toBe("calc(4rem + 272px)");
    expect(localStorage.getItem("test-sidebar-width")).toBe("272");

    await act(async () => {
      handle().dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });
    expect(handle().getAttribute("aria-valuenow")).toBe("256");
    expect(localStorage.getItem("test-sidebar-width")).toBe("256");
  });

  it("clamps keyboard steps to the bounds", async () => {
    localStorage.setItem("test-sidebar-width", "392");
    await mount(shell());
    await act(async () => {
      handle().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(handle().getAttribute("aria-valuenow")).toBe("400");
  });

  it("restores the stored width on remount and ignores invalid values", async () => {
    localStorage.setItem("test-sidebar-width", "320");
    await mount(shell());
    expect(handle().getAttribute("aria-valuenow")).toBe("320");
    expect(sidebarWidth()).toBe("calc(4rem + 320px)");

    await act(async () => root?.unmount());
    localStorage.setItem("test-sidebar-width", '"wide"');
    await mount(shell());
    expect(handle().getAttribute("aria-valuenow")).toBe("256");
  });

  it("hides the handle when collapsed and in the mobile drawer", async () => {
    await mount(shell({ collapsed: true }));
    expect(host?.querySelector('[role="separator"]')).toBeNull();
    await rerender(shell({ isDesktop: false }));
    expect(host?.querySelector('[role="separator"]')).toBeNull();
  });

  it("returns null from useAppShellResize outside a resizable shell", async () => {
    await mount(<AppShell><WidthProbe /></AppShell>);
    expect(q('[data-testid="probe"]').textContent).toBe("none");
  });
});

describe("SidebarRail tabs", () => {
  async function mountTabs() {
    await mount(
      <Tabs defaultValue="files" orientation="vertical">
        <SidebarRail tabs>
          <RailTile tabValue="files" label="Files" active>
            <svg />
          </RailTile>
          <RailTile tabValue="search" label="Search" badge={<span data-testid="badge">2</span>}>
            <svg />
          </RailTile>
        </SidebarRail>
        <TabsContent value="files">Files panel</TabsContent>
        <TabsContent value="search">Search panel</TabsContent>
      </Tabs>,
    );
  }

  const tabs = () => Array.from(host?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []);
  const visiblePanel = () => q('[role="tabpanel"][data-state="active"]').textContent;

  it("renders a vertical tablist of triggers with the tile classes and sr-only labels", async () => {
    await mountTabs();
    const list = q('[role="tablist"]');
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    expect(list.className).toBe("flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto py-2");
    const [files, search] = tabs();
    expect(files?.className).toBe(cn(railTileClass, "group relative", railTileStateClass(true)));
    expect(search?.className).toBe(cn(railTileClass, "group relative", railTileStateClass(false)));
    expect(files?.hasAttribute("aria-label")).toBe(false);
    expect(files?.querySelector(".sr-only")?.textContent).toBe("Files");
    expect(files?.getAttribute("aria-selected")).toBe("true");
    expect(search?.lastElementChild?.getAttribute("data-testid")).toBe("badge");
    expect(visiblePanel()).toBe("Files panel");
  });

  it("switches the visible panel on press and moves focus with ArrowDown", async () => {
    await mountTabs();
    const [files, search] = tabs();
    await act(async () => {
      search?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    });
    expect(search?.getAttribute("aria-selected")).toBe("true");
    expect(visiblePanel()).toBe("Search panel");

    await act(async () => files?.focus());
    await act(async () => {
      files?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      // Radix roving focus moves focus on the next tick.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.activeElement).toBe(search);
  });
});

// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { IconHome, IconSearch } from "@tabler/icons-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../src/ui/dropdown-menu";
import { TooltipProvider } from "../../src/ui/tooltip";
import { cn } from "../../src/utils/cn";
import { AppShell } from "./AppShell";
import {
  sidebarNavIconClass,
  sidebarNavItemActionsClass,
  sidebarNavItemClass,
  sidebarNavItemLabelClass,
  sidebarNavItemLeadingClass,
  sidebarNavItemTrailingClass,
} from "./app-shell-classes";
import { AppSidebar } from "./AppSidebar";
import { Sidebar } from "./Sidebar";
import { SidebarAccountMenu } from "./SidebarAccountMenu";
import { SidebarPanel } from "./SidebarPanel";
import { RailDivider, RailTile, SidebarRail } from "./SidebarRail";
import type { SidebarResizeOptions } from "./SidebarResize";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
let host: HTMLElement | null = null;

async function mount(node: ReactNode) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const r = createRoot(el);
  host = el;
  root = r;
  await act(async () => {
    r.render(<TooltipProvider>{node}</TooltipProvider>);
  });
}

async function cleanup() {
  await act(async () => root?.unmount());
  host?.remove();
  document.body.innerHTML = "";
  localStorage.clear();
  root = null;
  host = null;
}

afterEach(cleanup);

/** Markup with React/Radix ids numbered by first appearance. */
function markup(): string {
  const ids = new Map<string, string>();
  return (host?.innerHTML ?? "").replace(/«r[0-9a-z]+»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g, (id) => {
    const known = ids.get(id);
    if (known) return known;
    const next = `«id${ids.size}»`;
    ids.set(id, next);
    return next;
  });
}

const noop = () => {};
const resizable: SidebarResizeOptions = {
  storageKey: "sidebar-test-width",
  defaultWidth: 256,
  minWidth: 200,
  maxWidth: 400,
};

type ShellInput = {
  isDesktop: boolean;
  mobileOpen: boolean;
  collapsed?: boolean;
  panelHidden?: boolean;
  resizable?: SidebarResizeOptions;
};

function legacyShell({ isDesktop, mobileOpen, collapsed = false, panelHidden = false, resizable }: ShellInput) {
  return (
    <AppShell
      panelHidden={panelHidden}
      resizable={resizable}
      sidebar={
        <AppSidebar
          id="drawer"
          isDesktop={isDesktop}
          mobileOpen={mobileOpen}
          onMobileOpenChange={noop}
          collapsed={collapsed}
          panelHidden={panelHidden}
          mobileTitle="Home"
          rail={
            <SidebarRail
              showDivider
              top={<RailTile label="Home"><IconHome size={20} /></RailTile>}
              footer={
                <>
                  <RailDivider />
                  <SidebarAccountMenu name="Test User" email="user@example.test" badge>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                  </SidebarAccountMenu>
                </>
              }
            >
              <RailTile label="Search" active>
                <IconSearch size={20} />
              </RailTile>
            </SidebarRail>
          }
          panel={
            <SidebarPanel title="Library" collapsed={collapsed} onClose={noop}>
              <nav>panel body</nav>
            </SidebarPanel>
          }
        />
      }
    >
      <p>Page</p>
    </AppShell>
  );
}

function composedShell({ isDesktop, mobileOpen, collapsed = false, panelHidden = false, resizable }: ShellInput) {
  return (
    <AppShell.Root panelHidden={panelHidden} resizable={resizable}>
      <AppShell.SkipLink />
      <Sidebar.Root
        id="drawer"
        isDesktop={isDesktop}
        mobileOpen={mobileOpen}
        onMobileOpenChange={noop}
        collapsed={collapsed}
        panelHidden={panelHidden}
      >
        <Sidebar.MobileHeader>
          <Sidebar.MobileMenuButton />
          <Sidebar.MobileTitle>Home</Sidebar.MobileTitle>
          <Sidebar.MobileActions />
        </Sidebar.MobileHeader>
        <Sidebar.Backdrop />
        <Sidebar.Aside>
          <Sidebar.Rail showDivider>
            <Sidebar.RailHeader>
              <Sidebar.RailItem label="Home">
                <IconHome size={20} />
              </Sidebar.RailItem>
            </Sidebar.RailHeader>
            <Sidebar.RailBody>
              <Sidebar.RailItem label="Search" active>
                <IconSearch size={20} />
              </Sidebar.RailItem>
            </Sidebar.RailBody>
            <Sidebar.RailFooter>
              <Sidebar.RailSeparator />
              <Sidebar.AccountMenu badge>
                <Sidebar.AccountTrigger userName="Test User" />
                <Sidebar.AccountContent>
                  <Sidebar.AccountLabel userName="Test User" email="user@example.test" />
                  <Sidebar.AccountSeparator />
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                </Sidebar.AccountContent>
              </Sidebar.AccountMenu>
            </Sidebar.RailFooter>
          </Sidebar.Rail>
          <Sidebar.Panel>
            <Sidebar.PanelHeader>
              <Sidebar.PanelTitle>Library</Sidebar.PanelTitle>
              <Sidebar.PanelActions>
                <Sidebar.PanelClose />
              </Sidebar.PanelActions>
            </Sidebar.PanelHeader>
            <nav>panel body</nav>
          </Sidebar.Panel>
          <Sidebar.ResizeHandle />
        </Sidebar.Aside>
      </Sidebar.Root>
      <AppShell.Main>
        <AppShell.Content>
          <p>Page</p>
        </AppShell.Content>
      </AppShell.Main>
    </AppShell.Root>
  );
}

const inputs: Record<string, ShellInput> = {
  desktop: { isDesktop: true, mobileOpen: false },
  "mobile open": { isDesktop: false, mobileOpen: true },
  "mobile closed": { isDesktop: false, mobileOpen: false },
  collapsed: { isDesktop: true, mobileOpen: false, collapsed: true },
  panelHidden: { isDesktop: true, mobileOpen: false, panelHidden: true },
  resizable: { isDesktop: true, mobileOpen: false, resizable },
  "resizable collapsed": { isDesktop: true, mobileOpen: false, collapsed: true, resizable },
};

describe("composed shell", () => {
  for (const [label, input] of Object.entries(inputs)) {
    it(`renders the legacy shell markup (${label})`, async () => {
      await mount(legacyShell(input));
      const legacy = markup();
      await cleanup();
      await mount(composedShell(input));
      expect(markup()).toBe(legacy);
    });
  }
});

describe("Sidebar.Panel", () => {
  function inRoot(props: { collapsed?: boolean; panelHidden?: boolean }, panel: ReactNode) {
    return (
      <Sidebar.Root isDesktop mobileOpen={false} onMobileOpenChange={noop} {...props}>
        {panel}
      </Sidebar.Root>
    );
  }

  it("inherits collapsed from Sidebar.Root", async () => {
    await mount(inRoot({ collapsed: true }, <Sidebar.Panel data-testid="panel" />));
    expect(host?.querySelector('[data-testid="panel"]')?.className).toContain("md:hidden");
  });

  it("renders nothing while Sidebar.Root has panelHidden", async () => {
    await mount(inRoot({ panelHidden: true }, <Sidebar.Panel data-testid="panel" />));
    expect(host?.querySelector('[data-testid="panel"]')).toBeNull();
  });

  it("lets explicit props win over Sidebar.Root", async () => {
    await mount(inRoot({ collapsed: true }, <Sidebar.Panel data-testid="panel" collapsed={false} />));
    expect(host?.querySelector('[data-testid="panel"]')?.className).not.toContain("md:hidden");
  });

  it("legacy SidebarPanel ignores Sidebar.Root state", async () => {
    await mount(inRoot({ collapsed: true, panelHidden: true }, <SidebarPanel title="Library" />));
    const title = host?.querySelector("h2");
    expect(title?.textContent).toBe("Library");
    expect(title?.closest(".flex-1.flex-col")?.className).not.toContain("md:hidden");
  });

  it("PanelClose closes the drawer by default", async () => {
    const calls: boolean[] = [];
    await mount(
      <Sidebar.Root isDesktop={false} mobileOpen onMobileOpenChange={(open) => calls.push(open)}>
        <Sidebar.PanelClose />
      </Sidebar.Root>,
    );
    const close = host?.querySelector<HTMLButtonElement>('button[aria-label="Close navigation"]');
    await act(async () => close?.click());
    expect(calls).toEqual([false]);
  });
});

describe("Sidebar.ResizeHandle", () => {
  function handle(shell: { resizable?: SidebarResizeOptions }, sidebar: ShellInput | null) {
    const node = <Sidebar.ResizeHandle />;
    return (
      <AppShell.Root resizable={shell.resizable}>
        {sidebar ? (
          <Sidebar.Root
            isDesktop={sidebar.isDesktop}
            mobileOpen={sidebar.mobileOpen}
            onMobileOpenChange={noop}
            collapsed={sidebar.collapsed}
            panelHidden={sidebar.panelHidden}
          >
            {node}
          </Sidebar.Root>
        ) : (
          node
        )}
      </AppShell.Root>
    );
  }

  const cases: [string, { resizable?: SidebarResizeOptions }, ShellInput | null, boolean][] = [
    ["not resizable", {}, { isDesktop: true, mobileOpen: false }, false],
    ["resizable without Sidebar.Root", { resizable }, null, true],
    ["resizable desktop", { resizable }, { isDesktop: true, mobileOpen: false }, true],
    ["resizable mobile", { resizable }, { isDesktop: false, mobileOpen: true }, false],
    ["resizable collapsed", { resizable }, { isDesktop: true, mobileOpen: false, collapsed: true }, false],
    ["resizable panelHidden", { resizable }, { isDesktop: true, mobileOpen: false, panelHidden: true }, false],
  ];
  for (const [label, shell, sidebar, shown] of cases) {
    it(`${shown ? "shows" : "hides"} the handle: ${label}`, async () => {
      await mount(handle(shell, sidebar));
      expect(host?.querySelector('[role="separator"]') !== null).toBe(shown);
    });
  }
});

describe("Sidebar.AccountTrigger", () => {
  it("uses userName for the defaults and passes native name to the button", async () => {
    await mount(
      <Sidebar.AccountMenu>
        <Sidebar.AccountTrigger userName="Test User" name="account-trigger" />
      </Sidebar.AccountMenu>,
    );
    const trigger = host?.querySelector("button");
    expect(trigger?.getAttribute("name")).toBe("account-trigger");
    expect(trigger?.getAttribute("title")).toBe("Test User");
    expect(trigger?.getAttribute("aria-label")).toBe("Account menu for Test User");
    expect(trigger?.textContent).toBe("TU");
  });
});

describe("Sidebar nav rows", () => {
  const dataStates =
    "data-[selected=true]:bg-sidebar-accent data-[selected=true]:text-foreground data-[dragging=true]:cursor-grabbing data-[dragging=true]:opacity-40 data-[drop-target=true]:bg-sidebar-accent data-[drop-target=true]:text-foreground data-[drop-target=true]:ring-2 data-[drop-target=true]:ring-inset data-[drop-target=true]:ring-focus";

  it("builds the whole row from one call", () => {
    expect(sidebarNavItemClass({ active: true })).toBe(
      "group flex w-full items-center rounded-menu-item py-1.5 text-[0.8125rem] leading-[18px] tracking-[0.005em] transition-[scale,background-color,color] duration-150 ease-smooth active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35 gap-2 px-4 bg-sidebar-accent font-medium text-foreground " + dataStates,
    );
    expect(sidebarNavItemClass({ iconOnly: true })).toBe(
      "group flex w-full items-center rounded-menu-item py-1.5 text-[0.8125rem] leading-[18px] tracking-[0.005em] transition-[scale,background-color,color] duration-150 ease-smooth active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35 justify-center px-0 font-normal text-foreground/80 hover:bg-sidebar-accent hover:text-foreground " + dataStates,
    );
  });

  it("wins over app row classes passed before it", () => {
    const merged = cn("rounded-lg text-sm font-medium transition-colors", sidebarNavItemClass({ active: false }));
    expect(merged).not.toMatch(/rounded-lg|text-sm|font-medium|transition-colors/);
    expect(merged).toContain("rounded-menu-item");
  });

  it("Sidebar.NavItem renders a link row with the icon class", async () => {
    await mount(
      <Sidebar.NavItem asChild active icon={<IconHome size={19} />}>
        <a href="/home">
          <span className="truncate">Home</span>
        </a>
      </Sidebar.NavItem>,
    );
    const link = host?.querySelector("a");
    expect(link?.getAttribute("aria-current")).toBe("page");
    expect(link?.getAttribute("type")).toBeNull();
    expect(link?.className).toBe(sidebarNavItemClass({ active: true }));
    expect(link?.firstElementChild?.getAttribute("class")).toContain(sidebarNavIconClass(true));
    expect(link?.textContent).toBe("Home");
  });

  it("Sidebar.NavItem defaults to an idle button", async () => {
    await mount(<Sidebar.NavItem>Search</Sidebar.NavItem>);
    const button = host?.querySelector("button");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.hasAttribute("aria-current")).toBe(false);
    expect(button?.className).toBe(sidebarNavItemClass());
  });

  it("adds selected, dragging and drop-target styles as options", () => {
    const selected = sidebarNavItemClass({ selected: true });
    expect(selected).toContain(" bg-sidebar-accent text-foreground");
    expect(selected).not.toMatch(/(^| )text-foreground\/80|font-medium/);
    expect(sidebarNavItemClass({ active: true, selected: true })).toContain("font-medium");
    expect(sidebarNavItemClass({ dragging: true })).toMatch(/ cursor-grabbing opacity-40$/);
    expect(sidebarNavItemClass({ dropTarget: true })).toMatch(/ bg-sidebar-accent text-foreground ring-2 ring-inset ring-focus$/);
  });

  it("Sidebar.NavItem sets state data attributes only when on", async () => {
    await mount(
      <>
        <Sidebar.NavItem data-testid="on" active selected dragging dropTarget>
          On
        </Sidebar.NavItem>
        <Sidebar.NavItem data-testid="off">Off</Sidebar.NavItem>
      </>,
    );
    const on = host?.querySelector('[data-testid="on"]');
    const off = host?.querySelector('[data-testid="off"]');
    for (const name of ["data-active", "data-selected", "data-dragging", "data-drop-target"]) {
      expect(on?.getAttribute(name), name).toBe("true");
      expect(off?.hasAttribute(name), name).toBe(false);
    }
    expect(on?.className).toBe(sidebarNavItemClass({ active: true }));
  });

  it("Sidebar.NavItem indents 12px per level on top of the 16px padding", async () => {
    await mount(
      <>
        <Sidebar.NavItem data-testid="flat">Flat</Sidebar.NavItem>
        <Sidebar.NavItem data-testid="one" indent={1}>One</Sidebar.NavItem>
        <Sidebar.NavItem data-testid="three" indent={3} style={{ color: "red" }}>Three</Sidebar.NavItem>
        <Sidebar.NavItem data-testid="override" indent={2} style={{ paddingLeft: "4px" }}>Override</Sidebar.NavItem>
        <Sidebar.NavItem data-testid="icon" indent={2} iconOnly>Icon</Sidebar.NavItem>
        <Sidebar.NavItem asChild indent={2}>
          <a data-testid="link" href="/nested" style={{ color: "blue" }}>Nested</a>
        </Sidebar.NavItem>
      </>,
    );
    const style = (id: string) => host?.querySelector<HTMLElement>(`[data-testid="${id}"]`)?.style;
    expect(style("flat")?.paddingLeft).toBe("");
    expect(style("one")?.paddingLeft).toBe("calc(1rem + 12px)");
    expect(style("three")?.paddingLeft).toBe("calc(1rem + 36px)");
    expect(style("three")?.color).toBe("red");
    expect(style("override")?.paddingLeft).toBe("4px");
    expect(style("icon")?.paddingLeft).toBe("");
    expect(style("link")?.paddingLeft).toBe("calc(1rem + 24px)");
    expect(style("link")?.color).toBe("blue");
  });

  it("composes leading, label, trailing and actions parts in a link row", async () => {
    const clicks: string[] = [];
    await mount(
      <Sidebar.NavItem asChild selected indent={1}>
        <a href="/chat" onClick={(event) => { event.preventDefault(); clicks.push("row"); }}>
          <Sidebar.NavItemLeading>
            <input type="checkbox" aria-label="Select" />
          </Sidebar.NavItemLeading>
          <Sidebar.NavItemLabel className="font-medium">Chat title</Sidebar.NavItemLabel>
          <Sidebar.NavItemTrailing>3</Sidebar.NavItemTrailing>
          <Sidebar.NavItemActions>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Chat actions" onClick={(event) => { event.stopPropagation(); event.preventDefault(); clicks.push("actions"); }}>
                  ...
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Rename</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Sidebar.NavItemActions>
        </a>
      </Sidebar.NavItem>,
    );
    const link = host?.querySelector("a");
    expect(link?.getAttribute("data-selected")).toBe("true");
    const [leading, label, trailing, actions] = Array.from(link?.children ?? []);
    expect(leading?.tagName).toBe("SPAN");
    expect(leading?.className).toBe(sidebarNavItemLeadingClass);
    expect(label?.className).toBe(cn(sidebarNavItemLabelClass, "font-medium"));
    expect(label?.textContent).toBe("Chat title");
    expect(trailing?.className).toBe(sidebarNavItemTrailingClass);
    expect(actions?.className).toBe(sidebarNavItemActionsClass);
    expect(actions?.className).toContain("opacity-0 ");
    expect(actions?.className).toContain("group-hover:opacity-100");
    expect(actions?.className).toContain("group-focus-within:opacity-100");
    expect(actions?.className).toContain("has-[[data-state=open]]:opacity-100");
    expect(actions?.querySelector("button")?.getAttribute("data-state")).toBe("closed");
    await act(async () => actions?.querySelector("button")?.click());
    await act(async () => label?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(clicks).toEqual(["actions", "row"]);
  });

  it("parts merge onto their child with asChild", async () => {
    await mount(
      <Sidebar.NavItem asChild>
        <div>
          <Sidebar.NavItemLabel asChild className="font-medium">
            <input aria-label="Rename" defaultValue="Draft" />
          </Sidebar.NavItemLabel>
          <Sidebar.NavItemActions asChild>
            <button type="button" data-state="open" aria-label="More" />
          </Sidebar.NavItemActions>
        </div>
      </Sidebar.NavItem>,
    );
    const input = host?.querySelector("input");
    expect(input?.className).toBe(cn(sidebarNavItemLabelClass, "font-medium"));
    const more = host?.querySelector('button[aria-label="More"]');
    expect(more?.className).toBe(sidebarNavItemActionsClass);
    expect(more?.className).toContain("data-[state=open]:opacity-100");
  });
});

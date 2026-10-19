// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { IconHome, IconSearch } from "@tabler/icons-react";
import { DropdownMenuItem } from "../../src/ui/dropdown-menu";
import { TooltipProvider } from "../../src/ui/tooltip";
import { cn } from "../../src/utils/cn";
import { AppShell } from "./AppShell";
import { sidebarNavIconClass, sidebarNavItemClass } from "./app-shell-classes";
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
  it("builds the whole row from one call", () => {
    expect(sidebarNavItemClass({ active: true })).toBe(
      "group flex w-full items-center rounded-menu-item py-1.5 text-[0.8125rem] leading-[18px] tracking-[0.005em] transition-[scale,background-color,color] duration-150 ease-smooth active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35 gap-2 px-4 bg-surface-tertiary font-medium text-foreground",
    );
    expect(sidebarNavItemClass({ iconOnly: true })).toBe(
      "group flex w-full items-center rounded-menu-item py-1.5 text-[0.8125rem] leading-[18px] tracking-[0.005em] transition-[scale,background-color,color] duration-150 ease-smooth active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35 justify-center px-0 font-normal text-foreground/80 hover:bg-surface-tertiary hover:text-foreground",
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
});

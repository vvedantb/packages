// @vitest-environment happy-dom
// DOM parity for the legacy shell and dialog components. Each case renders in a
// fresh root and serialises `document.body` (so portalled dialogs and menus are
// included) after mapping React/Radix ids to stable placeholders. Expected output
// lives in tokens/test/fixtures/legacy-dom.json; regenerate with
// `UPDATE_LEGACY_DOM=1 pnpm exec vitest run src/legacy-parity.test.tsx`.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { IconHome, IconSearch } from "@tabler/icons-react";
import { AlertDialogTrigger } from "./ui/alert-dialog";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { DialogTrigger } from "./ui/dialog";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import { Tabs, TabsContent } from "./ui/tabs";
import { TooltipProvider } from "./ui/tooltip";
import { AppShell, type AppShellProps } from "../shell/src/AppShell";
import { AppSidebar, type AppSidebarProps } from "../shell/src/AppSidebar";
import { SidebarAccountMenu, SidebarAccountMenuPlaceholder } from "../shell/src/SidebarAccountMenu";
import { SidebarHeader } from "../shell/src/SidebarHeader";
import { SidebarIconTooltip } from "../shell/src/SidebarIconTooltip";
import { SidebarPanel } from "../shell/src/SidebarPanel";
import { RailDivider, RailTile, SidebarRail } from "../shell/src/SidebarRail";
import {
  SidebarResizeHandle,
  useAppShellResize,
  type AppShellResize,
  type SidebarResizeOptions,
} from "../shell/src/SidebarResize";
import { SignOutDialog } from "../shell/src/SignOutDialog";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "../tokens/test/fixtures/legacy-dom.json");
const UPDATE = process.env.UPDATE_LEGACY_DOM === "1";

let root: Root | null = null;
let host: HTMLElement | null = null;

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function mount(node: ReactNode) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const r = createRoot(el);
  host = el;
  root = r;
  await act(async () => {
    r.render(<TooltipProvider>{node}</TooltipProvider>);
  });
  await flush();
}

async function cleanup() {
  await act(async () => root?.unmount());
  host?.remove();
  document.body.innerHTML = "";
  for (const name of document.body.getAttributeNames()) document.body.removeAttribute(name);
  localStorage.clear();
  root = null;
  host = null;
}

afterEach(cleanup);

function q(selector: string, scope: ParentNode = document.body): HTMLElement {
  const el = scope.querySelector(selector);
  if (!(el instanceof HTMLElement)) throw new Error(`missing ${selector}`);
  return el;
}

/** React `useId` values (`«r1»`, `:r1:`, `_r_1_`), also inside Radix `radix-…` ids. */
const REACT_ID = /«r[0-9a-z]+»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g;

/** The focused element as a short selector-like label. */
function describeFocus(): string {
  const el = document.activeElement;
  if (!el || el === document.body) return "body";
  const parts = [el.tagName.toLowerCase()];
  for (const name of ["id", "role", "aria-label"]) {
    const value = el.getAttribute(name);
    if (value) parts.push(`[${name}="${value}"]`);
  }
  return parts.join("");
}

/** Body attributes, markup (one tag per line) and focus, ids numbered by first appearance. */
function serialise(): string {
  const ids = new Map<string, string>();
  const attrs = document.body
    .getAttributeNames()
    .map((name) => ` ${name}="${document.body.getAttribute(name) ?? ""}"`)
    .join("");
  const html = `<body${attrs}>${document.body.innerHTML}</body>\nfocus: ${describeFocus()}`;
  return html
    .replace(REACT_ID, (id) => {
      const known = ids.get(id);
      if (known) return known;
      const next = `«id${ids.size}»`;
      ids.set(id, next);
      return next;
    })
    .replace(/></g, ">\n<");
}

// --- interactions ---------------------------------------------------------

async function keyOpenTrigger() {
  await act(async () => {
    q("button").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await flush();
}

async function pointerOpenTrigger() {
  await act(async () => {
    q("button").dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, ctrlKey: false, pointerType: "mouse" }),
    );
  });
  await flush();
}

async function focusTooltipTrigger() {
  await act(async () => q('[data-state="closed"]').focus());
  await flush();
}

// --- fixtures -------------------------------------------------------------

const noop = () => {};
const icon = <IconHome size={20} />;

const resizable: SidebarResizeOptions = {
  storageKey: "parity-sidebar-width",
  defaultWidth: 256,
  minWidth: 200,
  maxWidth: 400,
};

const STORAGE = { "parity-sidebar-width": "320" };

const rail = (
  <SidebarRail showDivider top={<RailTile label="Home">{icon}</RailTile>} footer={<RailDivider />}>
    <RailTile label="Search" active>
      <IconSearch size={20} />
    </RailTile>
  </SidebarRail>
);
const panel = (
  <SidebarPanel title="Library">
    <nav>panel body</nav>
  </SidebarPanel>
);

function sidebar(props: Partial<AppSidebarProps> = {}) {
  return (
    <AppSidebar
      rail={rail}
      panel={panel}
      isDesktop
      mobileOpen={false}
      onMobileOpenChange={noop}
      {...props}
    />
  );
}

function shell(props: Partial<AppShellProps> = {}, sidebarProps?: Partial<AppSidebarProps>) {
  return (
    <AppShell sidebar={sidebarProps ? sidebar(sidebarProps) : undefined} {...props}>
      <p>Page</p>
    </AppShell>
  );
}

type Case = {
  node: ReactNode;
  /** `localStorage` entries set before mount. */
  storage?: Record<string, string>;
  /** Runs after mount, before serialising. */
  interact?: () => Promise<void>;
};

const cases: Record<string, Case> = {};

// ConfirmDialog
const SIZES = ["default", "sm", "md"] as const;
for (const size of SIZES) {
  for (const variant of ["default", "destructive"] as const) {
    for (const withDescription of [false, true]) {
      for (const confirmDisabled of [false, true]) {
        cases[
          `ConfirmDialog size=${size} variant=${variant} description=${withDescription} confirmDisabled=${confirmDisabled}`
        ] = {
          node: (
            <ConfirmDialog
              size={size}
              variant={variant}
              open
              onOpenChange={noop}
              title="Delete item?"
              description={withDescription ? "This cannot be undone." : undefined}
              confirmDisabled={confirmDisabled}
              onConfirm={noop}
              onCancel={noop}
            />
          ),
        };
      }
    }
  }
  const Trigger = size === "default" ? AlertDialogTrigger : DialogTrigger;
  cases[`ConfirmDialog size=${size} custom labels`] = {
    node: (
      <ConfirmDialog
        size={size}
        open
        onOpenChange={noop}
        title={<span>Leave team?</span>}
        description={<strong>You lose access.</strong>}
        cancelLabel="Stay"
        confirmLabel="Leave"
      />
    ),
  };
  cases[`ConfirmDialog size=${size} trigger closed`] = {
    node: (
      <ConfirmDialog size={size} title="Delete item?">
        <Trigger asChild>
          <button type="button">Open</button>
        </Trigger>
      </ConfirmDialog>
    ),
  };
  cases[`ConfirmDialog size=${size} trigger open`] = {
    node: (
      <ConfirmDialog size={size} open onOpenChange={noop} title="Delete item?" description="Gone.">
        <Trigger asChild>
          <button type="button">Open</button>
        </Trigger>
      </ConfirmDialog>
    ),
  };
  cases[`ConfirmDialog size=${size} trigger opened by click`] = {
    node: (
      <ConfirmDialog size={size} title="Delete item?" description="Gone.">
        <Trigger asChild>
          <button type="button">Open</button>
        </Trigger>
      </ConfirmDialog>
    ),
    interact: async () => {
      await act(async () => q("button").click());
      await flush();
    },
  };
  cases[`ConfirmDialog size=${size} open=false`] = {
    node: <ConfirmDialog size={size} open={false} onOpenChange={noop} title="Delete item?" />,
  };
}

// AppShell
cases["AppShell defaults"] = { node: <AppShell /> };
cases["AppShell defaults with sidebar and children"] = { node: shell({}, {}) };
cases["AppShell panelHidden"] = { node: shell({ panelHidden: true }, { panelHidden: true }) };
cases["AppShell railWidth"] = { node: shell({ railWidth: "3.5rem" }) };
cases["AppShell sidebarWidth"] = { node: shell({ sidebarWidth: "18rem" }) };
cases["AppShell mobileHeaderHeight"] = { node: shell({ mobileHeaderHeight: "4rem" }) };
cases["AppShell skipLinkLabel"] = { node: shell({ skipLinkLabel: "Skip" }) };
cases["AppShell mainId"] = { node: shell({ mainId: "content" }) };
cases["AppShell classNames"] = {
  node: shell({ className: "shell-x", mainClassName: "main-x", contentClassName: "content-x" }),
};
cases["AppShell all custom props"] = {
  node: shell(
    {
      panelHidden: true,
      railWidth: "3rem",
      sidebarWidth: "16rem",
      mobileHeaderHeight: "3rem",
      skipLinkLabel: "Jump",
      mainId: "page",
      className: "shell-x",
      mainClassName: "main-x",
      contentClassName: "content-x",
    },
    {},
  ),
};
cases["AppShell resizable default width"] = { node: shell({ resizable }, {}) };
cases["AppShell resizable stored width"] = { node: shell({ resizable }, {}), storage: STORAGE };
cases["AppShell resizable stored width out of bounds"] = {
  node: shell({ resizable }, {}),
  storage: { "parity-sidebar-width": "999" },
};
cases["AppShell resizable stored width invalid"] = {
  node: shell({ resizable }, {}),
  storage: { "parity-sidebar-width": '"wide"' },
};
cases["AppShell resizable custom label and railWidth"] = {
  node: shell({ resizable: { ...resizable, label: "Drag" }, railWidth: "3rem" }, {}),
};
cases["AppShell resizable ignores sidebarWidth"] = { node: shell({ resizable, sidebarWidth: "30rem" }, {}) };

// AppSidebar
for (const inShell of [false, true]) {
  const where = inShell ? "in AppShell" : "alone";
  const wrap = (props: Partial<AppSidebarProps>) =>
    inShell ? <AppShell sidebar={sidebar(props)} /> : sidebar(props);
  for (const isDesktop of [true, false]) {
    for (const mobileOpen of [false, true]) {
      cases[`AppSidebar ${where} isDesktop=${isDesktop} mobileOpen=${mobileOpen}`] = {
        node: wrap({ isDesktop, mobileOpen, id: "drawer" }),
      };
    }
  }
  cases[`AppSidebar ${where} auto id`] = { node: wrap({ isDesktop: false }) };
  cases[`AppSidebar ${where} collapsed`] = { node: wrap({ collapsed: true, id: "drawer" }) };
  cases[`AppSidebar ${where} panelHidden`] = { node: wrap({ panelHidden: true, id: "drawer" }) };
  cases[`AppSidebar ${where} panelHidden mobile open`] = {
    node: wrap({ panelHidden: true, isDesktop: false, mobileOpen: true, id: "drawer" }),
  };
  cases[`AppSidebar ${where} no panel`] = { node: wrap({ panel: undefined, id: "drawer" }) };
  cases[`AppSidebar ${where} mobileTitle`] = { node: wrap({ mobileTitle: "Title", id: "drawer" }) };
  cases[`AppSidebar ${where} mobileHeaderActions`] = {
    node: wrap({
      mobileTitle: <span>Title</span>,
      mobileHeaderActions: (
        <>
          <button type="button">A</button>
          <button type="button">B</button>
        </>
      ),
      id: "drawer",
    }),
  };
  cases[`AppSidebar ${where} custom chrome`] = {
    node: wrap({
      isDesktop: false,
      mobileOpen: true,
      mobileMenuIcon: (open) => <span data-open={String(open)}>menu</span>,
      mobileMenuLabel: "Menu",
      closeLabel: "Dismiss",
      id: "nav",
      asideProps: { "data-vt": "sidebar", "data-empty": undefined },
      className: "aside-x",
    }),
  };
  cases[`AppSidebar ${where} custom chrome closed`] = {
    node: wrap({
      isDesktop: false,
      mobileOpen: false,
      mobileMenuIcon: (open) => <span data-open={String(open)}>menu</span>,
      mobileMenuLabel: "Menu",
      closeLabel: "Dismiss",
      id: "nav",
      asideProps: { "data-vt": "sidebar" },
      className: "aside-x",
    }),
  };
}
cases["AppSidebar resizable shows handle"] = { node: shell({ resizable }, { id: "drawer" }) };
cases["AppSidebar resizable stored width handle"] = {
  node: shell({ resizable }, { id: "drawer" }),
  storage: STORAGE,
};
cases["AppSidebar resizable collapsed hides handle"] = {
  node: shell({ resizable }, { collapsed: true, id: "drawer" }),
};
cases["AppSidebar resizable panelHidden hides handle"] = {
  node: shell({ resizable, panelHidden: true }, { panelHidden: true, id: "drawer" }),
};
cases["AppSidebar resizable mobile hides handle"] = {
  node: shell({ resizable }, { isDesktop: false, id: "drawer" }),
};
cases["AppSidebar resizable mobile open hides handle"] = {
  node: shell({ resizable }, { isDesktop: false, mobileOpen: true, id: "drawer" }),
};

// SidebarRail
cases["SidebarRail empty"] = { node: <SidebarRail /> };
cases["SidebarRail children only"] = { node: <SidebarRail>{<span>body</span>}</SidebarRail> };
cases["SidebarRail top children footer divider"] = {
  node: (
    <SidebarRail showDivider top={<span>top</span>} footer={<span>foot</span>}>
      <span>body</span>
    </SidebarRail>
  ),
};
cases["SidebarRail null top and footer"] = {
  node: (
    <SidebarRail top={null} footer={undefined}>
      <span>body</span>
    </SidebarRail>
  ),
};
cases["SidebarRail classNames and passthrough"] = {
  node: (
    <SidebarRail
      showDivider
      id="rail"
      aria-label="Primary"
      data-vt="rail"
      role="navigation"
      className="w-14"
      topClassName="top-x"
      bodyClassName="scrollbar-thin"
      footerClassName="border-t border-separator"
      top={<span>top</span>}
      footer={<span>foot</span>}
    >
      <span>body</span>
    </SidebarRail>
  ),
};
cases["SidebarRail bodyAsChild nav"] = {
  node: (
    <SidebarRail bodyAsChild bodyClassName="body-x" top={<span>top</span>}>
      <nav aria-label="Sections" className="nav-x">
        <RailTile label="Home">{icon}</RailTile>
      </nav>
    </SidebarRail>
  ),
};
const tabsRail = (bodyAsChild: boolean) => (
  <Tabs defaultValue="files" orientation="vertical">
    <SidebarRail tabs bodyAsChild={bodyAsChild} bodyClassName="body-x" top={<span>top</span>} footer={<span>foot</span>}>
      {bodyAsChild ? (
        <nav>
          <RailTile tabValue="files" label="Files" active>
            {icon}
          </RailTile>
        </nav>
      ) : (
        <>
          <RailTile tabValue="files" label="Files" active>
            {icon}
          </RailTile>
          <RailTile tabValue="search" label="Search" badge={<span>2</span>} className="tile-x" id="search-tab">
            <IconSearch size={20} />
          </RailTile>
          <RailTile tabValue="off" label="Off" showTooltip={false} disabled>
            {icon}
          </RailTile>
        </>
      )}
    </SidebarRail>
    <TabsContent value="files">Files panel</TabsContent>
    <TabsContent value="search">Search panel</TabsContent>
  </Tabs>
);
cases["SidebarRail tabs"] = { node: tabsRail(false) };
cases["SidebarRail tabs bodyAsChild"] = { node: tabsRail(true) };

// RailTile, RailDivider, SidebarIconTooltip
cases["RailTile button idle"] = { node: <RailTile label="Search">{icon}</RailTile> };
cases["RailTile button active"] = {
  node: (
    <RailTile label="Search" active>
      {icon}
    </RailTile>
  ),
};
cases["RailTile button passthrough"] = {
  node: (
    <RailTile label="Search" className="tile-x" id="tile" type="submit" disabled data-vt="tile" onClick={noop}>
      {icon}
    </RailTile>
  ),
};
cases["RailTile tooltip override"] = {
  node: (
    <RailTile label="Search" tooltip="Find">
      {icon}
    </RailTile>
  ),
};
cases["RailTile tooltip override open"] = {
  node: (
    <RailTile label="Search" tooltip="Find">
      {icon}
    </RailTile>
  ),
  interact: focusTooltipTrigger,
};
cases["RailTile tooltip default open"] = {
  node: (
    <RailTile label="Search" active>
      {icon}
    </RailTile>
  ),
  interact: focusTooltipTrigger,
};
cases["RailTile showTooltip false"] = {
  node: (
    <RailTile label="Search" showTooltip={false}>
      {icon}
    </RailTile>
  ),
};
cases["RailTile badge"] = {
  node: (
    <RailTile label="Inbox" badge={<span className="badge-x">3</span>}>
      {icon}
    </RailTile>
  ),
};
cases["RailTile asChild link active"] = {
  node: (
    <RailTile asChild label="Inbox" active badge={<span>3</span>} className="tile-x">
      <a href="/inbox">{icon}</a>
    </RailTile>
  ),
};
cases["RailTile asChild link idle"] = {
  node: (
    <RailTile asChild label="Inbox" showTooltip={false}>
      <a href="/inbox" className="link-x">
        {icon}
      </a>
    </RailTile>
  ),
};
cases["RailTile tabValue"] = {
  node: (
    <Tabs defaultValue="a" orientation="vertical">
      <SidebarRail tabs>
        <RailTile tabValue="a" label="A" active badge={<span>1</span>}>
          {icon}
        </RailTile>
        <RailTile tabValue="b" label="B" asChild>
          {icon}
        </RailTile>
      </SidebarRail>
    </Tabs>
  ),
};
cases["RailDivider"] = { node: <RailDivider /> };
cases["RailDivider className"] = { node: <RailDivider className="w-6" /> };
cases["SidebarIconTooltip enabled"] = {
  node: (
    <SidebarIconTooltip label="Tip" enabled>
      <button type="button">x</button>
    </SidebarIconTooltip>
  ),
};
cases["SidebarIconTooltip enabled open"] = {
  node: (
    <SidebarIconTooltip label="Tip" enabled>
      <button type="button">x</button>
    </SidebarIconTooltip>
  ),
  interact: focusTooltipTrigger,
};
cases["SidebarIconTooltip side and offset open"] = {
  node: (
    <SidebarIconTooltip label="Tip" enabled side="bottom" sideOffset={2}>
      <button type="button">x</button>
    </SidebarIconTooltip>
  ),
  interact: focusTooltipTrigger,
};
cases["SidebarIconTooltip disabled"] = {
  node: (
    <SidebarIconTooltip label="Tip" enabled={false}>
      <button type="button">x</button>
    </SidebarIconTooltip>
  ),
};

// SidebarPanel and SidebarHeader
cases["SidebarPanel title only"] = { node: <SidebarPanel title="Library" /> };
cases["SidebarPanel headerTrailing"] = {
  node: <SidebarPanel title="Library" headerTrailing={<button type="button">New</button>} />,
};
cases["SidebarPanel onClose"] = { node: <SidebarPanel title="Library" onClose={noop} /> };
cases["SidebarPanel headerTrailing and onClose"] = {
  node: <SidebarPanel title="Library" headerTrailing={<button type="button">New</button>} onClose={noop} />,
};
cases["SidebarPanel close label and class"] = {
  node: <SidebarPanel title="Library" onClose={noop} closeLabel="Hide" closeButtonClassName="close-x" />,
};
cases["SidebarPanel collapsed"] = { node: <SidebarPanel title="Library" collapsed /> };
cases["SidebarPanel className and children"] = {
  node: (
    <SidebarPanel title="Library" className="panel-x">
      <nav>one</nav>
      <footer>two</footer>
    </SidebarPanel>
  ),
};
cases["SidebarHeader"] = { node: <SidebarHeader title="Section" /> };
cases["SidebarHeader trailing and className"] = {
  node: <SidebarHeader title="Section" trailing={<button type="button">+</button>} className="header-x" />,
};

// SidebarAccountMenu
const accountVariants: Record<string, ReactNode> = {
  "name only": <SidebarAccountMenu name="Test User" />,
  "name single word": <SidebarAccountMenu name="tester" />,
  "name blank": <SidebarAccountMenu name="   " />,
  "name and email": <SidebarAccountMenu name="Test User" email="user@example.test" />,
  stackedLabel: <SidebarAccountMenu name="Test User" stackedLabel />,
  imageUrl: <SidebarAccountMenu name="Test User" imageUrl="https://example.test/a.png" />,
  placement: (
    <SidebarAccountMenu name="Test User" align="end" side="top" sideOffset={4} collisionPadding={12} />
  ),
  contentClassName: <SidebarAccountMenu name="Test User" contentClassName="p-2" />,
  "badge true": <SidebarAccountMenu name="Test User" badge />,
  "badge false": <SidebarAccountMenu name="Test User" badge={false} />,
  triggerProps: (
    <SidebarAccountMenu
      name="Test User"
      triggerProps={{ "aria-label": "Account", title: "You", className: "mt-1", id: "account" }}
    />
  ),
  contentProps: (
    <SidebarAccountMenu name="Test User" contentProps={{ "aria-label": "Account actions", fitViewport: true }} />
  ),
  "with items": (
    <SidebarAccountMenu name="Test User" email="user@example.test" badge>
      <DropdownMenuItem>Settings</DropdownMenuItem>
      <DropdownMenuItem>Sign out</DropdownMenuItem>
    </SidebarAccountMenu>
  ),
};
for (const [label, node] of Object.entries(accountVariants)) {
  cases[`SidebarAccountMenu ${label} closed`] = { node };
  cases[`SidebarAccountMenu ${label} open (keyboard)`] = { node, interact: keyOpenTrigger };
}
cases["SidebarAccountMenu name only open (pointer)"] = {
  node: accountVariants["name only"],
  interact: pointerOpenTrigger,
};
cases["SidebarAccountMenu with items open (pointer)"] = {
  node: accountVariants["with items"],
  interact: pointerOpenTrigger,
};
cases["SidebarAccountMenuPlaceholder"] = { node: <SidebarAccountMenuPlaceholder /> };
cases["SidebarAccountMenuPlaceholder className"] = { node: <SidebarAccountMenuPlaceholder className="mt-2" /> };

// SignOutDialog
const signOut = { open: true, onOpenChange: noop, onConfirm: noop, pending: false };
cases["SignOutDialog closed"] = { node: <SignOutDialog {...signOut} open={false} /> };
cases["SignOutDialog open"] = { node: <SignOutDialog {...signOut} /> };
cases["SignOutDialog pending"] = { node: <SignOutDialog {...signOut} pending /> };
cases["SignOutDialog description"] = { node: <SignOutDialog {...signOut} description="You will need to sign in again." /> };
cases["SignOutDialog contentClassName"] = { node: <SignOutDialog {...signOut} contentClassName="dialog-x" /> };
cases["SignOutDialog custom title and question"] = {
  node: <SignOutDialog {...signOut} title="Log out" question="Log out now?" />,
};
cases["SignOutDialog everything pending"] = {
  node: (
    <SignOutDialog
      {...signOut}
      pending
      description="Bye."
      contentClassName="dialog-x"
      title="Log out"
      question="Log out now?"
    />
  ),
};

// SidebarResizeHandle
cases["SidebarResizeHandle in resizable AppShell"] = {
  node: (
    <AppShell resizable={resizable}>
      <div className="relative">
        <SidebarResizeHandle />
      </div>
    </AppShell>
  ),
};
cases["SidebarResizeHandle className stored width"] = {
  node: (
    <AppShell resizable={{ ...resizable, label: "Width" }}>
      <SidebarResizeHandle className="handle-x" />
    </AppShell>
  ),
  storage: STORAGE,
};
cases["SidebarResizeHandle outside resizable AppShell"] = {
  node: (
    <AppShell>
      <SidebarResizeHandle />
    </AppShell>
  ),
};

// --- snapshot runner ------------------------------------------------------

function readFixture(): Record<string, string> {
  try {
    const parsed: Record<string, string> = JSON.parse(readFileSync(FIXTURE, "utf8"));
    return parsed;
  } catch {
    return {};
  }
}

const expected = UPDATE ? {} : readFixture();
const actual: Record<string, string> = {};

describe("legacy DOM parity", () => {
  it.each(Object.keys(cases))("%s", async (name) => {
    const testCase = cases[name];
    if (!testCase) throw new Error(`unknown case ${name}`);
    for (const [key, value] of Object.entries(testCase.storage ?? {})) localStorage.setItem(key, value);
    await mount(testCase.node);
    await testCase.interact?.();
    const html = serialise();
    actual[name] = html;
    if (UPDATE) return;
    expect(Object.keys(expected), `fixture is missing "${name}"; run with UPDATE_LEGACY_DOM=1`).toContain(name);
    expect(html).toBe(expected[name]);
  });

  it("has no stale fixture cases", () => {
    if (UPDATE) return;
    expect(Object.keys(expected).filter((name) => !(name in cases))).toEqual([]);
  });

  afterAll(() => {
    if (!UPDATE) return;
    const sorted = Object.fromEntries(Object.keys(cases).map((name) => [name, actual[name]]));
    writeFileSync(FIXTURE, `${JSON.stringify(sorted, null, 2)}\n`);
  });
});

// --- behaviour ------------------------------------------------------------

function dialogButtons(): HTMLButtonElement[] {
  const dialog = q('[role="dialog"], [role="alertdialog"]');
  return Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).filter(
    (b) => b.textContent === "Cancel" || b.textContent === "Confirm",
  );
}

function button(text: string): HTMLButtonElement {
  const found = dialogButtons().find((b) => b.textContent === text);
  if (!found) throw new Error(`missing ${text}`);
  return found;
}

async function pressEscape() {
  await act(async () => {
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    q('[role="dialog"], [role="alertdialog"]').dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
}

async function pointerDownOutside() {
  const outside = document.createElement("div");
  document.body.appendChild(outside);
  // Radix registers the outside-pointer listener on the next tick.
  await flush();
  await act(async () => {
    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
    // Radix defers a left-button outside dismissal to the following click.
    outside.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
  });
  await flush();
}

function dialogSpies() {
  const calls: string[] = [];
  const onCancel = vi.fn(() => calls.push("cancel"));
  const onConfirm = vi.fn(() => calls.push("confirm"));
  const onOpenChange = vi.fn((open: boolean) => calls.push(`open:${open}`));
  return { calls, onCancel, onConfirm, onOpenChange };
}

describe("ConfirmDialog behaviour", () => {
  it("default: Cancel calls onCancel and onOpenChange(false)", async () => {
    const spies = dialogSpies();
    await mount(<ConfirmDialog open title="Discard?" description="Gone." {...spies} />);
    await act(async () => button("Cancel").click());
    expect(spies.onCancel).toHaveBeenCalledTimes(1);
    expect(spies.onOpenChange).toHaveBeenCalledWith(false);
    expect(spies.onConfirm).not.toHaveBeenCalled();
  });

  it("default: Confirm calls onConfirm", async () => {
    const spies = dialogSpies();
    await mount(<ConfirmDialog open title="Discard?" description="Gone." {...spies} />);
    await act(async () => button("Confirm").click());
    expect(spies.onConfirm).toHaveBeenCalledTimes(1);
    expect(spies.onCancel).not.toHaveBeenCalled();
  });

  it("default: blocks outside pointer-down", async () => {
    const spies = dialogSpies();
    await mount(<ConfirmDialog open title="Discard?" description="Gone." {...spies} />);
    await pointerDownOutside();
    expect(spies.onOpenChange).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  for (const size of ["sm", "md"] as const) {
    it(`${size}: Cancel calls onCancel then onOpenChange(false)`, async () => {
      const spies = dialogSpies();
      await mount(<ConfirmDialog size={size} open title="Remove?" {...spies} />);
      await act(async () => button("Cancel").click());
      expect(spies.calls).toEqual(["cancel", "open:false"]);
    });

    it(`${size}: Confirm calls onConfirm and not onOpenChange`, async () => {
      const spies = dialogSpies();
      await mount(<ConfirmDialog size={size} open title="Remove?" {...spies} />);
      await act(async () => button("Confirm").click());
      expect(spies.calls).toEqual(["confirm"]);
    });

    it(`${size}: Escape closes`, async () => {
      const spies = dialogSpies();
      await mount(<ConfirmDialog size={size} open title="Remove?" {...spies} />);
      await pressEscape();
      expect(spies.onOpenChange).toHaveBeenCalledWith(false);
      expect(spies.onCancel).not.toHaveBeenCalled();
      expect(spies.onConfirm).not.toHaveBeenCalled();
    });

    it(`${size}: outside pointer-down closes`, async () => {
      const spies = dialogSpies();
      await mount(<ConfirmDialog size={size} open title="Remove?" {...spies} />);
      await pointerDownOutside();
      expect(spies.onOpenChange).toHaveBeenCalledWith(false);
    });
  }
});

describe("SignOutDialog behaviour", () => {
  function signOutButton(label: string): HTMLButtonElement {
    const found = Array.from(q('[role="dialog"]').querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => b.textContent === label,
    );
    if (!found) throw new Error(`missing ${label}`);
    return found;
  }

  it("does not call onOpenChange(false) on Escape while pending", async () => {
    const onOpenChange = vi.fn();
    await mount(<SignOutDialog open pending onOpenChange={onOpenChange} onConfirm={noop} />);
    await pressEscape();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("calls onOpenChange(false) on Escape when not pending", async () => {
    const onOpenChange = vi.fn();
    await mount(<SignOutDialog open pending={false} onOpenChange={onOpenChange} onConfirm={noop} />);
    await pressEscape();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Cancel calls onOpenChange(false)", async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    await mount(<SignOutDialog open pending={false} onOpenChange={onOpenChange} onConfirm={onConfirm} />);
    await act(async () => signOutButton("Cancel").click());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Confirm calls onConfirm", async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    await mount(<SignOutDialog open pending={false} onOpenChange={onOpenChange} onConfirm={onConfirm} />);
    await act(async () => signOutButton("Sign out").click());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("disables both buttons while pending", async () => {
    await mount(<SignOutDialog open pending onOpenChange={noop} onConfirm={noop} />);
    expect(signOutButton("Cancel").disabled).toBe(true);
    expect(signOutButton("Signing out...").disabled).toBe(true);
  });
});

describe("useAppShellResize behaviour", () => {
  let latest: AppShellResize | null = null;
  function Probe() {
    latest = useAppShellResize();
    return null;
  }

  afterEach(() => {
    latest = null;
  });

  it("returns the shell resize values and updates through setWidth", async () => {
    await mount(
      <AppShell resizable={resizable}>
        <Probe />
      </AppShell>,
    );
    expect(latest).toMatchObject({
      width: 256,
      isResizing: false,
      minWidth: 200,
      maxWidth: 400,
      defaultWidth: 256,
    });
    expect(Object.keys(latest ?? {}).sort()).toEqual(
      ["defaultWidth", "isResizing", "maxWidth", "minWidth", "setWidth", "width"],
    );
    await act(async () => latest?.setWidth(300));
    expect(latest?.width).toBe(300);
    expect(localStorage.getItem(resizable.storageKey)).toBe("300");
    expect(q("div", host ?? document.body).style.getPropertyValue("--app-shell-sidebar-width")).toBe("calc(4rem + 300px)");
    await act(async () => latest?.setWidth((w) => w + 10));
    expect(latest?.width).toBe(310);
  });

  it("reads the stored width", async () => {
    localStorage.setItem(resizable.storageKey, "320");
    await mount(
      <AppShell resizable={resizable}>
        <Probe />
      </AppShell>,
    );
    expect(latest?.width).toBe(320);
  });

  it("returns null outside a resizable shell", async () => {
    await mount(
      <AppShell>
        <Probe />
      </AppShell>,
    );
    expect(latest).toBeNull();
  });
});

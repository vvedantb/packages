// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Badge } from "./badge";
import { Kbd } from "./kbd";
import { Spinner } from "./spinner";
import { Tabs, TabsList, TabsTrigger } from "./tabs";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

function el(host: HTMLElement, selector: string): Element {
  const found = host.querySelector(selector);
  if (!found) throw new Error(`missing ${selector}`);
  return found;
}

function classSet(element: Element): string[] {
  return [...element.classList].sort();
}

describe("Spinner", () => {
  it("keeps the 0.6.1 default DOM", async () => {
    const host = await mount(<Spinner />);
    expect(host.innerHTML).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-loader-2 animate-spin text-muted-foreground size-6" role="status" aria-label="Loading"><path d="M12 3a9 9 0 1 0 9 9"></path></svg>',
    );
    const sm = await mount(<Spinner size="sm" className="mr-2" />);
    expect(el(sm, "svg").getAttribute("class")).toBe(
      "tabler-icon tabler-icon-loader-2 animate-spin text-muted-foreground size-4 mr-2",
    );
  });

  it("passes a numeric size to the icon without a size class", async () => {
    const host = await mount(<Spinner size={14} />);
    const svg = el(host, "svg");
    expect(svg.getAttribute("width")).toBe("14");
    expect(svg.getAttribute("height")).toBe("14");
    expect(svg.getAttribute("class")).toBe(
      "tabler-icon tabler-icon-loader-2 animate-spin text-muted-foreground",
    );
  });

  it("inherits the text colour with tone inherit", async () => {
    const host = await mount(<Spinner size={14} tone="inherit" className="mr-1.5" />);
    expect(el(host, "svg").getAttribute("class")).toBe(
      "tabler-icon tabler-icon-loader-2 animate-spin mr-1.5",
    );
  });

  it("drops the status role and label when decorative", async () => {
    const host = await mount(<Spinner size={16} tone="inherit" decorative />);
    expect(host.innerHTML).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-loader-2 animate-spin" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"></path></svg>',
    );
  });

  it("forwards stroke and lets props override the label", async () => {
    const host = await mount(<Spinner size={16} stroke={1.5} aria-label="Generating" />);
    const svg = el(host, "svg");
    expect(svg.getAttribute("stroke-width")).toBe("1.5");
    expect(svg.getAttribute("role")).toBe("status");
    expect(svg.getAttribute("aria-label")).toBe("Generating");
  });

  it("lets a colour class replace the muted default", async () => {
    const host = await mount(<Spinner size={20} className="text-danger" />);
    expect(el(host, "svg").classList.contains("text-muted-foreground")).toBe(false);
    expect(el(host, "svg").classList.contains("text-danger")).toBe(true);
  });
});

describe("Badge", () => {
  it("keeps the 0.6.1 default DOM", async () => {
    const host = await mount(<Badge>A</Badge>);
    expect(host.innerHTML).toBe(
      '<div class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:ring-offset-background border-border bg-default text-foreground">A</div>',
    );
  });

  it("success resolves to the same classes as the default badge with success overrides", async () => {
    const variant = await mount(<Badge variant="success">Active</Badge>);
    const overridden = await mount(
      <Badge className="border-success/25 bg-success/12 text-success text-xs">Active</Badge>,
    );
    expect(classSet(el(variant, "div"))).toEqual(classSet(el(overridden, "div")));
  });

  it("destructive-soft resolves to the same classes as the default badge with danger overrides", async () => {
    const variant = await mount(<Badge variant="destructive-soft">Revoked</Badge>);
    const overridden = await mount(<Badge className="bg-danger/10 text-danger text-xs">Revoked</Badge>);
    expect(classSet(el(variant, "div"))).toEqual(classSet(el(overridden, "div")));
    expect(el(variant, "div").classList.contains("border-border")).toBe(true);
  });
});

describe("Kbd", () => {
  it("keeps the 0.6.1 default DOM", async () => {
    const host = await mount(<Kbd>K</Kbd>);
    expect(host.innerHTML).toBe(
      '<kbd class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md bg-surface-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground">K</kbd>',
    );
  });

  it("renders the subtle variant without the default key chrome", async () => {
    const host = await mount(<Kbd variant="subtle">Esc</Kbd>);
    expect(host.innerHTML).toBe(
      '<kbd class="rounded bg-surface-secondary px-1.5 py-0.5 text-foreground">Esc</kbd>',
    );
  });
});

describe("Tabs soft variant", () => {
  const PILLS_TRIGGER =
    "t-tab inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  it("keeps the default list and link triggers", async () => {
    const host = await mount(
      <Tabs value="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b" asChild>
            <a href="/b">B</a>
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const list = el(host, '[role="tablist"]');
    expect(list.getAttribute("class")).toBe(
      "t-tabs max-sm:max-w-full max-sm:justify-center-safe max-sm:overflow-x-auto max-sm:scrollbar-none t-tabs--pills",
    );
    expect(list.getAttribute("data-variant")).toBe("pills");
    expect(el(host, "button").getAttribute("class")).toBe(PILLS_TRIGGER);
    const link = el(host, "a");
    expect(link.getAttribute("class")).toBe(PILLS_TRIGGER);
    expect(link.getAttribute("role")).toBe("tab");
    expect(link.getAttribute("data-state")).toBe("inactive");
  });

  it("keeps the segmented list and its pill", async () => {
    const host = await mount(
      <Tabs value="a">
        <TabsList variant="segmented">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(el(host, '[role="tablist"]').getAttribute("class")).toBe(
      "t-tabs max-sm:max-w-full max-sm:justify-center-safe max-sm:overflow-x-auto max-sm:scrollbar-none t-tabs--segmented",
    );
    expect(host.querySelector(".t-tabs-pill")).not.toBeNull();
    expect(el(host, "button").getAttribute("class")).toBe(PILLS_TRIGGER);
  });

  it("renders soft pills with state classes and keeps children", async () => {
    const host = await mount(
      <Tabs value="a">
        <TabsList variant="soft" aria-label="Features">
          <TabsTrigger value="a">
            A<span data-progress="" />
          </TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const list = el(host, '[role="tablist"]');
    expect(list.getAttribute("class")).toBe("flex flex-wrap items-center justify-center gap-1.5");
    expect(list.getAttribute("data-variant")).toBe("soft");
    expect(list.getAttribute("aria-label")).toBe("Features");
    expect(host.querySelector(".t-tabs-pill")).toBeNull();
    const [active, idle] = host.querySelectorAll("button");
    if (!active || !idle) throw new Error("missing triggers");
    expect(active.getAttribute("class")).toBe(
      "relative flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm text-muted-foreground transition-[transform,background-color] hover:bg-surface-secondary active:scale-[0.97] data-[state=active]:bg-surface-secondary data-[state=active]:text-foreground",
    );
    expect(active.getAttribute("data-state")).toBe("active");
    expect(idle.getAttribute("data-state")).toBe("inactive");
    expect(active.querySelector("[data-progress]")).not.toBeNull();
  });
});

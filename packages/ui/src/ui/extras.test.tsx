// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./button";
import { Card, CardHeader } from "./card";
import { CommandDialog, CommandInput } from "./command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { restoreModalScrollLock } from "./overlay-a11y";
import { SelectField } from "./select-field";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  root = null;
});

function button(): HTMLButtonElement {
  const el = document.querySelector("button");
  if (!(el instanceof HTMLButtonElement)) throw new Error("no button");
  return el;
}

describe("Button", () => {
  it("keeps the default DOM free of loading state", async () => {
    const host = await mount(<Button>Save</Button>);
    expect(host.innerHTML).not.toContain("data-loading");
    expect(button().disabled).toBe(false);
    expect(host.querySelector("svg")).toBeNull();
  });

  it("disables and swaps startContent for a spinner while loading", async () => {
    await mount(
      <Button loading startContent={<i data-start="" />} endContent={<b data-end="" />}>
        Save
      </Button>,
    );
    const el = button();
    expect(el.disabled).toBe(true);
    expect(el.getAttribute("data-loading")).toBe("true");
    expect(el.querySelector("[data-start]")).toBeNull();
    expect(el.querySelector("svg")?.getAttribute("class")).toBe("h-4 w-4 animate-spin");
    expect(Array.from(el.childNodes).map((n) => n.nodeName)).toEqual(["svg", "#text", "B"]);
  });

  it("renders endContent after the children", async () => {
    await mount(<Button startContent={<i />} endContent={<b />}>Go</Button>);
    expect(Array.from(button().childNodes).map((n) => n.nodeName)).toEqual(["I", "#text", "B"]);
  });

  it("merges the new variants over ghost", async () => {
    await mount(<Button variant="flat">A</Button>);
    const flat = button().className;
    expect(flat).toContain("bg-transparent text-muted hover:bg-surface-tertiary hover:text-foreground");
    expect(flat).not.toContain("text-muted-foreground");

    await act(async () => root?.render(<Button variant="success">A</Button>));
    expect(button().className).toContain("bg-success text-success-foreground hover:bg-success/90");
    expect(button().className).not.toContain("text-muted-foreground");

    await act(async () => root?.render(<Button variant="warning">A</Button>));
    expect(button().className).toContain("bg-warning text-warning-foreground hover:bg-warning/90");
  });
});

describe("DropdownMenuItem endContent", () => {
  it("keeps the plain layout without endContent", async () => {
    await mount(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Plain</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const item = document.querySelector('[role="menuitem"]');
    expect(item?.innerHTML).toBe("Plain");
  });

  it("puts the label in a growing column with endContent last", async () => {
    await mount(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent fitViewport>
          <DropdownMenuItem startContent={<i />} description="More" endContent={<kbd>K</kbd>}>
            Label
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const item = document.querySelector('[role="menuitem"]');
    expect(item?.innerHTML).toBe(
      '<i></i><div class="min-w-0 flex-1 text-left"><div class="flex items-center gap-2">Label</div><p class="text-xs text-muted-foreground">More</p></div><kbd>K</kbd>',
    );
    expect(document.querySelector('[role="menu"]')?.className).toContain(
      "max-sm:max-h-[min(70dvh,var(--vv-height,70dvh))] max-sm:overflow-y-auto",
    );
  });
});

describe("ContextMenuItem slots", () => {
  async function openContextMenu(item: ReactNode) {
    await mount(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>{item}</ContextMenuContent>
      </ContextMenu>,
    );
    const trigger = document.querySelector("span");
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 1, clientY: 1 }));
    });
    return document.querySelector('[role="menuitem"]');
  }

  it("keeps the plain layout without slots", async () => {
    const item = await openContextMenu(<ContextMenuItem>Plain</ContextMenuItem>);
    expect(item?.innerHTML).toBe("Plain");
  });

  it("renders startContent and description", async () => {
    const item = await openContextMenu(
      <ContextMenuItem startContent={<i />} description="Hint">
        Label
      </ContextMenuItem>,
    );
    expect(item?.innerHTML).toBe(
      '<i></i><div class="min-w-0 flex-1 text-left"><div class="flex items-center gap-2">Label</div><p class="text-xs text-muted-foreground">Hint</p></div>',
    );
  });
});

describe("CardHeader", () => {
  it("renders the header classes", async () => {
    const host = await mount(
      <Card>
        <CardHeader className="pb-2">Title</CardHeader>
      </Card>,
    );
    expect(host.firstElementChild?.firstElementChild?.className).toBe("flex flex-col space-y-1.5 p-6 pb-2");
  });
});

describe("SelectField", () => {
  it("renders the label linked to the trigger", async () => {
    const host = await mount(<SelectField id="tone" label="Tone" placeholder="Pick one" />);
    expect(host.querySelector("label")?.getAttribute("for")).toBe("tone");
    expect(host.querySelector("label")?.textContent).toBe("Tone");
    expect(host.querySelector("button#tone")?.textContent).toContain("Pick one");
  });

  it("omits the label when not given", async () => {
    const host = await mount(<SelectField aria-label="Tone" />);
    expect(host.querySelector("label")).toBeNull();
    expect(host.querySelector("button")?.getAttribute("aria-label")).toBe("Tone");
  });
});

describe("CommandDialog", () => {
  it("keeps the default content and pinned list", async () => {
    await mount(
      <CommandDialog open>
        <CommandInput />
      </CommandDialog>,
    );
    expect(document.querySelector("div.sr-only")).toBeNull();
    const command = document.querySelector("[cmdk-root]");
    expect(command?.className).toContain("[&_[cmdk-list]]:h-80");
    expect(command?.parentElement?.className).toContain("overflow-hidden p-0 sm:max-w-xl");
  });

  it("adds a screen-reader header and the auto list layout", async () => {
    await mount(
      <CommandDialog open title="Search" description="Find a page" listLayout="auto">
        <CommandInput />
      </CommandDialog>,
    );
    const header = document.querySelector("div.sr-only");
    expect(header?.textContent).toBe("SearchFind a page");
    expect(document.querySelector("[cmdk-root]")?.className).not.toContain("[cmdk-list]]:h-80");
  });
});

describe("restoreModalScrollLock", () => {
  it("clears the lock when no dialog is open", () => {
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = "15px";
    document.body.style.pointerEvents = "none";
    restoreModalScrollLock();
    expect(document.body.getAttribute("style") ?? "").toBe("");
  });

  it("keeps the lock while a dialog is open", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("data-state", "open");
    document.body.appendChild(dialog);
    document.body.style.overflow = "hidden";
    document.body.style.pointerEvents = "none";
    restoreModalScrollLock();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.pointerEvents).toBe("");
  });
});

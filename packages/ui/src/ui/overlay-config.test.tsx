// @vitest-environment happy-dom
// App config (`UiConfigProvider`) and the opt-in props of the overlay family:
// Dialog, SideSheet, Popover, HoverCard, Tooltip, DropdownMenu, ContextMenu,
// Select and Command. Defaults without config are pinned by default-dom.test.tsx.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import * as UI from "../index";
import { UiConfigProvider, type UiConfig } from "./ui-config";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode, config?: UiConfig) {
  const host = document.createElement("div");
  host.id = "host";
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () =>
    created.render(config ? <UiConfigProvider config={config}>{node}</UiConfigProvider> : node),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

function el(selector: string): Element {
  const found = document.querySelector(selector);
  if (!found) throw new Error(`missing ${selector}`);
  return found;
}

const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

/** Overrides `matchMedia` for the compact-overlay query only. */
async function withCompactViewport(run: () => Promise<void>) {
  const matchMedia = window.matchMedia;
  window.matchMedia = (query) => {
    const list = matchMedia.call(window, query);
    if (!query.includes("max-width: 639px")) return list;
    Object.defineProperty(list, "matches", { value: true });
    return list;
  };
  try {
    await run();
  } finally {
    window.matchMedia = matchMedia;
  }
}

describe("Dialog config", () => {
  const tree = (contentProps: { viewportAware?: boolean } = {}) => (
    <UI.Dialog open>
      <UI.DialogTrigger>Open</UI.DialogTrigger>
      <UI.DialogContent className="extra" {...contentProps}>
        <UI.DialogHeader>
          <UI.DialogTitle>Title</UI.DialogTitle>
          <UI.DialogDescription>Desc</UI.DialogDescription>
        </UI.DialogHeader>
        <UI.DialogBody>Body</UI.DialogBody>
        <UI.DialogFooter>Footer</UI.DialogFooter>
      </UI.DialogContent>
    </UI.Dialog>
  );
  const config: UiConfig = {
    Dialog: {
      classes: {
        trigger: "c-trigger",
        overlay: "c-overlay",
        content: "c-content",
        centered: "c-centered",
        compact: "c-compact",
        close: "c-close",
        header: "c-header",
        body: "c-body",
        footer: "c-footer",
        title: "c-title",
        description: "c-description",
      },
    },
  };

  it("replaces every part's classes and merges className last", async () => {
    await mount(tree(), config);
    const content = el('[role="dialog"]');
    expect(content.className).toMatch(/^c-content c-centered extra( is-open)?$/);
    expect(el('[role="dialog"] > button').className).toBe("c-close");
    expect(el("[data-state].c-overlay").className).toBe("c-overlay");
    expect(el("h2").className).toBe("c-title");
    expect(el("h2").parentElement?.className).toBe("c-header");
    expect(el("h2 + p").className).toBe("c-description");
    expect(el('[data-slot="dialog-footer"]').className).toBe("c-footer");
    expect(el('[data-slot="dialog-footer"]').previousElementSibling?.className).toBe("c-body");
  });

  it("leaves a part out of `classes` at its default", async () => {
    await mount(tree(), { Dialog: { classes: { title: "c-title" } } });
    expect(el('[role="dialog"]').className).toContain("glass-panel-strong");
    expect(el('[role="dialog"]').className).toContain("t-modal");
    expect(el("h2").className).toBe("c-title");
  });

  it("adds trigger classes only with config", async () => {
    await mount(
      <UI.Dialog>
        <UI.DialogTrigger>Open</UI.DialogTrigger>
      </UI.Dialog>,
    );
    expect(el("button").hasAttribute("class")).toBe(false);
    await act(async () => root?.unmount());
    document.body.innerHTML = "";
    await mount(
      <UI.Dialog>
        <UI.DialogTrigger className="x">Open</UI.DialogTrigger>
      </UI.Dialog>,
      config,
    );
    expect(el("button").className).toBe("c-trigger x");
  });

  it("is a bottom sheet on a compact viewport by default", async () => {
    await withCompactViewport(async () => {
      await mount(tree(), config);
      const content = el('[role="dialog"]');
      expect(content.getAttribute("data-compact")).toBe("true");
      expect(content.className).toBe("c-content c-compact extra");
      expect(content.getAttribute("style")).toContain("--overlay-vv-height");
    });
  });

  it("viewportAware={false} keeps the centred dialog and leaves the viewport alone", async () => {
    await withCompactViewport(async () => {
      await mount(tree({ viewportAware: false }), config);
      const content = el('[role="dialog"]');
      expect(content.hasAttribute("data-compact")).toBe(false);
      expect(content.className).toMatch(/^c-content c-centered extra( is-open)?$/);
      expect(content.getAttribute("style") ?? "").not.toContain("--overlay-vv-height");
    });
  });

  it("takes viewportAware from config, and the prop wins", async () => {
    await withCompactViewport(async () => {
      await mount(tree(), { Dialog: { viewportAware: false } });
      expect(el('[role="dialog"]').hasAttribute("data-compact")).toBe(false);
      await act(async () => root?.unmount());
      document.body.innerHTML = "";
      await mount(tree({ viewportAware: true }), { Dialog: { viewportAware: false } });
      expect(el('[role="dialog"]').getAttribute("data-compact")).toBe("true");
    });
  });
});

describe("SideSheet", () => {
  const tree = (props: { side?: "left" | "right"; hideCloseButton?: boolean } = {}) => (
    <UI.SideSheet open>
      <UI.SideSheetContent className="w-72" {...props}>
        <UI.SideSheetTitle>Title</UI.SideSheetTitle>
        <UI.SideSheetDescription>Desc</UI.SideSheetDescription>
      </UI.SideSheetContent>
    </UI.SideSheet>
  );

  it("is a Radix dialog pinned left by default, with a close button", async () => {
    await mount(tree());
    const content = el('[role="dialog"]');
    expect(content.className).toContain("left-0");
    expect(content.className).toContain("data-[state=open]:slide-in-from-left");
    expect(content.className).toContain("w-72");
    expect(content.className).not.toContain("w-80");
    expect(el('[role="dialog"] > button').textContent).toBe("Close");
  });

  it("pins right and hides the close button on request", async () => {
    await mount(tree({ side: "right", hideCloseButton: true }));
    const content = el('[role="dialog"]');
    expect(content.className).toContain("right-0");
    expect(content.querySelector("button")).toBeNull();
  });

  it("takes classes and the side from config", async () => {
    await mount(tree(), {
      SideSheet: {
        side: "right",
        classes: { content: "c-content", left: "c-left", right: "c-right", close: "c-close", overlay: "c-overlay" },
      },
    });
    expect(el('[role="dialog"]').className).toBe("c-content c-right w-72");
    expect(el('[role="dialog"] > button').className).toBe("c-close");
    expect(document.querySelector(".c-overlay")).not.toBeNull();
  });
});

/** The popper wrapper's `translate(0px, Npx)`: the side offset for a bottom placement. */
function popperOffset(): string {
  return el("[data-radix-popper-content-wrapper]").getAttribute("style")?.match(/translate\(0px, (-?\d+)px\)/)?.[1] ?? "";
}

describe("Popover config", () => {
  const tree = (sideOffset?: number) => (
    <UI.Popover open>
      <UI.PopoverAnchor asChild>
        <span>Anchor</span>
      </UI.PopoverAnchor>
      <UI.PopoverTrigger>Open</UI.PopoverTrigger>
      <UI.PopoverContent sideOffset={sideOffset} className="extra">
        Body
      </UI.PopoverContent>
    </UI.Popover>
  );

  it("keeps the 6px offset without config", async () => {
    await mount(tree());
    expect(popperOffset()).toBe("6");
    expect(el('[role="dialog"]').className).toContain("bg-overlay");
  });

  it("takes classes and sideOffset from config; the prop wins", async () => {
    const config: UiConfig = { Popover: { sideOffset: 4, collisionPadding: 8, classes: { content: "c-content", trigger: "c-trigger" } } };
    await mount(tree(), config);
    expect(popperOffset()).toBe("4");
    expect(el('[role="dialog"]').className).toBe("c-content extra");
    expect(el("button").className).toBe("c-trigger");
    await act(async () => root?.unmount());
    document.body.innerHTML = "";
    await mount(tree(10), config);
    expect(popperOffset()).toBe("10");
  });
});

describe("HoverCard config", () => {
  const tree = (contentProps: { portal?: boolean } = {}, open = true) => (
    <UI.HoverCard {...(open ? { open } : {})}>
      <UI.HoverCardTrigger data-target="">Hover</UI.HoverCardTrigger>
      <UI.HoverCardContent {...contentProps}>Body</UI.HoverCardContent>
    </UI.HoverCard>
  );

  it("renders inline without config and in a portal with `portal`", async () => {
    await mount(tree());
    expect(el("#host").textContent).toContain("Body");
    await act(async () => root?.unmount());
    document.body.innerHTML = "";
    await mount(tree({ portal: true }));
    expect(el("#host").textContent).not.toContain("Body");
    expect(document.body.textContent).toContain("Body");
  });

  it("takes portal, classes and the open delay from config", async () => {
    await mount(tree({}, false), { HoverCard: { portal: true, openDelay: 20, classes: { content: "c-content" } } });
    el("[data-target]").dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
    await wait(120);
    expect(el("[data-target]").getAttribute("data-state")).toBe("open");
    expect(el(".c-content").closest("#host")).toBeNull();
  });

  it("waits the Radix 700ms without config", async () => {
    await mount(tree({}, false));
    el("[data-target]").dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
    await wait(120);
    expect(el("[data-target]").getAttribute("data-state")).toBe("closed");
  });
});

describe("Tooltip config", () => {
  const tree = (contentProps: { portal?: boolean } = {}) => (
    <UI.TooltipProvider>
      <UI.Tooltip>
        <UI.TooltipTrigger data-target="">Tip</UI.TooltipTrigger>
        <UI.TooltipContent {...contentProps}>Body</UI.TooltipContent>
      </UI.Tooltip>
    </UI.TooltipProvider>
  );
  const hover = () =>
    el("[data-target]").dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));

  it("takes the provider delay, portal and classes from config", async () => {
    await mount(tree(), { Tooltip: { delayDuration: 20, portal: true, classes: { content: "c-content" } } });
    hover();
    await wait(120);
    expect(el("[data-target]").getAttribute("data-state")).toContain("open");
    expect(el(".c-content").closest("#host")).toBeNull();
  });

  it("waits the Radix 700ms and renders inline without config", async () => {
    await mount(tree());
    hover();
    await wait(120);
    expect(el("[data-target]").getAttribute("data-state")).toBe("closed");
  });

  it("portals with the prop", async () => {
    await mount(
      <UI.TooltipProvider>
        <UI.Tooltip open>
          <UI.TooltipTrigger>Tip</UI.TooltipTrigger>
          <UI.TooltipContent portal className="c-tip">Body</UI.TooltipContent>
        </UI.Tooltip>
      </UI.TooltipProvider>,
    );
    expect(el(".c-tip").closest("#host")).toBeNull();
  });
});

const menuClasses = {
  content: "c-content",
  subContent: "c-sub-content",
  subTrigger: "c-sub-trigger",
  item: "c-item",
  checkboxItem: "c-checkbox",
  radioItem: "c-radio",
  label: "c-label",
  separator: "c-separator",
  shortcut: "c-shortcut",
};
const menuIcons = { check: <i data-icon="check" />, radio: <i data-icon="radio" /> };

describe("DropdownMenu config", () => {
  const tree = (
    <UI.DropdownMenu open>
      <UI.DropdownMenuTrigger>Menu</UI.DropdownMenuTrigger>
      <UI.DropdownMenuContent>
        <UI.DropdownMenuLabel>Label</UI.DropdownMenuLabel>
        <UI.DropdownMenuItem inset>
          Item<UI.DropdownMenuShortcut>K</UI.DropdownMenuShortcut>
        </UI.DropdownMenuItem>
        <UI.DropdownMenuSeparator />
        <UI.DropdownMenuCheckboxItem checked>Check</UI.DropdownMenuCheckboxItem>
        <UI.DropdownMenuRadioGroup value="a">
          <UI.DropdownMenuRadioItem value="a">A</UI.DropdownMenuRadioItem>
        </UI.DropdownMenuRadioGroup>
        <UI.DropdownMenuSub open>
          <UI.DropdownMenuSubTrigger>More</UI.DropdownMenuSubTrigger>
          <UI.DropdownMenuSubContent>Sub</UI.DropdownMenuSubContent>
        </UI.DropdownMenuSub>
      </UI.DropdownMenuContent>
    </UI.DropdownMenu>
  );

  it("replaces part classes and icons, and keeps inset", async () => {
    await mount(tree, {
      DropdownMenu: { sideOffset: 9, collisionPadding: 8, icons: menuIcons, classes: { ...menuClasses, trigger: "c-trigger" } },
    });
    expect(el("button").className).toBe("c-trigger");
    expect(el('[role="menu"]').className).toBe("c-content");
    expect(el('[role="menuitem"]').className).toBe("c-item pl-8");
    expect(el('[role="menuitemcheckbox"]').className).toBe("c-checkbox");
    expect(el('[role="menuitemradio"]').className).toBe("c-radio");
    expect(el('[role="separator"]').className).toBe("c-separator");
    expect(el(".c-label").textContent).toBe("Label");
    expect(el(".c-shortcut").textContent).toBe("K");
    expect(el(".c-sub-trigger").textContent).toContain("More");
    expect(el(".c-sub-content").textContent).toBe("Sub");
    expect(el('[role="menuitemcheckbox"] [data-icon="check"]')).not.toBeNull();
    expect(el('[role="menuitemradio"] [data-icon="radio"]')).not.toBeNull();
    expect(popperOffset()).toBe("9");
  });

  it("keeps the default 4px offset and icons without config", async () => {
    await mount(tree);
    expect(popperOffset()).toBe("4");
    expect(el('[role="menuitemcheckbox"] svg').getAttribute("class")).toContain("h-4 w-4");
  });
});

describe("ContextMenu config", () => {
  const tree = (subProps: { portal?: boolean } = {}) => (
    <UI.ContextMenu>
      <UI.ContextMenuTrigger asChild>
        <div data-ctx="">Area</div>
      </UI.ContextMenuTrigger>
      <UI.ContextMenuContent>
        <UI.ContextMenuCheckboxItem checked>Check</UI.ContextMenuCheckboxItem>
        <UI.ContextMenuSub open>
          <UI.ContextMenuSubTrigger>More</UI.ContextMenuSubTrigger>
          <UI.ContextMenuSubContent {...subProps}>Sub</UI.ContextMenuSubContent>
        </UI.ContextMenuSub>
      </UI.ContextMenuContent>
    </UI.ContextMenu>
  );
  const open = () =>
    act(async () => {
      el("[data-ctx]").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    });

  it("keeps w-40 and an inline sub menu without config", async () => {
    await mount(tree());
    await open();
    const menus = document.querySelectorAll('[role="menu"]');
    expect(menus).toHaveLength(2);
    expect(menus[0]?.className).toContain("w-40");
    expect(menus[0]?.contains(menus[1] ?? null)).toBe(true);
  });

  it("portals the sub menu with the prop", async () => {
    await mount(tree({ portal: true }));
    await open();
    const menus = document.querySelectorAll('[role="menu"]');
    expect(menus[0]?.contains(menus[1] ?? null)).toBe(false);
  });

  it("takes classes, icons and subContentPortal from config", async () => {
    await mount(tree(), { ContextMenu: { subContentPortal: true, collisionPadding: 8, icons: menuIcons, classes: menuClasses } });
    await open();
    const menus = document.querySelectorAll('[role="menu"]');
    expect(menus[0]?.className).toBe("c-content");
    expect(menus[1]?.className).toBe("c-sub-content");
    expect(menus[0]?.contains(menus[1] ?? null)).toBe(false);
    expect(el('[role="menuitemcheckbox"] [data-icon="check"]')).not.toBeNull();
  });
});

describe("Select config", () => {
  const tree = (
    <UI.Select open defaultValue="a">
      <UI.SelectTrigger className="extra">
        <UI.SelectValue />
      </UI.SelectTrigger>
      <UI.SelectContent>
        <UI.SelectGroup>
          <UI.SelectLabel>Label</UI.SelectLabel>
          <UI.SelectItem value="a">A</UI.SelectItem>
        </UI.SelectGroup>
        <UI.SelectSeparator />
      </UI.SelectContent>
    </UI.Select>
  );

  it("has no data-slot and the built-in icons without config", async () => {
    await mount(tree);
    expect(el('[role="combobox"]').hasAttribute("data-slot")).toBe(false);
    expect(el('[role="combobox"] svg').getAttribute("class")).toContain("text-muted-foreground/85");
  });

  it("takes triggerSlot, classes and icons from config", async () => {
    await mount(tree, {
      Select: {
        triggerSlot: true,
        collisionPadding: 8,
        icons: { trigger: <i data-icon="down" />, check: <i data-icon="check" /> },
        classes: {
          trigger: "c-trigger",
          content: "c-content",
          viewport: "c-viewport",
          popperViewport: "c-popper",
          label: "c-label",
          item: "c-item",
          separator: "c-separator",
        },
      },
    });
    const trigger = el('[role="combobox"]');
    expect(trigger.getAttribute("data-slot")).toBe("select-trigger");
    expect(trigger.className).toBe("c-trigger extra");
    expect(trigger.querySelector('[data-icon="down"]')).not.toBeNull();
    expect(el('[role="listbox"]').className).toContain("c-content");
    expect(el("[data-radix-select-viewport]").className).toBe("c-viewport c-popper");
    expect(el('[role="option"]').className).toBe("c-item");
    expect(el('[role="option"] [data-icon="check"]')).not.toBeNull();
    expect(el(".c-label").textContent).toBe("Label");
    expect(document.querySelector(".c-separator")).not.toBeNull();
  });
});

describe("Command config", () => {
  const tree = (empty: { className?: string } = {}) => (
    <UI.Command>
      <UI.CommandInput placeholder="Search" />
      <UI.CommandList>
        <UI.CommandEmpty {...empty}>Nothing</UI.CommandEmpty>
      </UI.CommandList>
    </UI.Command>
  );
  const config: UiConfig = {
    Command: {
      emptyClassNameReplaces: true,
      icons: { search: <i data-icon="search" /> },
      classes: { root: "c-root", inputWrapper: "c-wrapper", input: "c-input", list: "c-list", empty: "c-empty" },
    },
  };

  it("replaces classes and the search icon", async () => {
    await mount(tree(), config);
    expect(el("[cmdk-root]").className).toBe("c-root");
    expect(el("[cmdk-input-wrapper]").className).toBe("c-wrapper");
    expect(el('[cmdk-input-wrapper] [data-icon="search"]')).not.toBeNull();
    expect(el("[cmdk-input]").className).toBe("c-input");
    expect(el("[cmdk-list]").className).toBe("c-list");
    expect(el("[cmdk-empty]").className).toBe("c-empty");
  });

  it("emptyClassNameReplaces: a className replaces the empty classes", async () => {
    await mount(tree({ className: "only-this" }), config);
    expect(el("[cmdk-empty]").className).toBe("only-this");
  });

  it("merges an empty className by default", async () => {
    await mount(tree({ className: "py-2" }));
    expect(el("[cmdk-empty]").className).toBe("text-center text-sm text-muted-foreground py-2");
  });

  it("CommandDialog takes its content and command classes from config", async () => {
    await mount(
      <UI.CommandDialog open>
        <UI.CommandInput />
      </UI.CommandDialog>,
      { Command: { classes: { dialogContent: "c-dialog", dialogCommand: "c-command" } } },
    );
    expect(el('[role="dialog"]').className).toContain("c-dialog");
    expect(el('[role="dialog"]').className).not.toContain("sm:max-w-xl");
    expect(el("[cmdk-root]").className).toContain("c-command");
  });
});

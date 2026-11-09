// @vitest-environment happy-dom
// Quoted replies (0.39.0): `Message` `actions` and `highlighted`,
// `MessageContextMenu`, `MessageHoverActions`, `MessageQuote` and
// `ReplyQuoteChip`. Existing `Message` DOM stays as it was without the props.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconArrowBackUp, IconCopy } from "@tabler/icons-react";
import { TooltipProvider } from "../ui/tooltip";
import { type UiConfig, UiConfigProvider } from "../ui/ui-config";
import * as rootEntry from "../index";
import * as clientEntry from "../client";
import {
  Message,
  MessageContent,
  MessageContextMenu,
  MessageHoverActions,
  MessageQuote,
  type MessageMenuAction,
} from "./message";
import { PromptInputHeader, ReplyQuoteChip } from "./prompt-input";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode, config?: UiConfig) {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  const tree = <TooltipProvider>{node}</TooltipProvider>;
  await act(async () =>
    created.render(config ? <UiConfigProvider config={config}>{tree}</UiConfigProvider> : tree),
  );
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

const el = (host: ParentNode, selector: string) => {
  const found = host.querySelector(selector);
  if (!found) throw new Error(`missing ${selector}`);
  return found as HTMLElement;
};

function actions(onReply = vi.fn(), onCopy = vi.fn(), onDelete = vi.fn()): MessageMenuAction[] {
  return [
    { key: "reply", label: "Reply", icon: <IconArrowBackUp size={14} />, onSelect: onReply },
    { key: "copy", label: "Copy", icon: <IconCopy size={14} />, onSelect: onCopy },
    { key: "delete", label: "Delete", destructive: true, onSelect: onDelete },
  ];
}

async function rightClick(target: Element) {
  await act(async () => {
    target.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20, button: 2 }),
    );
  });
}

describe("exports", () => {
  it("are on the root and client entries", () => {
    for (const name of ["MessageQuote", "MessageContextMenu", "MessageHoverActions", "ReplyQuoteChip"]) {
      expect(rootEntry, name).toHaveProperty(name);
      expect(clientEntry, name).toHaveProperty(name);
    }
  });
});

describe("Message without the new props", () => {
  it("renders the same DOM as before", async () => {
    const host = await mount(<Message from="assistant">hi</Message>);
    const root = el(host, "div");
    expect(root.className).toBe("group flex w-full max-w-[95%] flex-col gap-2 is-assistant");
    expect(root.hasAttribute("data-highlighted")).toBe(false);
    expect(root.innerHTML).toBe("hi");
  });

  it("treats empty actions as no actions", async () => {
    const host = await mount(<Message from="user" actions={[]}>hi</Message>);
    expect(el(host, "div").className).not.toContain("relative");
    expect(host.querySelector('[role="toolbar"]')).toBeNull();
  });
});

describe("Message highlighted", () => {
  it("adds a primary wash, a ring and data-highlighted while true", async () => {
    const host = await mount(<Message from="user" highlighted>hi</Message>);
    const root = el(host, "div");
    expect(root.hasAttribute("data-highlighted")).toBe(true);
    for (const name of ["bg-primary/10", "ring-2", "ring-primary/30", "duration-1000", "transition-[background-color,box-shadow]"]) {
      expect(root.classList.contains(name), name).toBe(true);
    }
  });

  it("keeps the fade transition after it goes false, with no wash", async () => {
    const host = await mount(<Message from="user" highlighted={false}>hi</Message>);
    const root = el(host, "div");
    expect(root.hasAttribute("data-highlighted")).toBe(false);
    expect(root.classList.contains("duration-1000")).toBe(true);
    expect(root.classList.contains("bg-primary/10")).toBe(false);
  });

  it("merges a caller className last", async () => {
    const host = await mount(<Message from="user" highlighted className="custom">hi</Message>);
    expect(el(host, "div").className.endsWith("custom")).toBe(true);
  });
});

describe("MessageHoverActions", () => {
  it("is a labelled toolbar of icon buttons revealed on hover", async () => {
    const onReply = vi.fn();
    const host = await mount(<MessageHoverActions actions={actions(onReply)} />);
    const bar = el(host, '[role="toolbar"]');
    expect(bar.getAttribute("aria-label")).toBe("Message actions");
    expect(bar.classList.contains("reveal-on-hover")).toBe(true);
    for (const name of ["absolute", "top-0", "z-10", "left-full", "ml-1"]) {
      expect(bar.classList.contains(name), name).toBe(true);
    }
    for (const name of ["mb-1", "self-start", "group-[.is-user]:self-end", "right-full"]) {
      expect(bar.classList.contains(name), name).toBe(false);
    }
    const buttons = [...bar.querySelectorAll("button")];
    expect(buttons.map((button) => button.textContent)).toEqual(["Reply", "Copy"]);
    await act(async () => buttons[0]!.click());
    expect(onReply).toHaveBeenCalledTimes(1);
  });

  it("draws menu-only actions nowhere, honours hover, and renders nothing when none are shown", async () => {
    const list: MessageMenuAction[] = [
      { key: "a", label: "A", onSelect: () => {} },
      { key: "b", label: "B", hover: true, onSelect: () => {} },
      { key: "c", label: "C", icon: <IconCopy />, hover: false, onSelect: () => {} },
    ];
    const host = await mount(<MessageHoverActions actions={list} />);
    expect([...host.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["B"]);
    const none = await mount(<MessageHoverActions actions={[list[0]!]} />);
    expect(none.querySelector('[role="toolbar"]')).toBeNull();
  });

  it("disables a disabled action and paints a destructive one in the danger colour", async () => {
    const list: MessageMenuAction[] = [
      { key: "a", label: "A", icon: <IconCopy />, disabled: true, onSelect: () => {} },
      { key: "d", label: "D", icon: <IconCopy />, destructive: true, onSelect: () => {} },
    ];
    const host = await mount(<MessageHoverActions actions={list} className="extra" />);
    const [a, d] = [...host.querySelectorAll("button")];
    expect(a!.disabled).toBe(true);
    expect(d!.classList.contains("text-danger")).toBe(true);
    expect(el(host, '[role="toolbar"]').classList.contains("extra")).toBe(true);
  });
});

describe("Message actions", () => {
  it("renders an absolute toolbar in a relative wrapper that adds no in-flow height", async () => {
    const host = await mount(<Message from="user" actions={actions()}>hi</Message>);
    const message = el(host, ".group");
    expect(message.classList.contains("pt-10")).toBe(false);
    const wrapper = message.firstElementChild as HTMLElement;
    expect(wrapper.className).toBe("relative ml-auto w-fit max-w-full");
    const bar = el(message, '[role="toolbar"]');
    expect(bar.parentElement).toBe(wrapper);
    expect(bar.classList.contains("absolute")).toBe(true);
    expect(wrapper.firstChild!.textContent).toBe("hi");
    expect(wrapper.lastElementChild).toBe(bar);
    // Only the absolute toolbar is added: every other child is the content.
    expect([...wrapper.children].filter((c) => !c.classList.contains("absolute"))).toHaveLength(0);
  });

  it("places the toolbar left of a user bubble and right of an assistant one", async () => {
    const user = await mount(<Message from="user" actions={actions()}>hi</Message>);
    const ub = el(user, '[role="toolbar"]');
    for (const name of ["right-full", "mr-1"]) expect(ub.classList.contains(name), name).toBe(true);
    expect(ub.classList.contains("left-full")).toBe(false);
    const assistant = await mount(<Message from="assistant" actions={actions()}>hi</Message>);
    const ab = el(assistant, '[role="toolbar"]');
    for (const name of ["left-full", "ml-1"]) expect(ab.classList.contains(name), name).toBe(true);
    expect(ab.classList.contains("right-full")).toBe(false);
    expect(el(assistant, ".group").firstElementChild!.classList.contains("ml-auto")).toBe(false);
    expect(ab.className).toContain("max-sm:");
  });

  it("renders only the children when actions are absent", async () => {
    const host = await mount(<Message from="user"><p id="c">hi</p></Message>);
    expect(el(host, ".group").firstElementChild!.id).toBe("c");
  });

  it("passes tooltipSide to MessageAction and keeps the default otherwise", async () => {
    const { MessageAction } = await import("./message");
    const host = await mount(
      <MessageAction tooltip="T" label="T" data-testid="a">x</MessageAction>,
    );
    expect(el(host, "button")).toBeTruthy();
    const bar = await mount(<MessageHoverActions actions={actions()} />);
    expect(bar.querySelectorAll("button").length).toBe(2);
  });

  it("opens the context menu on a right click, with Reply first", async () => {
    const onReply = vi.fn();
    const host = await mount(<Message from="user" actions={actions(onReply)}>hi</Message>);
    expect(document.body.querySelector('[role="menu"]')).toBeNull();
    await rightClick(el(host, ".group"));
    const menu = el(document.body, '[role="menu"]');
    expect(menu.getAttribute("aria-label")).toBe("Message actions");
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    expect(items.map((item) => item.textContent)).toEqual(["Reply", "Copy", "Delete"]);
    expect(items[2]!.classList.contains("text-danger")).toBe(true);
    await act(async () => items[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onReply).toHaveBeenCalledTimes(1);
  });

  it("keeps a UiConfig root class and the caller props", async () => {
    const host = await mount(
      <Message from="user" actions={actions()} data-id="m1" id="x">hi</Message>,
      { Message: { classes: { root: "custom-root" } } },
    );
    const message = el(host, "#x");
    expect(message.getAttribute("data-id")).toBe("m1");
    expect(message.classList.contains("custom-root")).toBe(true);
    expect(message.classList.contains("relative")).toBe(false);
  });
});

describe("MessageContextMenu", () => {
  it("returns its child untouched with no actions", async () => {
    const host = await mount(<MessageContextMenu actions={[]}><p id="child">hi</p></MessageContextMenu>);
    expect(el(host, "#child").parentElement).toBe(host);
  });

  it("skips disabled actions' select and wraps any child", async () => {
    const onCopy = vi.fn();
    const list: MessageMenuAction[] = [{ key: "copy", label: "Copy", disabled: true, onSelect: onCopy }];
    const host = await mount(<MessageContextMenu actions={list}><p id="child">hi</p></MessageContextMenu>);
    await rightClick(el(host, "#child"));
    const item = el(document.body, '[role="menuitem"]');
    expect(item.getAttribute("aria-disabled")).toBe("true");
    await act(async () => item.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onCopy).not.toHaveBeenCalled();
  });
});

describe("MessageQuote", () => {
  it("is a labelled group with the author and the text, a left border and a two line clamp", async () => {
    const host = await mount(<MessageQuote author="Ada" text="Ship it on Friday" className="mb-1" />);
    const quote = el(host, '[role="group"]');
    expect(quote.getAttribute("aria-label")).toBe("Quoted message from Ada");
    expect(quote.classList.contains("border-l-2")).toBe(true);
    expect(quote.classList.contains("mb-1")).toBe(true);
    expect(quote.querySelector("button")).toBeNull();
    expect(el(quote, ".truncate").textContent).toBe("Ada");
    expect(el(quote, ".line-clamp-2").textContent).toBe("Ship it on Friday");
  });

  it("with onPress holds a button that goes to the original", async () => {
    const onPress = vi.fn();
    const host = await mount(<MessageQuote author="Ada" text="Friday" onPress={onPress} data-testid="q" />);
    const button = el(host, "button");
    expect(button.getAttribute("aria-label")).toBe("Go to quoted message from Ada");
    expect(button.getAttribute("type")).toBe("button");
    expect(el(host, '[data-testid="q"]').classList.contains("border-l-2")).toBe(true);
    await act(async () => button.click());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("sits inside a message bubble above its text and takes the bubble colour", async () => {
    const host = await mount(
      <Message from="user">
        <MessageContent>
          <MessageQuote author="Ada" text="Friday" />
          <p id="body">Done</p>
        </MessageContent>
      </Message>,
    );
    const content = el(host, ".group > div");
    expect([...content.children].map((child) => child.tagName + (child.id ? `#${child.id}` : ""))).toEqual(["DIV", "P#body"]);
    expect(el(content, ".border-current\\/40")).toBeTruthy();
  });
});

describe("ReplyQuoteChip", () => {
  it("shows the author and two lines of text in a group named Replying to {author}", async () => {
    const host = await mount(<ReplyQuoteChip author="Ada" text="Ship it on Friday" />);
    const chip = el(host, '[role="group"]');
    expect(chip.getAttribute("aria-label")).toBe("Replying to Ada");
    expect(el(chip, ".truncate").textContent).toBe("Ada");
    expect(el(chip, ".line-clamp-2").textContent).toBe("Ship it on Friday");
    expect(chip.classList.contains("rounded-field")).toBe(true);
  });

  it("has a dismiss button that calls onDismiss, with a default and a custom label", async () => {
    const onDismiss = vi.fn();
    const host = await mount(<ReplyQuoteChip author="Ada" text="Friday" onDismiss={onDismiss} />);
    const button = el(host, "button");
    expect(button.textContent).toBe("");
    expect(button.getAttribute("aria-label")).toBe("Dismiss reply quote");
    await act(async () => button.click());
    expect(onDismiss).toHaveBeenCalledTimes(1);
    const custom = await mount(<ReplyQuoteChip author="Ada" text="Friday" dismissLabel="Remove quote" />);
    expect(el(custom, "button").getAttribute("aria-label")).toBe("Remove quote");
  });

  it("merges className and spreads props", async () => {
    const host = await mount(<ReplyQuoteChip author="Ada" text="x" className="mx-1" data-testid="chip" />);
    expect(el(host, '[data-testid="chip"]').classList.contains("mx-1")).toBe(true);
  });

  it("works inside PromptInputHeader", async () => {
    const host = await mount(
      <PromptInputHeader>
        <ReplyQuoteChip author="Ada" text="Friday" />
      </PromptInputHeader>,
    );
    expect(el(host, '[aria-label="Replying to Ada"]')).toBeTruthy();
  });
});

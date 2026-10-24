// @vitest-environment happy-dom
import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JumpRail, type JumpRailItem } from "./jump-rail";
import { buildChatJumpRailItems, buildChatJumpRailTicks } from "./chat-jump-rail";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
const observed: Element[] = [];
const scrollIntoView = vi.fn();

beforeEach(() => {
  observed.length = 0;
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
  class FakeObserver {
    observe(el: Element) {
      observed.push(el);
    }
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
  vi.unstubAllGlobals();
});

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return host;
}

const items: JumpRailItem[] = [
  { id: "a", title: "First", preview: "Reply one" },
  { id: "b", title: "Second" },
  { id: "c", title: "Third", level: 3 },
];

function Page({ present, ...props }: { present: string[] } & Partial<Parameters<typeof JumpRail>[0]>) {
  const ref = createRef<HTMLDivElement>();
  return (
    <div>
      <div ref={ref} data-testid="scroll">
        {present.map((id) => (
          <div key={id} data-message-id={id} data-toc-id={id} />
        ))}
      </div>
      <JumpRail items={items} scrollRef={ref} {...props} />
    </div>
  );
}

function button(host: HTMLElement): HTMLButtonElement {
  const found = host.querySelector("button");
  if (!found) throw new Error("no rail button");
  return found;
}

async function key(el: HTMLElement, k: string) {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
}

describe("JumpRail", () => {
  it("renders nothing below minVisibleItems", async () => {
    const host = await mount(<JumpRail items={items.slice(0, 1)} getScrollElement={() => null} />);
    expect(host.querySelector("[data-testid=jump-rail]")).toBeNull();
    const host2 = await mount(
      <JumpRail items={items.slice(0, 2)} minVisibleItems={3} getScrollElement={() => null} />,
    );
    expect(host2.querySelector("[data-testid=jump-rail]")).toBeNull();
  });

  it("renders one tick per item with Eva's classes", async () => {
    const host = await mount(<Page present={["a", "b", "c"]} />);
    const wrapper = host.querySelector("[data-testid=jump-rail]");
    expect(wrapper?.className).toContain("lg:pointer-fine:block");
    expect(host.querySelectorAll("button > span[data-in-view]")).toHaveLength(3);
    expect(host.querySelector("[data-level='3']")).not.toBeNull();
  });

  it("observes the targets found by the attribute", async () => {
    await mount(<Page present={["a", "c"]} targetAttribute="data-toc-id" />);
    expect(observed).toHaveLength(2);
  });

  it("shows the preview card on focus and moves with the arrow keys", async () => {
    const host = await mount(<Page present={["a", "b", "c"]} />);
    const btn = button(host);
    await act(async () => btn.focus());
    expect(host.textContent).toContain("First");
    expect(host.textContent).toContain("Reply one");
    expect(btn.getAttribute("aria-label")).toBe("Jump to message: First");
    await key(btn, "ArrowDown");
    expect(host.textContent).toContain("Second");
    await key(btn, "End");
    expect(btn.getAttribute("aria-label")).toBe("Jump to message: Third");
    await key(btn, "ArrowDown");
    expect(btn.getAttribute("aria-label")).toBe("Jump to message: Third");
    await key(btn, "Home");
    expect(btn.getAttribute("aria-label")).toBe("Jump to message: First");
    await key(btn, "ArrowUp");
    expect(btn.getAttribute("aria-label")).toBe("Jump to message: First");
  });

  it("shows the preview card on hover", async () => {
    const host = await mount(<Page present={["a", "b", "c"]} />);
    const btn = button(host);
    btn.getBoundingClientRect = () => ({ top: 0, height: 16, left: 0, width: 10, right: 10, bottom: 16, x: 0, y: 0, toJSON() {} });
    await act(async () => {
      btn.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientY: 16 }));
    });
    expect(host.textContent).toContain("Third");
    await act(async () => {
      btn.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      btn.dispatchEvent(new MouseEvent("mouseleave"));
    });
  });

  it("scrolls to the target on Enter", async () => {
    const host = await mount(<Page present={["a", "b", "c"]} />);
    const btn = button(host);
    await act(async () => btn.focus());
    await key(btn, "ArrowDown");
    await key(btn, "Enter");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(scrollIntoView.mock.contexts[0]).toBe(host.querySelector('[data-message-id="b"]'));
  });

  it("scrolls on click, using the pointer position", async () => {
    const host = await mount(<Page present={["a", "b", "c"]} />);
    const btn = button(host);
    btn.getBoundingClientRect = () => ({ top: 0, height: 16, left: 0, width: 10, right: 10, bottom: 16, x: 0, y: 0, toJSON() {} });
    await act(async () => {
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, clientY: 0 }));
    });
    expect(scrollIntoView.mock.contexts[0]).toBe(host.querySelector('[data-message-id="a"]'));
  });

  it("uses data-toc-id and a getter for the scroll root", async () => {
    const container = document.createElement("div");
    container.innerHTML = '<h2 data-toc-id="b"></h2>';
    document.body.appendChild(container);
    await mount(
      <JumpRail items={items} getScrollElement={() => container} targetAttribute="data-toc-id" />,
    );
    const btn = button(document.body);
    await act(async () => btn.focus());
    await key(btn, "ArrowDown");
    await key(btn, "Enter");
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector("h2"));
  });

  it("uses resolveTarget when given", async () => {
    const target = document.createElement("section");
    document.body.appendChild(target);
    const resolveTarget = vi.fn(() => target);
    await mount(<JumpRail items={items} getScrollElement={() => document.body} resolveTarget={resolveTarget} />);
    const btn = button(document.body);
    await act(async () => btn.focus());
    await key(btn, "Enter");
    expect(resolveTarget).toHaveBeenCalledWith(document.body, "a");
    expect(scrollIntoView.mock.contexts[0]).toBe(target);
  });

  it("calls onBeforeScroll then onReveal when the target is missing", async () => {
    const order: string[] = [];
    const onReveal = vi.fn((id: string) => order.push(`reveal:${id}`));
    const onBeforeScroll = vi.fn(() => order.push("before"));
    const host = await mount(
      <Page present={["b", "c"]} onReveal={onReveal} onBeforeScroll={onBeforeScroll} />,
    );
    const btn = button(host);
    await act(async () => btn.focus());
    await key(btn, "Enter");
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(order).toEqual(["before", "reveal:a"]);
  });

  it("calls onSelect after the scroll on Enter and Space", async () => {
    const order: string[] = [];
    scrollIntoView.mockImplementation(() => order.push("scroll"));
    const onSelect = vi.fn((id: string) => order.push(`select:${id}`));
    const host = await mount(<Page present={["a", "b", "c"]} onSelect={onSelect} />);
    const btn = button(host);
    await act(async () => btn.focus());
    await key(btn, "ArrowDown");
    await key(btn, "Enter");
    await key(btn, "End");
    await key(btn, " ");
    expect(order).toEqual(["scroll", "select:b", "scroll", "select:c"]);
  });

  it("calls onSelect after the scroll on click", async () => {
    const onSelect = vi.fn();
    const host = await mount(<Page present={["a", "b", "c"]} onSelect={onSelect} />);
    const btn = button(host);
    btn.getBoundingClientRect = () => ({ top: 0, height: 16, left: 0, width: 10, right: 10, bottom: 16, x: 0, y: 0, toJSON() {} });
    await act(async () => {
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, clientY: 16 }));
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("c");
  });

  it("calls onSelect after onReveal when the target is missing", async () => {
    const order: string[] = [];
    const host = await mount(
      <Page
        present={["b", "c"]}
        onBeforeScroll={() => order.push("before")}
        onReveal={(id) => order.push(`reveal:${id}`)}
        onSelect={(id) => order.push(`select:${id}`)}
      />,
    );
    const btn = button(host);
    await act(async () => btn.focus());
    await key(btn, "Enter");
    expect(order).toEqual(["before", "reveal:a", "select:a"]);
  });

  it("re-observes when observeKey changes", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const created = createRoot(host);
    root = created;
    const view = (key: string) => <Page present={["a", "b", "c"]} observeKey={key} />;
    await act(async () => created.render(view("a")));
    const first = observed.length;
    await act(async () => created.render(view("b")));
    expect(observed.length).toBeGreaterThan(first);
  });
});

describe("chat helpers", () => {
  it("builds one tick per user turn with the next assistant reply", () => {
    const ticks = buildChatJumpRailTicks([
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "assistant", content: "hello" },
      { id: "3", role: "user", content: "again" },
      { id: "4", role: "user", content: "alert", isSystemAlert: true },
      { id: "5", role: "user", content: "last" },
      { id: "6", role: "assistant", content: "" },
    ]);
    expect(ticks).toEqual([
      { id: "1", content: "hi", reply: "hello" },
      { id: "3", content: "again" },
      { id: "5", content: "last" },
    ]);
  });

  it("formats and collapses previews, falling back to Message", () => {
    const items = buildChatJumpRailItems(
      [
        { id: "1", content: "@[Ann](u1)\n  hi", reply: "a\n\nb" },
        { id: "2", content: "   " },
      ],
      (text) => text.replace(/@\[(.+?)\]\(.+?\)/g, "@$1"),
    );
    expect(items).toEqual([
      { id: "1", title: "@Ann hi", preview: "a b" },
      { id: "2", title: "Message", preview: null },
    ]);
  });
});

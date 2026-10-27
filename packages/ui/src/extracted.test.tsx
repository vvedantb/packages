// @vitest-environment happy-dom
import { domAnimation, LazyMotion } from "motion/react";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHeldResult } from "../app/src/convex/useHeldResult";
import { useSingleFlight } from "./hooks/use-single-flight";
import { usePersistedScrollParent } from "./hooks/use-persisted-scroll-parent";
import { countLabel, UnreadDot } from "./ui/count-pop";
import { ErrorBoundary } from "./ui/error-boundary";
import { ImageLightbox } from "./ui/image-lightbox";
import { ImageGalleryPreview } from "./ui/media-preview";
import { MarqueeOnHover } from "./ui/marquee-on-hover";
import { RelativeDateTime } from "./ui/relative-date-time";
import { TooltipProvider } from "./ui/tooltip";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(<LazyMotion features={domAnimation}>{node}</LazyMotion>));
  return host;
}

async function rerender(node: ReactNode) {
  await act(async () => root?.render(<LazyMotion features={domAnimation}>{node}</LazyMotion>));
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  sessionStorage.clear();
  root = null;
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("shows the fallback and recovers on retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function Child() {
      if (shouldThrow) throw new Error("boom");
      return <p>fine</p>;
    }
    const host = await mount(
      <ErrorBoundary
        fallback={(retry) => (
          <button type="button" onClick={retry}>
            retry
          </button>
        )}
      >
        <Child />
      </ErrorBoundary>,
    );
    expect(host.textContent).toBe("retry");
    shouldThrow = false;
    await act(async () => host.querySelector("button")?.click());
    expect(host.textContent).toBe("fine");
  });

  it("reports the error to onError", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    function Child(): ReactNode {
      throw new Error("boom");
    }
    await mount(
      <ErrorBoundary onError={onError}>
        <Child />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }), expect.anything());
  });
});

describe("countLabel and UnreadDot", () => {
  it("caps at 99+ and hides zero", () => {
    expect(countLabel(undefined)).toBeNull();
    expect(countLabel(0)).toBeNull();
    expect(countLabel(7)).toBe("7");
    expect(countLabel(140)).toBe("99+");
  });

  it("renders a labelled dot only while unread", async () => {
    const host = await mount(<UnreadDot show />);
    expect(host.querySelector(".bg-primary")?.textContent).toBe("Unread");
    await rerender(<UnreadDot show={false} />);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 400)));
    expect(host.querySelector(".bg-primary")).toBeNull();
  });
});

describe("RelativeDateTime", () => {
  it("renders the compact age, or the empty label", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 2, 5, 12, 0));
    const host = await mount(
      <TooltipProvider>
        <RelativeDateTime at={Date.UTC(2026, 2, 5, 11, 45)} />
        <RelativeDateTime emptyLabel="Queued" />
      </TooltipProvider>,
    );
    const spans = host.querySelectorAll("span");
    expect(spans[0]?.textContent).toBe("15m");
    expect(spans[1]?.textContent).toBe("Queued");
  });
});

describe("MarqueeOnHover", () => {
  it("wraps the text in a clipping host and a moving inner span", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    Object.defineProperty(document, "fonts", {
      value: { ready: Promise.resolve() },
      configurable: true,
    });
    const host = await mount(<MarqueeOnHover className="text-sm">Long title</MarqueeOnHover>);
    const outer = host.querySelector(".mq-host");
    expect(outer?.className).toContain("text-sm");
    expect(outer?.querySelector(".mq-inner")?.textContent).toBe("Long title");
    vi.unstubAllGlobals();
  });
});

describe("ImageGalleryPreview and ImageLightbox", () => {
  const images = Array.from({ length: 6 }, (_, i) => ({ url: `/img/${i}.png` }));

  it("shows four tiles with a +N overlay and opens the lightbox on a tile", async () => {
    const host = await mount(<ImageGalleryPreview images={images} />);
    const tiles = host.querySelectorAll("button");
    expect(tiles).toHaveLength(4);
    expect(tiles[3]?.textContent).toBe("+2");
    await act(async () => tiles[1]?.click());
    expect(document.querySelector('[role="dialog"] img')?.getAttribute("src")).toBe("/img/1.png");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("2 / 6");
  });

  it("wraps with the arrow buttons", async () => {
    const onIndexChange = vi.fn();
    await mount(
      <ImageLightbox images={images} index={0} onIndexChange={onIndexChange} onClose={() => {}} />,
    );
    const prev = document.querySelector('button[aria-label="Previous image"]');
    if (!(prev instanceof HTMLButtonElement)) throw new Error("missing previous");
    await act(async () => prev.click());
    expect(onIndexChange).toHaveBeenCalledWith(5);
  });
});

describe("useSingleFlight", () => {
  it("runs one call at a time and then only the latest queued args", async () => {
    const calls: number[] = [];
    let release: () => void = () => {};
    const fn = (n: number) =>
      new Promise<number>((resolve) => {
        calls.push(n);
        release = () => resolve(n);
      });
    let invoke: (n: number) => Promise<number | undefined> = async () => undefined;
    function Probe() {
      invoke = useSingleFlight(fn);
      return null;
    }
    await mount(<Probe />);
    const first = invoke(1);
    void invoke(2);
    void invoke(3);
    expect(calls).toEqual([1]);
    await act(async () => release());
    expect(await first).toBe(1);
    expect(calls).toEqual([1, 3]);
  });
});

describe("usePersistedScrollParent", () => {
  it("restores the saved scrollTop and saves it on unmount", async () => {
    sessionStorage.setItem("list", "120");
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const box: { el: HTMLDivElement | null } = { el: null };
    function List() {
      const { scrollRef } = usePersistedScrollParent("list");
      return (
        <div
          ref={(el) => {
            box.el = el;
            scrollRef(el);
          }}
        />
      );
    }
    await mount(<List />);
    expect(box.el?.scrollTop).toBe(120);
    if (box.el) box.el.scrollTop = 300;
    await act(async () => root?.unmount());
    root = null;
    expect(sessionStorage.getItem("list")).toBe("300");
    vi.unstubAllGlobals();
  });
});

describe("useHeldResult", () => {
  it("keeps the last result while skipped and drops it for a new key", async () => {
    let shown: string | undefined;
    function Probe({ result, holdKey }: { result: string | undefined; holdKey: string | null }) {
      shown = useHeldResult(result, holdKey);
      return null;
    }
    await mount(<Probe result="a" holdKey="k1" />);
    expect(shown).toBe("a");
    await rerender(<Probe result={undefined} holdKey={null} />);
    expect(shown).toBe("a");
    await rerender(<Probe result={undefined} holdKey="k2" />);
    expect(shown).toBeUndefined();
  });
});

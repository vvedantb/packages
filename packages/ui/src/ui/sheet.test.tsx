// @vitest-environment happy-dom
import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as rootEntry from "../index";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHandle,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHandle,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Side = "top" | "bottom" | "left" | "right";

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
}

async function rerender(node: ReactNode) {
  await act(async () => root?.render(node));
}

async function unmount() {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  for (const name of document.body.getAttributeNames()) document.body.removeAttribute(name);
}

afterEach(async () => {
  await unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as { getAnimations?: unknown }).getAnimations;
});

/** React `useId` values, renumbered in order so two mounts compare equal. */
const REACT_ID = /«r[0-9a-z]+»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g;

function serialise(): string {
  const ids = new Map<string, string>();
  return document.body.innerHTML.replace(REACT_ID, (id) => {
    if (!ids.has(id)) ids.set(id, `«id${ids.size}»`);
    return ids.get(id) as string;
  });
}

function dialog(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[role="dialog"]');
  if (!el) throw new Error("missing sheet content");
  return el;
}

function classes(el: Element): string[] {
  return el.className.split(" ");
}

/** Classes that paint the surface. None may sit on the moving element. */
const SURFACE_PREFIXES = ["bg-", "smooth-shadow", "backdrop-blur", "rounded", "overflow-", "pb-", "pt-", "text-"];

function sheet(props: React.ComponentProps<typeof SheetContent> = {}, side?: Side) {
  return (
    <Sheet open direction={side}>
      <SheetContent {...props}>
        <SheetTitle>Title</SheetTitle>
        <p>Body</p>
      </SheetContent>
    </Sheet>
  );
}

/**
 * happy-dom has `DOMMatrix` and `matchMedia` but no `getAnimations()` and no
 * computed `translate`, `rotate` or `scale`, so the blur stays off there. This
 * fills them in and queues animation frames so a test runs them one by one.
 */
function installMotionApis({ reducedMotion = false } = {}) {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames.delete(id);
  });
  Object.defineProperty(HTMLElement.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
  });

  const realComputed = window.getComputedStyle.bind(window);
  vi.stubGlobal("getComputedStyle", (el: Element, pseudo?: string | null) => {
    const style = realComputed(el, pseudo);
    return new Proxy(style, {
      get(target, key) {
        if (key === "translate" || key === "rotate" || key === "scale") return "none";
        if (key === "transform") return (el as HTMLElement).style?.transform || "none";
        if (key === "transformOrigin") return "0px 0px";
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });

  const realMatchMedia = window.matchMedia.bind(window);
  vi.stubGlobal("matchMedia", (query: string) => {
    if (query !== "(prefers-reduced-motion: reduce)") return realMatchMedia(query);
    return {
      matches: reducedMotion,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    };
  });

  return {
    /** Runs the frames queued so far, as one browser frame would. */
    frame() {
      const queued = [...frames.values()];
      frames.clear();
      for (const callback of queued) callback(performance.now());
    },
    pending: () => frames.size,
  };
}

/** Moves the content one step, as vaul does while dragging or animating. */
async function slide(host: HTMLElement, motion: ReturnType<typeof installMotionApis>) {
  motion.frame(); // At rest: the blur's first frame reads the start transform.
  await act(async () => {
    host.style.transform = "translate3d(0px, 120px, 0px)";
  });
  motion.frame(); // Moved 120px since the last frame.
}

describe("SheetContent motionBlur off", () => {
  it("renders the same DOM with motionBlur={false} as with no prop", async () => {
    await mount(sheet());
    const without = serialise();
    await unmount();

    await mount(sheet({ motionBlur: false }));
    expect(serialise()).toBe(without);
  });

  it("keeps one element as the moving part and the surface", async () => {
    await mount(sheet());
    const content = dialog();
    expect(classes(content)).toEqual(
      expect.arrayContaining([
        "fixed",
        "overflow-y-auto",
        "bg-overlay/95",
        "smooth-shadow-ring-xl",
        "backdrop-blur-xl",
        "rounded-t-2xl",
      ]),
    );
    expect(document.querySelector('[data-slot="sheet-surface"]')).toBeNull();
    // The handle row is still the first child, and the children follow it.
    expect(content.firstElementChild?.className).toContain("min-h-11");
    expect(content.firstElementChild?.querySelector("[data-vaul-handle]")).not.toBeNull();
    // happy-dom does not support `:scope` in querySelector.
    expect(
      [...content.children].find((child) => child.tagName === "H2")?.textContent,
    ).toBe("Title");
  });

  it("puts surfaceClassName on the content after className", async () => {
    await mount(sheet({ className: "p-2", surfaceClassName: "p-0" }));
    expect(classes(dialog())).toContain("p-0");
    expect(classes(dialog())).not.toContain("p-2");
  });
});

describe("SheetContent motionBlur on", () => {
  const layout: Record<Side, string> = {
    bottom: "inset-x-0",
    top: "top-0",
    left: "left-2",
    right: "right-2",
  };
  const corners: Record<Side, string> = {
    bottom: "rounded-t-2xl",
    top: "rounded-b-2xl",
    left: "rounded-2xl",
    right: "rounded-2xl",
  };

  it.each<Side>(["bottom", "top", "left", "right"])(
    "%s: the moving element is transparent and the surface sits inside it",
    async (side) => {
      await mount(sheet({ motionBlur: true }, side));
      const host = dialog();
      expect(classes(host)).toEqual(expect.arrayContaining(["fixed", "z-50", "after:hidden", layout[side]]));
      expect(classes(host).filter((c) => SURFACE_PREFIXES.some((p) => c.startsWith(p)))).toEqual([]);

      // The blur draws into the first child, so it must be the surface.
      expect(host.children).toHaveLength(1);
      const surface = host.firstElementChild as HTMLElement;
      expect(surface.dataset.slot).toBe("sheet-surface");
      expect(classes(surface)).toEqual(
        expect.arrayContaining([
          "flex",
          "min-h-0",
          "flex-auto",
          "flex-col",
          "overflow-y-auto",
          "bg-overlay/95",
          "text-overlay-foreground",
          "smooth-shadow-ring-xl",
          "backdrop-blur-xl",
          corners[side],
        ]),
      );
      expect(surface.querySelector("h2")?.textContent).toBe("Title");
      expect(surface.querySelector("p")?.textContent).toBe("Body");
      expect(Boolean(surface.querySelector("[data-vaul-handle]"))).toBe(side === "bottom" || side === "top");
    },
  );

  it("styles the moving element with className and the surface with surfaceClassName", async () => {
    await mount(sheet({ motionBlur: true, className: "w-96", surfaceClassName: "p-0 bg-surface" }));
    const host = dialog();
    const surface = host.firstElementChild as HTMLElement;
    expect(classes(host)).toContain("w-96");
    expect(classes(host)).not.toContain("bg-surface");
    expect(classes(surface)).toEqual(expect.arrayContaining(["p-0", "bg-surface"]));
    expect(classes(surface)).not.toContain("bg-overlay/95");
    expect(classes(surface)).not.toContain("w-96");
  });

  it("forwards the ref to the moving element", async () => {
    const ref = createRef<HTMLDivElement>();
    await mount(sheet({ motionBlur: true, ref }));
    expect(ref.current).toBe(dialog());
    await unmount();
    expect(ref.current).toBeNull();
  });

  it("keeps the overlay viewport variables on the moving element", async () => {
    await mount(sheet({ motionBlur: true }));
    expect(dialog().style.getPropertyValue("--overlay-vv-height")).toMatch(/px$/);
  });

  it("draws Echo copies into the moving element and gives them the surface's scroll", async () => {
    const motion = installMotionApis();
    await mount(sheet({ motionBlur: true }));
    const host = dialog();
    const surface = host.firstElementChild as HTMLElement;
    surface.scrollTop = 40;

    await slide(host, motion);
    const copies = [...host.children].slice(1) as HTMLElement[];
    expect(copies.length).toBeGreaterThan(0);
    for (const copy of copies) {
      expect(copy.dataset.slot).toBe("sheet-surface");
      expect(copy.getAttribute("aria-hidden")).toBe("true");
      expect(copy.inert).toBe(true);
      expect(copy.scrollTop).toBe(40);
    }
    expect(surface.style.mixBlendMode).toBe("plus-lighter");

    // Still again: the copies go and the surface is left as it was.
    motion.frame();
    expect(host.children).toHaveLength(1);
    expect(surface.style.transform).toBe("");

    await unmount();
    expect(motion.pending()).toBe(0);
  });

  it("draws nothing under prefers-reduced-motion", async () => {
    const motion = installMotionApis({ reducedMotion: true });
    await mount(sheet({ motionBlur: true }));
    const host = dialog();
    await slide(host, motion);
    expect(host.children).toHaveLength(1);
    expect((host.firstElementChild as HTMLElement).style.transform).toBe("");
  });

  it("stays off without the Web Animations API and still renders", async () => {
    // Plain happy-dom: no `getAnimations()` and no computed `translate`.
    await mount(sheet({ motionBlur: true }));
    const host = dialog();
    await act(async () => {
      host.style.transform = "translate3d(0px, 120px, 0px)";
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(host.children).toHaveLength(1);
    expect((host.firstElementChild as HTMLElement).dataset.slot).toBe("sheet-surface");
  });

  it("can be turned off on an open sheet", async () => {
    const motion = installMotionApis();
    await mount(sheet({ motionBlur: true }));
    await rerender(sheet({ motionBlur: false }));
    const content = dialog();
    expect(document.querySelector('[data-slot="sheet-surface"]')).toBeNull();
    expect(classes(content)).toContain("bg-overlay/95");

    await slide(content, motion);
    // No Echo copies on the content: only the handle row, title and body.
    expect(
      [...content.children].filter(
        (child) => child.getAttribute("aria-hidden") === "true" && (child as HTMLElement).inert,
      ),
    ).toHaveLength(0);
  });
});

describe("Drawer names", () => {
  it("are the Sheet parts", () => {
    const pairs: [unknown, unknown][] = [
      [Drawer, Sheet],
      [DrawerPortal, SheetPortal],
      [DrawerOverlay, SheetOverlay],
      [DrawerTrigger, SheetTrigger],
      [DrawerClose, SheetClose],
      [DrawerContent, SheetContent],
      [DrawerHandle, SheetHandle],
      [DrawerTitle, SheetTitle],
      [DrawerDescription, SheetDescription],
      [DrawerHeader, SheetHeader],
      [DrawerFooter, SheetFooter],
    ];
    for (const [drawer, sheetPart] of pairs) expect(drawer).toBe(sheetPart);
    expect(rootEntry.Drawer).toBe(Sheet);
    expect(rootEntry.DrawerContent).toBe(SheetContent);
  });

  it("DrawerContent takes motionBlur", async () => {
    await mount(
      <Drawer open direction="right">
        <DrawerContent motionBlur>
          <DrawerTitle>Title</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const host = dialog();
    expect(classes(host)).toContain("right-2");
    expect((host.firstElementChild as HTMLElement).dataset.slot).toBe("sheet-surface");
  });
});

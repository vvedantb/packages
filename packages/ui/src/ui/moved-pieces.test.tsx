// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LazyMotion, domAnimation } from "motion/react";
import { IconTrash, IconArchive } from "@tabler/icons-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ViewTransitionSuspense } from "../motion/panel-transition";
import { BulkActionBar } from "./bulk-action-bar";
import { CopyLinkMenuItem } from "./copy-link-menu-item";
import { UnreadCornerBadge } from "./count-pop";
import { ToggleSearch } from "./toggle-search";
import { TooltipProvider } from "./tooltip";
import { MotionProvider } from "../motion/motion-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

async function mount(node: ReactNode): Promise<HTMLDivElement> {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<LazyMotion features={domAnimation}>{node}</LazyMotion>));
  return host;
}

function buttonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes(text));
}

describe("BulkActionBar", () => {
  const base = {
    isSelecting: true,
    totalCount: 5,
    onExitSelect: () => {},
    onSelectAll: () => {},
    onClearSelection: () => {},
    barKey: "bar",
  };

  it("disables actions until something is selected", async () => {
    const onArchive = vi.fn();
    await mount(
      <BulkActionBar
        {...base}
        selectedCount={0}
        primaryActions={[{ key: "a", label: "Archive", icon: IconArchive, onClick: onArchive }]}
        destructiveAction={{ key: "d", label: "Delete", icon: IconTrash, destructive: true, onClick: () => {} }}
      />,
    );
    expect(document.querySelector<HTMLButtonElement>('[aria-label="Archive"]')?.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('[aria-label="Delete"]')?.disabled).toBe(true);
    expect(buttonByText("Select all (5)")).toBeDefined();
  });

  it("runs the action and offers Clear once everything is selected", async () => {
    const onArchive = vi.fn();
    const onClear = vi.fn();
    await mount(
      <BulkActionBar
        {...base}
        selectedCount={5}
        onClearSelection={onClear}
        primaryActions={[{ key: "a", label: "Archive", icon: IconArchive, onClick: onArchive }]}
      />,
    );
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Archive"]')?.click());
    expect(onArchive).toHaveBeenCalledTimes(1);
    await act(async () => buttonByText("Clear")?.click());
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when not selecting", async () => {
    const host = await mount(
      <BulkActionBar {...base} isSelecting={false} selectedCount={0} primaryActions={[]} />,
    );
    expect(host.textContent).toBe("");
  });
});

describe("CopyLinkMenuItem", () => {
  it("copies the path resolved against the origin", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await mount(
      <DropdownMenu open>
        <DropdownMenuTrigger>open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <CopyLinkMenuItem path="/sessions/42" />
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
      el.textContent?.includes("Copy link"),
    );
    await act(async () => item?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(writeText).toHaveBeenCalledWith(new URL("/sessions/42", window.location.origin).href);
  });
});

describe("ViewTransitionSuspense", () => {
  it("renders its children once they are ready", async () => {
    const host = await mount(
      <ViewTransitionSuspense fallback={<p>loading</p>}>
        <p>ready</p>
      </ViewTransitionSuspense>,
    );
    expect(host.textContent).toBe("ready");
  });
});

describe("UnreadCornerBadge", () => {
  it("shows 99+ above 99", async () => {
    const host = await mount(<UnreadCornerBadge count={120} />);
    expect(host.textContent).toBe("99+");
  });

  it("shows nothing for zero", async () => {
    const host = await mount(<UnreadCornerBadge count={0} />);
    expect(host.textContent).toBe("");
  });
});

describe("ToggleSearch", () => {
  it("compact clears on Escape", async () => {
    const onChange = vi.fn();
    await mount(<ToggleSearch value="abc" onChange={onChange} />);
    const input = document.querySelector("input");
    await act(async () => input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("large marks an applied query on the button", async () => {
    // Apps render one TooltipProvider at the root; the component relies on it.
    await mount(
      <TooltipProvider>
        <ToggleSearch value="abc" onChange={() => {}} variant="large" />
      </TooltipProvider>,
    );
    expect(document.querySelector('[aria-label="Search, filter applied"]')).not.toBeNull();
    expect(document.querySelector("input")).toBeNull();
  });

  it("renders nothing when not visible", async () => {
    const host = await mount(<ToggleSearch value="" onChange={() => {}} visible={false} />);
    expect(host.textContent).toBe("");
  });
});

describe("MotionProvider", () => {
  it("renders its children", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<MotionProvider><p>ok</p></MotionProvider>));
    expect(host.textContent).toBe("ok");
  });
});

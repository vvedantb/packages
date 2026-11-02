// @vitest-environment happy-dom
// `SonnerToaster` with no `position` and without a `UiConfigProvider`: the
// rendered toaster and toast DOM is pinned. From 0.31.1 the package defaults to
// `top-right`, so the snapshot keeps `data-y-position="top"` and
// `data-x-position="right"` with no `position` prop.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { toast } from "sonner";
import { SonnerToaster } from "./sonner";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

describe("SonnerToaster DOM", () => {
  it("renders the toaster and a toast", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const created = createRoot(host);
    root = created;
    await act(async () => created.render(<SonnerToaster theme="light" />));
    expect(host.innerHTML).toMatchSnapshot();
    await act(async () => {
      toast("Saved", { id: "t1", description: "All changes stored" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(host.innerHTML).toMatchSnapshot();
  });

  it("puts the default action and cancel classes on the rendered buttons", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const created = createRoot(host);
    root = created;
    await act(async () => created.render(<SonnerToaster theme="light" />));
    await act(async () => {
      toast("Update available", {
        id: "t2",
        action: { label: "Refresh", onClick: () => {} },
        cancel: { label: "Later", onClick: () => {} },
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const action = host.querySelector<HTMLButtonElement>("[data-action]");
    const cancel = host.querySelector<HTMLButtonElement>("[data-cancel]");
    expect(action?.textContent).toBe("Refresh");
    expect(cancel?.textContent).toBe("Later");
    for (const button of [action!, cancel!]) {
      for (const cls of ["h-7", "shrink-0", "rounded-control", "px-2.5", "text-xs"]) {
        expect(button.classList.contains(cls), cls).toBe(true);
      }
      expect(button.classList.contains("py-1")).toBe(false);
    }
  });
});

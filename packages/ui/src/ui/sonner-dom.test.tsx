// @vitest-environment happy-dom
// `SonnerToaster` as every app mounts it (`position="top-right"`), without a
// `UiConfigProvider`: the rendered toaster and toast DOM is pinned.
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
    await act(async () => created.render(<SonnerToaster position="top-right" theme="light" />));
    expect(host.innerHTML).toMatchSnapshot();
    await act(async () => {
      toast("Saved", { id: "t1", description: "All changes stored" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(host.innerHTML).toMatchSnapshot();
  });
});

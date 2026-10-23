// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ClearInput } from "./clear-input";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

describe("ClearInput", () => {
  it("renders the dissolve layers inside the static clip, not on .t-clear", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const created = createRoot(host);
    root = created;
    await act(async () =>
      created.render(<ClearInput value="" onChange={() => {}} placeholder="Search" />),
    );
    const wrap = host.querySelector(".t-clear");
    const clip = host.querySelector(".t-clear-clip");
    expect(clip?.parentElement).toBe(wrap);
    expect(clip?.getAttribute("aria-hidden")).toBe("true");
    for (const layer of [".t-clear-mirror", ".t-clear-placeholder", ".t-clear-glow"]) {
      expect(host.querySelector(layer)?.parentElement).toBe(clip);
    }
    const input = host.querySelector("input");
    expect(input?.parentElement).toBe(wrap);
    expect(input?.getAttribute("placeholder")).toBe("Search");
  });
});

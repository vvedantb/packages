// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readDocumentAppearance,
  subscribeDocumentAppearance,
} from "./use-document-appearance";

const root = document.documentElement;

/** MutationObserver callbacks run after the current task. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  root.className = "";
  root.removeAttribute("data-theme");
});

describe("readDocumentAppearance", () => {
  it("is light with no marker", () => {
    expect(readDocumentAppearance()).toBe("light");
  });

  it("is dark with the dark class, including neutral", () => {
    root.className = "dark neutral";
    expect(readDocumentAppearance()).toBe("dark");
  });

  it("is dark with data-theme", () => {
    root.setAttribute("data-theme", "dark");
    expect(readDocumentAppearance()).toBe("dark");
  });
});

describe("subscribeDocumentAppearance", () => {
  it("notifies on a class change and stops after unsubscribe", async () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeDocumentAppearance(onChange);
    root.classList.add("dark");
    await flush();
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    root.classList.remove("dark");
    await flush();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

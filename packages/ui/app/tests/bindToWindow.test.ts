// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { getAltHeld, createAltHeldStore, bindToWindow } from "../src/confirm/useAltHeld.js";

function keyEvent(type: "keydown" | "keyup", init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init });
}

describe("bindToWindow", () => {
  let unsubscribe: (() => void) | null = null;
  afterEach(() => {
    unsubscribe?.();
    unsubscribe = null;
    document.body.replaceChildren();
  });

  function mount() {
    const store = createAltHeldStore(bindToWindow);
    unsubscribe = store.subscribe(() => {});
    return store;
  }

  it("prevents default on a bare Alt keydown inside a menu", () => {
    mount();
    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    const item = document.createElement("button");
    menu.append(item);
    document.body.append(menu);
    const event = keyEvent("keydown", { key: "Alt", altKey: true });
    item.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("also matches data-radix-menu-content", () => {
    mount();
    const menu = document.createElement("div");
    menu.setAttribute("data-radix-menu-content", "");
    document.body.append(menu);
    const event = keyEvent("keydown", { key: "Alt", altKey: true });
    menu.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves a bare Alt keydown outside a menu alone", () => {
    const store = mount();
    const event = keyEvent("keydown", { key: "Alt", altKey: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(store.getSnapshot()).toBe(true);
  });

  it("does not prevent default for other keys inside a menu", () => {
    mount();
    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    document.body.append(menu);
    const event = keyEvent("keydown", { key: "a", altKey: true });
    menu.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("clears on window blur and on tab hide", () => {
    const store = mount();
    document.body.dispatchEvent(keyEvent("keydown", { key: "Alt", altKey: true }));
    expect(store.getSnapshot()).toBe(true);
    window.dispatchEvent(new Event("blur"));
    expect(store.getSnapshot()).toBe(false);

    document.body.dispatchEvent(keyEvent("keydown", { key: "Alt", altKey: true }));
    expect(store.getSnapshot()).toBe(true);
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    expect(store.getSnapshot()).toBe(false);
  });

  it("exposes the module store's current value via getAltHeld", () => {
    expect(getAltHeld()).toBe(false);
  });
});

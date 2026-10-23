// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { readCssEase, readCssNumber } from "./clearInputDissolve";

const root = document.documentElement;

afterEach(() => {
  root.removeAttribute("style");
});

describe("clearInputDissolve CSS reads", () => {
  it("reads ms, minified seconds, px and plain numbers", () => {
    root.style.setProperty("--a", "400ms");
    root.style.setProperty("--b", "1s");
    root.style.setProperty("--c", ".4s");
    root.style.setProperty("--d", "12px");
    root.style.setProperty("--e", ".85");
    expect(readCssNumber(root, "--a", 0)).toBe(400);
    expect(readCssNumber(root, "--b", 0)).toBe(1000);
    expect(readCssNumber(root, "--c", 0)).toBe(400);
    expect(readCssNumber(root, "--d", 0)).toBe(12);
    expect(readCssNumber(root, "--e", 0)).toBe(0.85);
    expect(readCssNumber(root, "--unset", 7)).toBe(7);
  });

  it("parses cubic-bezier with or without spaces", () => {
    for (const value of ["cubic-bezier(0.22,1,0.36,1)", "cubic-bezier(.22, 1, .36, 1)"]) {
      root.style.setProperty("--ease", value);
      const ease = readCssEase(root, "--ease");
      expect(ease(0.5)).toBeGreaterThan(0.8);
    }
    root.style.setProperty("--ease", "ease");
    expect(readCssEase(root, "--ease")(0.5)).toBe(0.5);
  });
});

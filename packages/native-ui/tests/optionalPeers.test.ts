import Module from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { glassMode } from "../src/blur";

// `expo-blur` and `expo-haptics` are not installed in this repository, so the
// loaders hit the missing-peer path for real. The present-peer cases hand
// `require` a stub through Node's module loader.

const platform = vi.hoisted(() => ({ OS: "ios" }));
vi.mock("react-native", () => ({ Platform: platform }));

type Load = (this: unknown, request: string, ...rest: unknown[]) => unknown;
const nodeModule = Module as unknown as { _load: Load };
const realLoad = nodeModule._load;

function providePeer(name: string, exports: unknown) {
  nodeModule._load = function (request, ...rest) {
    return request === name ? exports : realLoad.call(this, request, ...rest);
  };
}

afterEach(() => {
  nodeModule._load = realLoad;
  platform.OS = "ios";
  vi.resetModules();
});

describe("glassMode", () => {
  const on = { blur: true, reduceTransparency: false, hasBlurView: true };

  it("blurs on iOS and Android when expo-blur is present", () => {
    expect(glassMode({ ...on, os: "ios" })).toBe("blur");
    expect(glassMode({ ...on, os: "android" })).toBe("blur");
  });

  it("is solid without expo-blur, with blur off or with Reduce Transparency", () => {
    for (const os of ["ios", "android"]) {
      expect(glassMode({ ...on, os, hasBlurView: false }), os).toBe("solid");
      expect(glassMode({ ...on, os, blur: false }), os).toBe("solid");
      expect(glassMode({ ...on, os, reduceTransparency: true }), os).toBe("solid");
    }
  });

  it("keeps the CSS backdrop on web, with or without expo-blur", () => {
    expect(glassMode({ ...on, os: "web" })).toBe("backdrop");
    expect(glassMode({ ...on, os: "web", hasBlurView: false })).toBe("backdrop");
    expect(glassMode({ ...on, os: "web", blur: false })).toBe("solid");
  });
});

describe("expo-blur loader", () => {
  it("returns null when expo-blur is not installed", async () => {
    const { loadBlur } = await import("../src/blur");
    expect(loadBlur()).toBeNull();
    expect(loadBlur()).toBeNull();
  });

  it("returns expo-blur when it is installed", async () => {
    const expoBlur = { BlurView: () => null, BlurTargetView: () => null };
    providePeer("expo-blur", expoBlur);
    const { loadBlur } = await import("../src/blur");
    expect(loadBlur()).toBe(expoBlur);
  });
});

describe("selection haptic", () => {
  it("is a no-op when expo-haptics is not installed", async () => {
    const { loadHaptics, selectionHaptic } = await import("../src/haptics");
    for (const os of ["ios", "android", "web"]) {
      platform.OS = os;
      expect(() => selectionHaptic(), os).not.toThrow();
    }
    expect(loadHaptics()).toBeNull();
  });

  it("calls selectionAsync on iOS and Android when expo-haptics is installed", async () => {
    const selectionAsync = vi.fn(() => Promise.resolve());
    providePeer("expo-haptics", { selectionAsync });
    const { selectionHaptic } = await import("../src/haptics");
    platform.OS = "ios";
    selectionHaptic();
    platform.OS = "android";
    selectionHaptic();
    expect(selectionAsync).toHaveBeenCalledTimes(2);
  });

  it("stays silent on web", async () => {
    const selectionAsync = vi.fn(() => Promise.resolve());
    providePeer("expo-haptics", { selectionAsync });
    const { selectionHaptic } = await import("../src/haptics");
    platform.OS = "web";
    selectionHaptic();
    expect(selectionAsync).not.toHaveBeenCalled();
  });
});

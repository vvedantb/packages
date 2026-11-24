import Module from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { glassMode } from "../src/blur";
import { tokens } from "../src/tokens";

// `expo-blur`, `expo-haptics` and `expo-linear-gradient` are not installed in
// this repository, so the loaders hit the missing-peer path for real. The
// present-peer cases hand `require` a stub through Node's module loader.

const platform = vi.hoisted(() => ({ OS: "ios" }));
const scheme = vi.hoisted(() => ({ colorScheme: "light" }));
vi.mock("react-native", () => ({
  Platform: platform,
  View: "View",
  StyleSheet: { absoluteFill: { position: "absolute" }, absoluteFillObject: { position: "absolute" } },
}));
// `AmbientBackground` is the only part here that reads the colour scheme. Mock
// the hook (as `tabBar.test.ts` mocks its sibling hooks), so the test needs
// neither React nor nativewind and the scheme follows `scheme.colorScheme`.
vi.mock("../src/useScheme", () => ({
  useScheme: () => (scheme.colorScheme === "dark" ? "dark" : "light"),
}));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));

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
  scheme.colorScheme = "light";
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

describe("expo-linear-gradient loader", () => {
  it("returns null when expo-linear-gradient is not installed", async () => {
    const { loadLinearGradient } = await import("../src/gradient");
    expect(loadLinearGradient()).toBeNull();
    expect(loadLinearGradient()).toBeNull();
  });

  it("returns expo-linear-gradient when it is installed", async () => {
    const expoLinearGradient = { LinearGradient: () => null };
    providePeer("expo-linear-gradient", expoLinearGradient);
    const { loadLinearGradient } = await import("../src/gradient");
    expect(loadLinearGradient()).toBe(expoLinearGradient);
  });
});

describe("AmbientBackground", () => {
  // The first child is the backdrop: the flat background layer.
  async function backdrop() {
    const { AmbientBackground } = await import("../src/AmbientBackground");
    return AmbientBackground({ children: "content" }).props.children[0];
  }

  it("draws a flat background token, even when expo-linear-gradient is installed", async () => {
    const light = await backdrop();
    expect(light.type).toBe("View");
    expect(light.props.style.backgroundColor).toBe(tokens.color.background.light);
    expect(light.props.pointerEvents).toBe("none");
    scheme.colorScheme = "dark";
    expect((await backdrop()).props.style.backgroundColor).toBe(tokens.color.background.dark);
  });
});

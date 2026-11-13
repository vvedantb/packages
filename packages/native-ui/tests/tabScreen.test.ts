import { describe, expect, it, vi } from "vitest";

// Both pieces run as plain functions here, outside a renderer. `useScheme`
// reads the nativewind scheme and the theme version context; `TabScreen` reads
// `useIsFocused` and hands it to the blur target. The real exports are called.

const scheme = vi.hoisted(() => ({ colorScheme: "light" }));
const focus = vi.hoisted(() => ({ value: true }));

vi.mock("nativewind", () => ({ useColorScheme: () => scheme }));
// `useScheme` reads `ThemeVersionContext`; outside a renderer `useContext`
// gives its default, 0. The rest of react (createContext, the jsx runtime) is real.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useContext: () => 0,
}));
vi.mock("expo-router", () => ({ useIsFocused: () => focus.value }));
// Keep the blur target a sentinel, so the returned element shows what TabScreen wired.
vi.mock("../src/glassBlur", () => ({ GlassBlurTarget: "GlassBlurTarget" }));

import { useScheme } from "../src/useScheme";
import { TabScreen } from "../src/router/TabScreen";

describe("useScheme", () => {
  it("returns the nativewind scheme as a light or dark key", () => {
    scheme.colorScheme = "light";
    expect(useScheme()).toBe("light");
    scheme.colorScheme = "dark";
    expect(useScheme()).toBe("dark");
  });

  it("treats any non-dark scheme as light", () => {
    scheme.colorScheme = "unspecified";
    expect(useScheme()).toBe("light");
  });
});

describe("TabScreen", () => {
  it("makes the focused tab the active blur target and keeps its children", () => {
    focus.value = true;
    const element = TabScreen({ children: "body" });
    expect(element.type).toBe("GlassBlurTarget");
    expect(element.props.active).toBe(true);
    expect(element.props.children).toBe("body");
  });

  it("deactivates the blur target while the tab is not focused", () => {
    focus.value = false;
    expect(TabScreen({ children: "body" }).props.active).toBe(false);
  });
});

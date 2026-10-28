import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tokens } from "../src/tokens";

// `ThemeToggle`, the sun / moon header button. The checks call it, and the
// `HeaderIconButton` it returns, with React Native, NativeWind and the Tabler
// icons stubbed, and read the element trees they return.

const scheme = vi.hoisted(() => ({ colorScheme: "light" as "light" | "dark" | undefined }));
const larger = vi.hoisted(() => ({ value: false }));
const setColorScheme = vi.hoisted(() => vi.fn());
vi.mock("react-native", () => ({ TouchableOpacity: "TouchableOpacity" }));
vi.mock("nativewind", () => ({
  useColorScheme: () => ({ colorScheme: scheme.colorScheme, setColorScheme, toggleColorScheme: vi.fn() }),
}));
vi.mock("@tabler/icons-react-native", () => ({ IconMoon: "IconMoon", IconSun: "IconSun" }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, "src", file), "utf8");

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

afterEach(() => {
  scheme.colorScheme = "light";
  larger.value = false;
  setColorScheme.mockClear();
});

async function toggle(props: { testID?: string } = {}) {
  const { ThemeToggle } = await import("../src/ThemeToggle");
  const { HeaderIconButton } = await import("../src/HeaderIconButton");
  const element = ThemeToggle(props) as Element;
  expect(element.type).toBe(HeaderIconButton);
  const button = HeaderIconButton(element.props as Parameters<typeof HeaderIconButton>[0]) as Element;
  return { element, button, icon: element.props.children as Element };
}

describe("ThemeToggle", () => {
  it("in light mode shows a moon, says it switches to dark, and sets dark", async () => {
    const { button, icon } = await toggle();
    expect(button.type).toBe("TouchableOpacity");
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.accessibilityLabel).toBe("Switch to dark mode");
    expect(icon.type).toBe("IconMoon");
    expect(icon.props).toEqual({ size: 22, color: tokens.color.foreground.light });
    (button.props.onPress as () => void)();
    expect(setColorScheme).toHaveBeenCalledExactlyOnceWith("dark");
  });

  it("in dark mode shows a sun, says it switches to light, and sets light", async () => {
    scheme.colorScheme = "dark";
    const { button, icon } = await toggle();
    expect(button.props.accessibilityLabel).toBe("Switch to light mode");
    expect(icon.type).toBe("IconSun");
    expect(icon.props).toEqual({ size: 22, color: tokens.color.foreground.dark });
    (button.props.onPress as () => void)();
    expect(setColorScheme).toHaveBeenCalledExactlyOnceWith("light");
  });

  it("treats an unset scheme as light, as useScheme does", async () => {
    scheme.colorScheme = undefined;
    const { button, icon } = await toggle();
    expect(button.props.accessibilityLabel).toBe("Switch to dark mode");
    expect(icon.type).toBe("IconMoon");
    (button.props.onPress as () => void)();
    expect(setColorScheme).toHaveBeenCalledExactlyOnceWith("dark");
  });

  it("passes testID to the button, and is the larger HeaderIconButton with a larger icon with larger text", async () => {
    expect((await toggle({ testID: "theme" })).button.props.testID).toBe("theme");
    expect((await toggle()).button.props.testID).toBeUndefined();
    expect((await toggle()).button.props.className).toMatch(/^h-12 w-12 /);
    larger.value = true;
    const { button, icon } = await toggle();
    expect(button.props.className).toMatch(/^h-14 w-14 /);
    expect(icon.props.size).toBe(26);
  });

  it("is built on HeaderIconButton and NativeWind's setColorScheme, with no storage of its own (source contract)", () => {
    const source = read("ThemeToggle.tsx");
    expect(source).toMatch(/import \{ HeaderIconButton \} from "\.\/HeaderIconButton";/);
    expect(source).toMatch(/import \{ useColorScheme \} from "nativewind";/);
    expect(source).toMatch(/onPress=\{\(\) => setColorScheme\(next\)\}/);
    expect(source).not.toMatch(/from "react-native"|AsyncStorage|localStorage|SecureStore/);
  });

  it("is a header action in the gallery's Page title section", () => {
    const gallery = read("examples/ParityGallery.tsx");
    const section = gallery.slice(gallery.indexOf('<Section title="Page title">'), gallery.indexOf('<Section title="Brand">'));
    expect(section).toMatch(/<PageHeader title="Settings" safeTop=\{false\} className="px-0" action=\{<ThemeToggle \/>\} \/>/);
  });
});

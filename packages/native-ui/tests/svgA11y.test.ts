import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_NAMES } from "../src/brand/svg";
import { selectItemA11yProps } from "../src/selectA11y";
import { svgA11yProps } from "../src/svgA11y";

// On Expo web `react-native-svg` renders `Svg` as a DOM `<svg>` and passes its
// props through. React Native Web maps `accessible`, `accessibility*` and
// `testID` on `View` and `Text` only, so on an `Svg` React logs each one as an
// unknown DOM prop. The `Select` options are DOM nodes on web too: the Radix
// `Select.Item`. These checks call `svgA11yProps` and `selectItemA11yProps`,
// render the brand icons and `Select` with React Native, the SVG peer and the
// select primitives stubbed on web, iOS and Android, and read every `Svg`,
// icon and web DOM tag in `src/`.

const platform = vi.hoisted(() => ({ OS: "web" }));
vi.mock("react-native", () => ({ Platform: platform }));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "G", Path: "Path", Rect: "Rect" }));
// Parts run as plain functions here, outside a renderer: `useScheme` reads the
// theme version context (`ThemeVersionContext`), so `useContext` gives its default, 0.
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), useContext: () => 0 }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/theme", () => ({ useLargerText: () => false }));
vi.mock("../src/primitives/select", () => ({
  NativeSelectScrollView: "NativeSelectScrollView",
  Select: "PrimitiveSelect",
  SelectContent: "SelectContent",
  SelectGroup: "SelectGroup",
  SelectItem: "SelectItem",
  SelectTrigger: "SelectTrigger",
  SelectValue: "SelectValue",
}));

/** Props that React Native Web maps on `View` and `Text` but not on `Svg`. */
const NATIVE_ONLY = /^(?:accessible|accessibility[A-Z]\w*|importantForAccessibility|testID)$/;

/** Props a DOM `<svg>` takes: the attributes the brand icons set, ARIA and `data-*`. */
const WEB_SAFE = /^(?:width|height|viewBox|preserveAspectRatio|style|children|role|aria-[a-z]+|data-[a-z-]+)$/;

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

const OSES = ["web", "ios", "android"];

/** Keys whose value is `undefined`. React still reads them as props. */
const undefinedKeys = (props: object) =>
  Object.entries(props)
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);

afterEach(() => {
  platform.OS = "web";
});

describe("svgA11yProps", () => {
  it("gives web an image role and ARIA name with a title, and data-testid", () => {
    expect(svgA11yProps({ title: "vibot", testID: "mark" }, "web")).toEqual({
      role: "img",
      "aria-label": "vibot",
      "data-testid": "mark",
    });
  });

  it("hides the web svg from assistive tech without a title", () => {
    expect(svgA11yProps({ testID: "mark" }, "web")).toEqual({ "aria-hidden": true, "data-testid": "mark" });
    expect(svgA11yProps({ title: "" }, "web")).toStrictEqual({ "aria-hidden": true });
  });

  it.each(OSES)("returns no key set to undefined on %s", (os) => {
    for (const props of [{}, { title: "vibot" }, { testID: "mark" }, { title: "vibot", testID: "mark" }, { title: "" }]) {
      const out = svgA11yProps(props, os);
      expect(undefinedKeys(out), JSON.stringify(props)).toEqual([]);
      if (!("testID" in props)) {
        expect(Object.keys(out), JSON.stringify(props)).not.toContain("testID");
        expect(Object.keys(out), JSON.stringify(props)).not.toContain("data-testid");
      }
    }
  });

  it("gives web no prop that React Native Web leaves unmapped on Svg", () => {
    for (const props of [{}, { title: "vibot" }, { testID: "mark" }, { title: "vibot", testID: "mark" }]) {
      for (const key of Object.keys(svgA11yProps(props, "web"))) {
        expect(key, JSON.stringify(props)).not.toMatch(NATIVE_ONLY);
        expect(key, JSON.stringify(props)).toMatch(WEB_SAFE);
      }
    }
  });

  it.each(["ios", "android"])("keeps the native image and hidden props on %s", (os) => {
    expect(svgA11yProps({ title: "vibot", testID: "mark" }, os)).toEqual({
      accessible: true,
      accessibilityRole: "image",
      accessibilityLabel: "vibot",
      testID: "mark",
    });
    expect(svgA11yProps({ testID: "mark" }, os)).toEqual({
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
      testID: "mark",
    });
    expect(svgA11yProps({}, os)).toStrictEqual({
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    });
  });
});

describe("selectItemA11yProps", () => {
  it("gives web aria-label and data-testid, with no key set to undefined", () => {
    expect(selectItemA11yProps({ label: "Pink", testID: "colour-pink" }, "web")).toStrictEqual({
      "aria-label": "Pink",
      "data-testid": "colour-pink",
    });
    expect(selectItemA11yProps({ label: "Pink" }, "web")).toStrictEqual({ "aria-label": "Pink" });
  });

  it.each(["ios", "android"])("keeps accessibilityLabel and testID on %s", (os) => {
    expect(selectItemA11yProps({ label: "Pink", testID: "colour-pink" }, os)).toStrictEqual({
      accessibilityLabel: "Pink",
      testID: "colour-pink",
    });
    expect(selectItemA11yProps({ label: "Pink" }, os)).toStrictEqual({ accessibilityLabel: "Pink" });
  });

  it("gives web no prop that React DOM does not know", () => {
    for (const props of [{ label: "Pink" }, { label: "Pink", testID: "colour-pink" }]) {
      for (const key of Object.keys(selectItemA11yProps(props, "web"))) {
        expect(key, JSON.stringify(props)).not.toMatch(NATIVE_ONLY);
        expect(key, JSON.stringify(props)).toMatch(/^(?:aria-[a-z]+|data-[a-z-]+)$/);
      }
    }
  });
});

describe("Select option props", () => {
  /** The `SelectItem` elements `Select` renders for a value and a `null` option. */
  async function items(testID?: string): Promise<Element[]> {
    const { Select } = await import("../src/Select");
    const options = [
      { label: "Pink", value: "pink" },
      { label: "None", value: null },
    ];
    const tree = Select({ value: "pink", onValueChange: () => {}, options, testID }) as unknown as Element;
    const out: Element[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object" || !("props" in node)) return;
      const element = node as Element;
      if (element.type === "SelectItem") out.push(element);
      walk(element.props.children);
    };
    walk(tree);
    return out;
  }

  it("gives each web option aria-label and data-testid, not the native props", async () => {
    platform.OS = "web";
    const [pink, none] = await items("colour");
    expect(pink?.props).toStrictEqual({ "aria-label": "Pink", "data-testid": "colour-pink", label: "Pink", value: "pink" });
    expect(none?.props).toStrictEqual({ "aria-label": "None", "data-testid": "colour-null", label: "None", value: "__null__" });
    for (const item of await items()) {
      expect(Object.keys(item.props).filter((key) => NATIVE_ONLY.test(key))).toEqual([]);
      expect(undefinedKeys(item.props)).toEqual([]);
      expect(item.props).not.toHaveProperty(["data-testid"]);
    }
  });

  it.each(["ios", "android"])("keeps accessibilityLabel and testID on each %s option", async (os) => {
    platform.OS = os;
    const [pink, none] = await items("colour");
    expect(pink?.props).toStrictEqual({ accessibilityLabel: "Pink", testID: "colour-pink", label: "Pink", value: "pink" });
    expect(none?.props).toStrictEqual({ accessibilityLabel: "None", testID: "colour-null", label: "None", value: "__null__" });
    const [plain] = await items();
    expect(plain?.props).toStrictEqual({ accessibilityLabel: "Pink", label: "Pink", value: "pink" });
  });
});

describe("brand Svg props", () => {
  /** The `Svg` each brand component draws, with and without a title and test id. */
  async function svgs(): Promise<[string, Element][]> {
    const { APP_ICONS } = await import("../src/brand/AppIcons");
    const { AppMark } = await import("../src/brand/AppMark");
    const { GoogleMark } = await import("../src/brand/GoogleMark");
    const out: [string, Element][] = [];
    for (const extra of [{}, { title: "Vibot", testID: "brand" }]) {
      const label = extra.title ? "titled" : "decorative";
      out.push([`GoogleMark ${label}`, GoogleMark({ ...extra }) as unknown as Element]);
      for (const app of APP_NAMES) {
        out.push([`APP_ICONS.${app} ${label}`, APP_ICONS[app]({ ...extra }) as unknown as Element]);
        for (const variant of ["tile", "tile-light"] as const) {
          out.push([`AppMark ${variant} ${app} ${label}`, AppMark({ app, variant, ...extra }) as unknown as Element]);
        }
        // The plain mark is an `APP_ICONS` element; call it for its `Svg`.
        const mark = AppMark({ app, ...extra }) as unknown as Element;
        const Icon = mark.type as (props: Record<string, unknown>) => Element;
        out.push([`AppMark mark ${app} ${label}`, Icon(mark.props)]);
      }
    }
    return out;
  }

  it("renders an Svg root for every icon and mark", async () => {
    const all = await svgs();
    expect(all).toHaveLength((APP_NAMES.length * 4 + 1) * 2);
    for (const [name, svg] of all) expect(svg.type, name).toBe("Svg");
  });

  it("puts only DOM-safe props on the web Svg", async () => {
    platform.OS = "web";
    for (const [name, svg] of await svgs()) {
      for (const key of Object.keys(svg.props)) {
        expect(key, name).not.toMatch(NATIVE_ONLY);
        expect(key, name).toMatch(WEB_SAFE);
      }
      if (name.endsWith("titled")) {
        expect(svg.props, name).toMatchObject({ role: "img", "aria-label": "Vibot", "data-testid": "brand" });
        expect(svg.props, name).not.toHaveProperty("aria-hidden");
      } else {
        expect(svg.props["aria-hidden"], name).toBe(true);
        expect(svg.props, name).not.toHaveProperty("role");
        expect(svg.props, name).not.toHaveProperty("aria-label");
      }
    }
  });

  it.each(["ios", "android"])("keeps the native a11y props and testID on %s", async (os) => {
    platform.OS = os;
    for (const [name, svg] of await svgs()) {
      expect(Object.keys(svg.props).filter((key) => /^(?:role|aria-|data-)/.test(key)), name).toEqual([]);
      if (name.endsWith("titled")) {
        expect(svg.props, name).toMatchObject({
          accessible: true,
          accessibilityRole: "image",
          accessibilityLabel: "Vibot",
          testID: "brand",
        });
      } else {
        expect(svg.props, name).toMatchObject({
          accessible: false,
          accessibilityElementsHidden: true,
          importantForAccessibility: "no-hide-descendants",
        });
        expect(svg.props.accessibilityLabel, name).toBeUndefined();
      }
    }
  });

  it("draws GoogleMark as the four-colour G, 18 by default", async () => {
    const { GoogleMark } = await import("../src/brand/GoogleMark");
    const svg = GoogleMark({}) as unknown as Element;
    expect(svg.props).toMatchObject({ width: 18, height: 18, viewBox: "0 0 24 24" });
    expect((GoogleMark({ size: 24 }) as unknown as Element).props).toMatchObject({ width: 24, height: 24 });
    const paths = svg.props.children as Element[];
    expect(paths.map((path) => path.type)).toEqual(["Path", "Path", "Path", "Path"]);
    expect(paths.map((path) => path.props.fill)).toEqual(["#4285F4", "#34A853", "#FBBC05", "#EA4335"]);
    for (const path of paths) expect(path.props.d).toMatch(/^M[\d.]+ [\d.]+.*z$/);
  });
});

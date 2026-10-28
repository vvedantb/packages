import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");

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
    const out: [string, Element][] = [];
    for (const extra of [{}, { title: "Vibot", testID: "brand" }]) {
      const label = extra.title ? "titled" : "decorative";
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
    expect(all).toHaveLength(APP_NAMES.length * 4 * 2);
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
});

describe("Svg and icon tags in src", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? files(join(dir, entry.name))
        : /\.tsx?$/.test(entry.name)
          ? [join(dir, entry.name)]
          : [],
    );

  /** Source without block and line comments. */
  const code = (file: string) =>
    readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

  /** Local names of the default and named value imports from `pkg`, without `type` imports. */
  const importedNames = (source: string, pkg: string) =>
    [...source.matchAll(new RegExp(`import\\s+(?!type\\s)(?:(\\w+)\\s*,?\\s*)?(?:\\{([^}]*)\\})?\\s*from\\s*"${pkg}"`, "g"))].flatMap(
      ([, base, named = ""]) => [
        ...(base ? [base] : []),
        ...named
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part && !part.startsWith("type "))
          .map((part) => part.split(/\s+as\s+/).pop()!),
      ],
    );

  const ICON_PACKAGES = ["@tabler/icons-react-native", "lucide-react-native"];

  /**
   * Icon components a file takes as a prop and renders: `icon: Icon`,
   * `leftIcon: Icon`, `icon: IconComponent` and `as: Component`, in files that
   * import from a Tabler or Lucide package.
   */
  const iconPropNames = (source: string) =>
    ICON_PACKAGES.some((pkg) => source.includes(`from "${pkg}"`))
      ? [...source.matchAll(/\b(?:\w*[iI]con|as):\s*([A-Z]\w*)\s*(?:=\s*\w+\s*)?[,}]/g)].map(([, name]) => name!)
      : [];

  /** Names whose rendered tag is a DOM `<svg>` (or its children) on web. */
  const svgNames = (source: string) => ({
    svg: importedNames(source, "react-native-svg"),
    icons: [...ICON_PACKAGES.flatMap((pkg) => importedNames(source, pkg)), ...iconPropNames(source)],
  });

  /**
   * Each opening tag of `name`, with every `{…}` expression emptied to `{}`, so
   * a name inside an expression (`svgA11yProps({ title, testID }, …)`) is not
   * read as a prop.
   */
  const openingTags = (source: string, name: string) =>
    [...source.matchAll(new RegExp(`<${name}(?![\\w.])`, "g"))].map((match) => {
      let tag = "";
      let depth = 0;
      let quoted = false;
      for (let i = match.index; i < source.length; i++) {
        const char = source[i]!;
        if (depth === 0 && char === '"') quoted = !quoted;
        if (!quoted && char === "{") depth++;
        if (depth === 0) tag += char;
        if (!quoted && char === "}" && --depth === 0) tag += "{}";
        if (depth === 0 && !quoted && char === ">") break;
      }
      return tag;
    });

  /** Prop names on a tag: names before `=`, `/`, `>` or a space at the top level. */
  const propNames = (tag: string) =>
    [...tag.replace(/"[^"]*"/g, '""').matchAll(/\s([A-Za-z][\w-]*)(?==|\s|\/?>)/g)].map(([, name]) => name!);

  const read = (file: string) => code(join(src, file));

  it("puts no native-only a11y prop or testID on a react-native-svg, Tabler or Lucide tag in src", () => {
    const offenders: string[] = [];
    for (const file of files(src)) {
      const source = code(file);
      const { svg, icons } = svgNames(source);
      for (const name of [...svg, ...icons]) {
        for (const tag of openingTags(source, name)) {
          const bad = propNames(tag).filter((prop) => NATIVE_ONLY.test(prop));
          if (bad.length) offenders.push(`${relative(root, file)}: <${name}> ${bad.join(", ")}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("imports nothing from lucide-react-native in src", () => {
    // A Lucide icon always sets `testID` on its `Svg` (`Icon.mjs`), even when
    // it is undefined, so on web React logs it as an unknown DOM prop.
    const offenders = files(src)
      .filter((file) => /from\s*"lucide-react-native"/.test(code(file)))
      .map((file) => relative(root, file));
    expect(offenders).toEqual([]);
  });

  /**
   * Tags that are a Radix DOM node on web, not a React Native view, by file.
   * `@rn-primitives/select` passes their props to it through a `Slot`.
   */
  const WEB_DOM_TAGS: Record<string, string[]> = {
    "Select.tsx": ["SelectItem"],
    "primitives/select.tsx": [
      "SelectPrimitive.Item",
      "SelectPrimitive.Viewport",
      "SelectPrimitive.ScrollUpButton",
      "SelectPrimitive.ScrollDownButton",
    ],
  };

  it("puts no native-only a11y prop or testID on a tag that is a Radix DOM node on web", () => {
    const offenders: string[] = [];
    for (const [file, names] of Object.entries(WEB_DOM_TAGS)) {
      for (const name of names) {
        const tags = openingTags(read(file), name.replace(".", "\\."));
        expect(tags, `${file}: <${name}>`).toHaveLength(1);
        const bad = propNames(tags[0]!).filter((prop) => NATIVE_ONLY.test(prop));
        if (bad.length) offenders.push(`${file}: <${name}> ${bad.join(", ")}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("gives the Select options their name and test id through selectItemA11yProps only", () => {
    const source = read("Select.tsx");
    const [tag] = openingTags(source, "SelectItem");
    expect(source).toMatch(/\{\.\.\.selectItemA11yProps\(\{ label: option\.label, testID: optionId \}, Platform\.OS\)\}/);
    expect(propNames(tag!)).toEqual(["key", "label", "value"]);
  });

  it("leaves the Select trigger a React Native Pressable on web", () => {
    // Without `asChild`, the web `Trigger` renders its own `Pressable`, which
    // React Native Web maps, so `Select` may give it the native props.
    const [tag] = openingTags(read("primitives/select.tsx"), "SelectPrimitive\\.Trigger");
    expect(propNames(tag!)).toEqual(["ref", "disabled", "className"]);
  });

  it("finds the tags it checks", () => {
    expect(svgNames(read("brand/AppIcons.tsx")).svg).toEqual(["Svg", "G", "Path"]);
    expect(svgNames(read("brand/AppMark.tsx")).svg).toEqual(["Svg", "G", "Path", "Rect"]);
    expect(svgNames(read("Toast.tsx")).svg).toEqual(["Svg", "Path"]);
    expect(svgNames(read("Checkbox.tsx")).icons).toEqual(["IconCheck", "IconMinus"]);
    expect(svgNames(read("SearchInput.tsx")).icons).toEqual(["IconSearch", "IconX"]);
    expect(svgNames(read("EmptyState.tsx")).icons).toEqual(["IconInbox", "Icon", "IconComponent"]);
    expect(svgNames(read("Card.tsx")).icons).toEqual(["Icon"]);
    expect(svgNames(read("ListRow.tsx")).icons).toEqual(["Icon"]);
    expect(svgNames(read("primitives/select.tsx")).icons).toEqual(["IconCheck", "IconChevronDown", "IconChevronUp"]);
    expect(svgNames(read("primitives/icon.tsx")).icons).toEqual(["Component"]);
    for (const file of ["brand/AppIcons.tsx", "brand/AppMark.tsx", "Toast.tsx"]) {
      expect(openingTags(read(file), "Svg"), file).toHaveLength(1);
    }
  });

  it("reads props at the top level of a tag only", () => {
    const tag = '<Svg width={size} {...svgA11yProps({ title, testID }, Platform.OS)} label="a testID=" accessible>';
    expect(openingTags(tag, "Svg")).toEqual(['<Svg width={} {} label="a testID=" accessible>']);
    expect(propNames(openingTags(tag, "Svg")[0]!)).toEqual(["width", "label", "accessible"]);
    expect(propNames('<Svg testID="x" accessibilityLabel={title} />')).toEqual(["testID", "accessibilityLabel"]);
  });

  it("gives the brand Svg its a11y and test id through svgA11yProps only", () => {
    for (const file of ["brand/AppIcons.tsx", "brand/AppMark.tsx"]) {
      const [tag] = openingTags(read(file), "Svg");
      expect(read(file), file).toMatch(/\{\.\.\.svgA11yProps\(\{ title, testID \}, Platform\.OS\)\}/);
      expect(propNames(tag!), file).toEqual(["width", "height", "viewBox", "preserveAspectRatio", "style"]);
    }
  });

  it("leaves the toast Svg decorative, with size and viewBox only", () => {
    const [tag] = openingTags(read("Toast.tsx"), "Svg");
    expect(propNames(tag!)).toEqual(["width", "height", "viewBox"]);
  });
});

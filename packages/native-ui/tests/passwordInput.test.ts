import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_TOUCH_TARGET, fieldStyle, fieldTextStyle, touchSlop, typeStyle } from "../src/controlStyles";
import { tokens } from "../src/tokens";

// `PasswordInput` (0.11.0). The behaviour checks call the component's render
// function with React Native, NativeWind and the Tabler icons stubbed, and read
// the element tree it returns. `useState` is a small store so a press can be
// followed by a second render.

const larger = vi.hoisted(() => ({ value: false }));
const store = vi.hoisted(() => ({ slots: [] as unknown[], index: 0 }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = <T,>(initial: T) => {
    const slot = store.index++;
    if (!(slot in store.slots)) store.slots[slot] = initial;
    const set = (next: T | ((current: T) => T)) => {
      store.slots[slot] = typeof next === "function" ? (next as (current: T) => T)(store.slots[slot] as T) : next;
    };
    return [store.slots[slot] as T, set] as const;
  };
  return { ...actual, useState, default: { ...actual, useState } };
});
vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default },
  View: "View",
  Pressable: "Pressable",
  TextInput: "TextInput",
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("@tabler/icons-react-native", () => ({ IconEye: "IconEye", IconEyeOff: "IconEyeOff" }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");
const source = read("src/PasswordInput.tsx");

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

/** Every element in a tree that a render function returned (not rendered further). */
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : ((style as Record<string, unknown>) ?? {});

type Props = Record<string, unknown>;

async function render(props: Props = {}, ref: unknown = null) {
  const { PasswordInput } = await import("../src/PasswordInput");
  const { Input } = await import("../src/Input");
  store.index = 0;
  const tree = (PasswordInput as unknown as { render(props: Props, ref: unknown): unknown }).render(props, ref);
  const all = elements(tree);
  return {
    input: all.find((element) => element.type === Input),
    wrapper: all.find((element) => element.type === "View"),
    toggle: all.find((element) => element.type === "Pressable"),
    icon: all.find((element) => element.type === "IconEye" || element.type === "IconEyeOff"),
  };
}

beforeEach(() => {
  larger.value = false;
  store.slots = [];
  store.index = 0;
});

describe("PasswordInput (behaviour)", () => {
  it("hides the password at first, with the show label and the eye icon", async () => {
    const { input, toggle, icon } = await render();
    expect(input!.props.secureTextEntry).toBe(true);
    expect(toggle!.props).toMatchObject({ accessibilityRole: "button", accessibilityLabel: "Show password" });
    expect(icon!.type).toBe("IconEye");
    expect(icon!.props).toEqual({ size: 18, color: tokens.color.muted.light, strokeWidth: 1.75 });
  });

  it("shows the text on press, then hides it again, with matching labels and icons", async () => {
    let view = await render();
    (view.toggle!.props.onPress as () => void)();
    view = await render();
    expect(view.input!.props.secureTextEntry).toBe(false);
    expect(view.toggle!.props.accessibilityLabel).toBe("Hide password");
    expect(view.icon!.type).toBe("IconEyeOff");
    (view.toggle!.props.onPress as () => void)();
    view = await render();
    expect(view.input!.props.secureTextEntry).toBe(true);
    expect(view.toggle!.props.accessibilityLabel).toBe("Show password");
    expect(view.icon!.type).toBe("IconEye");
  });

  it("owns secureTextEntry: a caller value cannot fight the toggle", async () => {
    const { input } = await render({ secureTextEntry: false });
    expect(input!.props.secureTextEntry).toBe(true);
    expect(source).toMatch(/Omit<React\.ComponentPropsWithoutRef<typeof Input>, "secureTextEntry">/);
  });

  it("keeps one Input in the tree and never sets a key, so a toggle does not remount it", async () => {
    const before = await render();
    (before.toggle!.props.onPress as () => void)();
    const after = await render();
    expect(after.input!.type).toBe(before.input!.type);
    expect(source).not.toMatch(/\bkey=/);
  });

  it("names the toggle after the testID, with a default", async () => {
    expect((await render({ testID: "sign-in-password" })).toggle!.props.testID).toBe("sign-in-password-toggle");
    expect((await render()).toggle!.props.testID).toBe("password-input-toggle");
  });

  it("passes testID, labels, autofill hints and the ref to the field", async () => {
    const ref = { current: null };
    const { input } = await render(
      {
        testID: "pw",
        accessibilityLabel: "Password",
        autoComplete: "new-password",
        textContentType: "newPassword",
        placeholder: "Password",
      },
      ref,
    );
    expect(input!.props).toMatchObject({
      testID: "pw",
      accessibilityLabel: "Password",
      autoComplete: "new-password",
      textContentType: "newPassword",
      placeholder: "Password",
    });
    expect(input!.props.ref).toBe(ref);
  });

  it("reaches a 44 touch target with the hit slop", async () => {
    const { toggle } = await render();
    expect(flatten(toggle!.props.style)).toMatchObject({ width: 24, height: 24 });
    expect(toggle!.props.hitSlop).toEqual(touchSlop(24));
    const slop = toggle!.props.hitSlop as { top: number; left: number };
    expect(24 + slop.top * 2).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(24 + slop.left * 2).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it("reaches 44 with larger text too", async () => {
    larger.value = true;
    const { toggle } = await render();
    expect(flatten(toggle!.props.style)).toMatchObject({ width: 32, height: 32 });
    const slop = toggle!.props.hitSlop as { top: number; left: number };
    expect(32 + slop.top * 2).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(32 + slop.left * 2).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it("reserves room for the toggle, ahead of a caller style", async () => {
    const { input } = await render({ style: { color: "red" } });
    expect(flatten(input!.props.style)).toMatchObject({ paddingRight: 44, color: "red" });
    larger.value = true;
    expect(flatten((await render()).input!.props.style).paddingRight).toBe(56);
  });

  it("gives the field the same size and font classes as Input", async () => {
    const { input } = await render({ className: "mt-2" });
    const classes = String(input!.props.className).split(/\s+/);
    for (const token of ["min-h-11", "border", "px-3.5", "py-2", "text-base", "font-instrument-sans", "mt-2"]) {
      expect(classes).toContain(token);
    }
    expect(classes).not.toContain("text-xl");
    expect(read("src/Input.tsx")).toContain("min-h-11 border px-3.5 py-2 text-base font-instrument-sans");
  });

  it("adds the larger-text classes and type style with larger text", async () => {
    larger.value = true;
    const { input } = await render();
    const classes = String(input!.props.className).split(/\s+/);
    for (const token of ["min-h-16", "px-4", "py-4", "text-xl", "font-instrument-sans-medium"]) {
      expect(classes).toContain(token);
    }
    const style = flatten(input!.props.style);
    expect(style).toMatchObject(typeStyle("medium"));
    expect(style).not.toHaveProperty("fontSize");
    expect(style).not.toHaveProperty("lineHeight");
  });

  it("uses the Input field colours and radius and the toggle padding, with no style font size", async () => {
    const { input } = await render();
    expect(flatten(input!.props.style)).toMatchObject({
      ...fieldStyle("light"),
      ...fieldTextStyle("light"),
      paddingRight: 44,
    });
    expect(flatten(input!.props.style)).not.toHaveProperty("fontSize");
    expect(flatten(input!.props.style)).not.toHaveProperty("lineHeight");
  });

  it("inherits type from the className, as Input does: no sizeStyle or fontSize in either style array", () => {
    const code = (text: string) => text.replace(/\/\/.*$/gm, "");
    expect(code(source)).not.toMatch(/sizeStyle|fontSize\s*:/);
    const input = code(read("src/Input.tsx"));
    expect(input).not.toMatch(/sizeStyle/);
    expect(input.match(/style=\{\[[\s\S]*?\]\}/)?.[0]).not.toMatch(/fontSize/);
  });

  it("wraps the field in a relative, full-width View", async () => {
    const { wrapper } = await render({ wrapperClassName: "mb-2" });
    expect(String(wrapper!.props.className).split(/\s+/)).toEqual(expect.arrayContaining(["relative", "w-full", "mb-2"]));
  });

  it("hides the toggle when the field is not editable", async () => {
    expect((await render({ editable: false })).toggle).toBeUndefined();
  });
});

describe("PasswordInput (exports and auth screens)", () => {
  it("is exported from the root, primitives and password-input entries", () => {
    for (const file of ["src/index.ts", "src/entries/primitives.ts", "src/entries/password-input.ts"]) {
      const entry = read(file);
      expect(entry, file).toMatch(/export \{ PasswordInput \} from "\.\.?\/(\.\.\/)?PasswordInput"/);
      expect(entry, file).toMatch(/export type \{ PasswordInputProps \}/);
    }
  });

  it("is used by the password, new-password and confirm-password fields of SignInScreen", () => {
    const screen = read("src/auth/SignInScreen.tsx").replace(/\/\/.*$/gm, "");
    expect(screen).not.toMatch(/secureTextEntry/);
    for (const field of ["password", "new-password", "confirm-password"]) {
      expect(screen).toMatch(new RegExp(`<PasswordInput\\s+testID=\\{id\\("${field}"\\)\\}`));
    }
  });
});

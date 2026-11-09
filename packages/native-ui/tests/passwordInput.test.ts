import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_TOUCH_TARGET, touchSlop } from "../src/controlStyles";
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

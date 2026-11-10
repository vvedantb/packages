import { afterEach, describe, expect, it, vi } from "vitest";
import { tokens } from "../src/tokens";

// `Button` `shape` (0.6.0): a pill by default, as the web `Button` from
// @vvedantb/ui 0.31.0, with `shape="rounded"` for the radius before 0.6.0.
// The checks call `Button` and the composites that render it, with React
// Native, NativeWind, the primitives and the dialog parts stubbed, and read the
// element trees they return.

const scheme = vi.hoisted(() => ({ colorScheme: "light" as "light" | "dark" }));
const larger = vi.hoisted(() => ({ value: false }));
const layout = vi.hoisted(() => ({ value: { compact: false, stacked: false } }));
const setOpen = vi.hoisted(() => vi.fn());

vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default },
  StyleSheet: { create: <T>(styles: T) => styles, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
  KeyboardAvoidingView: "KeyboardAvoidingView",
}));
vi.mock("nativewind", () => ({ useColorScheme: () => scheme }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("@expo/vector-icons", () => ({ MaterialIcons: "MaterialIcons" }));
vi.mock("@tabler/icons-react-native", () => ({
  IconArrowUp: "IconArrowUp",
  IconPlayerStopFilled: "IconPlayerStopFilled",
}));
vi.mock("../src/primitives/button", () => ({ Button: "PrimitiveButton" }));
vi.mock("../src/primitives/text", () => ({ Text: "PrimitiveText" }));
vi.mock("../src/primitives/input", () => ({ Input: "FieldInput" }));
vi.mock("../src/primitives/overlay", () => ({ useOverlay: () => ({ setOpen }) }));
vi.mock("../src/Dialog", () => ({
  Dialog: "Dialog",
  DialogContent: "DialogContent",
  DialogDescription: "DialogDescription",
  DialogFooter: "DialogFooter",
  DialogHeader: "DialogHeader",
  DialogTitle: "DialogTitle",
  DialogTrigger: "DialogTrigger",
}));
vi.mock("../src/dialogLayout", () => ({ useDialogLayout: () => layout.value }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };
type ButtonProps = import("../src/Button").ButtonProps;

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : ((style as Record<string, unknown>) ?? {});

const SIZES = ["small", "medium", "large", "sm", "default", "lg", "icon"] as const;
const VARIANTS = ["primary", "default", "secondary", "outline", "destructive", "ghost", "link", "tinted"] as const;

async function paint(props: ButtonProps) {
  const { Button } = await import("../src/Button");
  const element = Button(props) as unknown as Element;
  expect(element.type).toBe("PrimitiveButton");
  return element;
}

const radius = (element: Element, state = { pressed: false }) => {
  const style = element.props.style;
  return flatten(typeof style === "function" ? style(state) : style).borderRadius;
};

afterEach(() => {
  scheme.colorScheme = "light";
  larger.value = false;
  layout.value = { compact: false, stacked: false };
  setOpen.mockClear();
});

describe("Button shape", () => {
  it("is a pill by default for every variant and size, with and without larger text", async () => {
    for (const largerText of [false, true]) {
      larger.value = largerText;
      for (const size of SIZES) {
        for (const variant of VARIANTS) {
          const button = await paint({ children: "Go", size, variant });
          expect(radius(button), `${largerText} ${size} ${variant}`).toBe(tokens.radius.pill);
          expect(button.props.shape, `${size} ${variant}`).toBe("pill");
        }
      }
    }
  });

  it("draws the icon size as a circle: radius at least half the side", async () => {
    for (const largerText of [false, true]) {
      larger.value = largerText;
      const button = await paint({ size: "icon", accessibilityLabel: "Copy" });
      const side = largerText ? 56 : 40;
      expect(String(button.props.className)).toContain(`h-${side / 4} w-${side / 4}`);
      expect(radius(button) as number).toBeGreaterThanOrEqual(side / 2);
    }
  });

  it('shape="rounded" keeps radius 16 (web rounded-lg) at every size, the look before 0.6.0', async () => {
    for (const largerText of [false, true]) {
      larger.value = largerText;
      for (const size of SIZES) {
        for (const variant of VARIANTS) {
          const button = await paint({ children: "Go", size, variant, shape: "rounded" });
          expect(radius(button), `${largerText} ${size} ${variant}`).toBe(16);
          expect(button.props.shape).toBe("rounded");
        }
      }
    }
    expect(tokens.radius.lg).toBe(16);
  });

  it("changes only the radius: every other prop is the same for both shapes", async () => {
    for (const size of SIZES) {
      const { style: pillStyle, shape: pillShape, ...pill } = (await paint({ children: "Go", size })).props;
      const { style: roundedStyle, shape: roundedShape, ...rounded } = (
        await paint({ children: "Go", size, shape: "rounded" })
      ).props;
      expect(rounded, size).toEqual(pill);
      expect([pillShape, roundedShape]).toEqual(["pill", "rounded"]);
      const { borderRadius: a, ...pillRest } = flatten(pillStyle);
      const { borderRadius: b, ...roundedRest } = flatten(roundedStyle);
      expect(roundedRest, size).toEqual(pillRest);
      expect([a, b]).toEqual([tokens.radius.pill, 16]);
    }
  });

  it("lets a caller style radius win over either shape, as an object or a function", async () => {
    for (const shape of [undefined, "pill", "rounded"] as const) {
      expect(radius(await paint({ children: "Go", shape, style: { borderRadius: 4 } })), shape).toBe(4);
      const pressable = await paint({
        children: "Go",
        shape,
        style: ({ pressed }) => ({ borderRadius: pressed ? 2 : 6 }),
      });
      expect(radius(pressable, { pressed: true }), shape).toBe(2);
      expect(radius(pressable, { pressed: false }), shape).toBe(6);
    }
  });

  it("keeps the shape in the stacked footer of a compact dialog, full width and 44 high", async () => {
    layout.value = { compact: true, stacked: true };
    const pill = await paint({ children: "Delete", fullWidth: false });
    expect(String(pill.props.className)).toMatch(/\bw-full\b/);
    expect(String(pill.props.className)).toMatch(/\bmin-h-11\b/);
    expect(radius(pill)).toBe(tokens.radius.pill);
    expect(radius(await paint({ children: "Delete", fullWidth: false, shape: "rounded" }))).toBe(16);
  });
});

describe("Button shape in composites", () => {
  it("AlertDialogAction and AlertDialogCancel are pills, as the web footer buttons; shape passes through", async () => {
    const { Button } = await import("../src/Button");
    const { AlertDialogAction, AlertDialogCancel } = await import("../src/AlertDialog");
    for (const Part of [AlertDialogAction, AlertDialogCancel]) {
      const element = Part({ children: "OK" }) as unknown as Element;
      expect(element.type).toBe(Button);
      expect(element.props.shape).toBeUndefined();
      expect(radius(Button(element.props as ButtonProps) as unknown as Element)).toBe(tokens.radius.pill);
      const rounded = Part({ children: "OK", shape: "rounded" }) as unknown as Element;
      expect(rounded.props.shape).toBe("rounded");
      expect(radius(Button(rounded.props as ButtonProps) as unknown as Element)).toBe(16);
    }
  });

  it("ChatIconButton is round from the pill default at 32 and 44, and takes shape", async () => {
    const { Button } = await import("../src/Button");
    const { ChatIconButton } = await import("../src/ai/icon-button");
    const icon = "IconCopy" as unknown as Parameters<typeof ChatIconButton>[0]["icon"];
    for (const largerText of [false, true]) {
      larger.value = largerText;
      const element = ChatIconButton({ icon, label: "Copy" }) as unknown as Element;
      expect(element.type).toBe(Button);
      expect(element.props.style).toBeUndefined();
      expect(element.props.shape).toBeUndefined();
      expect(element.props.className).toBe(largerText ? "h-11 w-11" : "h-8 w-8");
      const button = Button(element.props as ButtonProps) as unknown as Element;
      expect(radius(button) as number).toBeGreaterThanOrEqual((largerText ? 44 : 32) / 2);
      const rounded = ChatIconButton({ icon, label: "Copy", shape: "rounded" }) as unknown as Element;
      expect(radius(Button(rounded.props as ButtonProps) as unknown as Element)).toBe(16);
      const own = ChatIconButton({ icon, label: "Copy", style: { borderRadius: 8 } }) as unknown as Element;
      expect(radius(Button(own.props as ButtonProps) as unknown as Element)).toBe(8);
    }
  });
});

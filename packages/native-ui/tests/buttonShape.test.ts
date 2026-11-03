import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, "src", file), "utf8");
const readWeb = (file: string) => readFileSync(join(root, "..", "ui", file), "utf8");

/** Source without comments, so a comment can name a prop the code must not pass. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

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

  it("the composer send, stop and tool buttons stay pills (the web rounded-lg 16 is a circle at 32)", async () => {
    const { ChatIconButton } = await import("../src/ai/icon-button");
    const { PromptInputSubmit, PromptInputButton } = await import("../src/ai/prompt-input");
    const send = PromptInputSubmit({ onSubmit: () => {} }) as unknown as Element;
    const stop = PromptInputSubmit({ status: "streaming", onStop: () => {} }) as unknown as Element;
    const icon = "IconPlus" as unknown as Parameters<typeof PromptInputButton>[0]["icon"];
    const tool = PromptInputButton({ icon, label: "Attach" }) as unknown as Element;
    for (const element of [send, stop, tool]) {
      expect(element.type).toBe(ChatIconButton);
      expect(element.props.shape).toBeUndefined();
      expect(element.props.style).toBeUndefined();
    }
    // The web keeps `shape="rounded"` on these: `rounded-lg` on the 32 `icon-sm` size.
    const inputGroup = readWeb("src/ui/input-group.tsx");
    expect(inputGroup).toMatch(/"icon-sm": "size-8 rounded-lg p-0/);
    expect(inputGroup).toMatch(/variant=\{variant\}\s+shape="rounded"/);
    expect(tokens.radius.lg).toBe(32 / 2);
  });

  it("PricingModal's CTA is a pill, as the web multi-plan CTA (rounded-full)", () => {
    const pricing = code(read("marketing/PricingModal.tsx"));
    expect(pricing.match(/<Button\b/g)).toHaveLength(1);
    const start = pricing.indexOf("<Button");
    const cta = pricing.slice(start, pricing.indexOf("</Button>", start));
    expect(cta).not.toMatch(/shape=|style=|borderRadius/);
    expect(readWeb("src/marketing/PricingModal.tsx")).toMatch(/className="h-12 w-full rounded-full"/);
  });

  it("checks every file that renders Button: the composites above, ConversationScrollButton and the gallery", () => {
    const files = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" }).filter((file) =>
      /\.tsx?$/.test(file),
    );
    const users = files.filter((file) =>
      [...read(file).matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.{1,2}\/(?:\.\.\/)*(?:Button|index)"/g)].some(
        (match) => match[1]!.split(",").some((name) => /^Button(?:\s+as\s+\w+)?$/.test(name.trim())),
      ),
    );
    expect(users.sort()).toEqual([
      "AlertDialog.tsx",
      "ai/conversation.tsx",
      "ai/icon-button.tsx",
      // 0.7.0 auth screens: the default pill, no shape or radius of their own.
      "auth/GoogleSignInButton.tsx",
      "auth/SignInScreen.tsx",
      "examples/ParityGallery.tsx",
      "marketing/PricingModal.tsx",
    ]);
    for (const file of ["auth/GoogleSignInButton.tsx", "auth/SignInScreen.tsx"]) {
      expect(code(read(file)), file).not.toMatch(/shape=|borderRadius/);
    }
    // `ConversationScrollButton` already sets the pill radius as a style, which wins.
    expect(read("ai/conversation.tsx")).toMatch(/style=\{\{ borderRadius: tokens\.radius\.pill,/);
  });

  it("shows the icon circle and the rounded opt-out in the gallery", () => {
    const gallery = code(read("examples/ParityGallery.tsx"));
    const section = gallery.slice(gallery.indexOf('<Section title="Button">'), gallery.indexOf('<Section title="Badge">'));
    expect(section.match(/<Button\s+size="icon"/g)).toHaveLength(1);
    expect(section.match(/shape="rounded"/g)).toHaveLength(3);
  });
});

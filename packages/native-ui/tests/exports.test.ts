import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The index imports React Native, so it cannot load here. These checks read
// the source instead: every re-export resolves, and the parity names exist.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const index = readFileSync(join(root, "src/index.ts"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function exportedNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const match of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of match[1]!.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name);
    }
  }
  return names;
}

const brandNames = exportedNames(readFileSync(join(root, "src/brand/index.ts"), "utf8"));
const names = new Set([...exportedNames(index), ...brandNames]);

describe("@vvedantb/native-ui exports", () => {
  it("re-exports only from files that exist", () => {
    for (const match of index.matchAll(/from "(\.[^"]+)"/g)) {
      const base = resolve(join(root, "src"), match[1]!);
      const found = [".ts", ".tsx", "/index.ts"].some((ext) => existsSync(base + ext));
      expect(found, match[1]).toBe(true);
    }
  });

  it("has the web parity names", () => {
    const expected = [
      "Button",
      "Input",
      "SearchInput",
      "Textarea",
      "Label",
      "Card",
      "CardHeader",
      "CardTitle",
      "CardDescription",
      "CardContent",
      "CardFooter",
      "Badge",
      "Switch",
      "LabeledSwitchRow",
      "Checkbox",
      "Select",
      "Sheet",
      "SheetContent",
      "SheetHeader",
      "SheetTitle",
      "SheetDescription",
      "SheetFooter",
      "SheetClose",
      "SheetTrigger",
      "Dialog",
      "DialogTrigger",
      "DialogContent",
      "DialogHeader",
      "DialogTitle",
      "DialogDescription",
      "DialogBody",
      "DialogFooter",
      "DialogClose",
      "AlertDialog",
      "AlertDialogTrigger",
      "AlertDialogContent",
      "AlertDialogHeader",
      "AlertDialogTitle",
      "AlertDialogDescription",
      "AlertDialogFooter",
      "AlertDialogAction",
      "AlertDialogCancel",
      "ConfirmDialog",
      "Tabs",
      "TabsList",
      "TabsTrigger",
      "TabsContent",
      "PillTabs",
      "Avatar",
      "AvatarImage",
      "AvatarFallback",
      "Skeleton",
      "Toaster",
      "toast",
      "Separator",
      "Progress",
      "Spinner",
      "CenteredSpinner",
      "StatusDot",
      "EmptyState",
      "ListRow",
      "APP_ICONS",
      "AppMark",
      "AppWordmark",
      "GoogleMark",
      "GoogleMarkProps",
      "IconVibot",
      "IconProjectV",
      "APP_NAMES",
      "APP_MARKS",
      "FAMILY_APPS",
      "familyApp",
      "V_PRO_APP_BENEFITS",
      "UpgradeToProCard",
      "PricingModal",
      "PageTitle",
      "PageHeader",
      "PageTitleProps",
      "PageHeaderProps",
      "ThemeToggle",
      "ThemeToggleProps",
      "tokens",
      "palette",
    ];
    for (const name of expected) expect(names.has(name), name).toBe(true);
  });

  it("keeps every 0.2.1 export", () => {
    const previous = [
      "cn",
      "tokens",
      "NativeUiProvider",
      "useNativeUi",
      "useLargerText",
      "useAccentColor",
      "DEFAULT_ACCENT",
      "FLOATING_INSET",
      "floatingShadow",
      "tabBarReserve",
      "selectionHaptic",
      "useReduceTransparency",
      "FloatingSurface",
      "GlassSheetBackground",
      "LiquidGlass",
      "GlassBlurProvider",
      "GlassBlurTarget",
      "AmbientBackground",
      "FloatingTabBar",
      "FloatingFAB",
      "Chip",
      "HeaderIconButton",
      "CardSkeleton",
      "DateTimeField",
      "BottomSheetContainer",
      "SafeAreaContainer",
      "ScreenContainer",
      "SettingsSection",
      "SettingsField",
      "SettingsToggleRow",
      "SettingsStack",
      "PINK_600",
      "NEUTRAL_500",
      "Colors",
    ];
    for (const name of previous) expect(names.has(name), name).toBe(true);
  });

  it("is 0.5.0 with granular entries, a typecheck script and optional peers", () => {
    expect(pkg.version).toBe("0.5.0");
    const entries = [
      "./tab-bar",
      "./brand",
      "./button",
      "./primitives",
      "./search-input",
      "./page-title",
      "./toast",
      "./theme",
      "./floating",
      "./layout",
      "./marketing",
      "./ambient",
      "./bottom-sheet",
      "./date-time",
      "./ai",
      "./gallery",
      "./ai-gallery",
      "./blur",
      "./haptics",
    ];
    expect(Object.keys(pkg.exports).sort()).toEqual([".", ...entries, "./package.json"].sort());
    for (const entry of entries) {
      expect(existsSync(join(root, pkg.exports[entry].default)), entry).toBe(true);
      expect(pkg.exports[entry].types, entry).toBe(pkg.exports[entry].default);
    }
    expect(pkg.exports["./package.json"]).toBe("./package.json");
    expect(pkg.exports["."].default).toBe("./src/index.ts");
    expect(pkg.scripts.typecheck).toBe("tsc -p tsconfig.typecheck.json");
    for (const peer of ["react-native-svg", "expo-blur", "expo-haptics", "expo-linear-gradient"]) {
      expect(pkg.peerDependencies[peer], peer).toBe("*");
      expect(pkg.peerDependenciesMeta[peer], peer).toEqual({ optional: true });
    }
    expect(pkg.dependencies).toBeUndefined();
  });

  it("has the 0.5.0 Verve, vibot and Velth names", () => {
    const added = [
      "ColorSwatches",
      "ColorSwatchesProps",
      "ColorSwatchesSize",
      "StatGrid",
      "StatGridItem",
      "StatGridProps",
      "SectionLabel",
      "SectionLabelProps",
      "SheetRow",
      "SheetRowProps",
      "PageIndicator",
      "PageIndicatorProps",
      "StackPageHeader",
      "StackPageHeaderProps",
      "IconButton",
      "IconButtonProps",
      "IconButtonSize",
      "IconButtonVariant",
      "CaptureButton",
      "CaptureButtonProps",
      "ListRowProps",
      "CardProps",
      "DateTimeFieldProps",
    ];
    for (const name of added) expect(names.has(name), name).toBe(true);
    // `IconButton` is new and public; the AI chat button keeps its own name, on /ai only.
    expect(names.has("ChatIconButton")).toBe(false);
  });

  it("adds no dependency or peer in 0.5.0", () => {
    expect(pkg.dependencies).toBeUndefined();
    expect(Object.keys(pkg.peerDependencies).sort()).toEqual([
      "@expo/vector-icons",
      "@gorhom/bottom-sheet",
      "@react-native-community/datetimepicker",
      "@rn-primitives/select",
      "@rn-primitives/slot",
      "@rn-primitives/switch",
      "@tabler/icons-react-native",
      "class-variance-authority",
      "clsx",
      "dayjs",
      "expo-blur",
      "expo-haptics",
      "expo-linear-gradient",
      "expo-router",
      "lucide-react-native",
      "nativewind",
      "react",
      "react-native",
      "react-native-reanimated",
      "react-native-safe-area-context",
      "react-native-screens",
      "react-native-svg",
      "tailwind-merge",
    ]);
    expect(Object.keys(pkg.peerDependenciesMeta).sort()).toEqual([
      "@gorhom/bottom-sheet",
      "@react-native-community/datetimepicker",
      "dayjs",
      "expo-blur",
      "expo-haptics",
      "expo-linear-gradient",
      "expo-router",
      "react-native-svg",
    ]);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(["@types/react", "react", "typescript", "vitest"]);
  });

  it("keeps the AI chat parts off the root entry: they are on /ai only", () => {
    expect(index).not.toMatch(/from "\.\/ai"/);
    for (const name of ["Conversation", "Message", "PromptInput", "Reasoning", "AgentTrace", "Suggestion"]) {
      expect(names.has(name), name).toBe(false);
    }
  });
});

describe("overlay behaviour (source contract)", () => {
  const read = (file: string) => readFileSync(join(root, "src", file), "utf8");

  it("closes on Android back and blocks backdrop taps only for alert dialogs", () => {
    const overlay = read("primitives/overlay.tsx");
    expect(overlay).toMatch(/onRequestClose=\{close\}/);
    expect(overlay).toMatch(/disabled=\{!dismissible\}/);
    expect(read("AlertDialog.tsx")).toMatch(/dismissible=\{false\}/);
    expect(read("Dialog.tsx")).toMatch(/dismissible = true/);
  });

  it("marks overlay content as modal for VoiceOver", () => {
    expect(read("Dialog.tsx")).toMatch(/accessibilityViewIsModal/);
    expect(read("Sheet.tsx")).toMatch(/accessibilityViewIsModal/);
  });
});

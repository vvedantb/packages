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
      "PasswordInput",
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
      "IconEva",
      "IconBee",
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
      "configureTheme",
      "DropdownMenu",
      "DropdownMenuTrigger",
      "DropdownMenuContent",
      "DropdownMenuLabel",
      "DropdownMenuItem",
      "DropdownMenuRadioItem",
      "DropdownMenuSeparator",
      "BulkActionBar",
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

  it("is 0.12.1 with granular entries, a typecheck script and optional peers", () => {
    expect(pkg.version).toBe("0.12.1");
    const entries = [
      "./tab-bar",
      "./brand",
      "./button",
      "./primitives",
      "./search-input",
      "./password-input",
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
      "./push",
      "./auth",
      "./markdown",
      "./expo-router",
      "./expo-web-root",
    ];
    expect(Object.keys(pkg.exports).sort()).toEqual([".", ...entries, "./tailwind-preset", "./package.json"].sort());
    for (const entry of entries) {
      expect(existsSync(join(root, pkg.exports[entry].default)), entry).toBe(true);
      expect(pkg.exports[entry].types, entry).toBe(pkg.exports[entry].default);
    }
    expect(pkg.exports["./package.json"]).toBe("./package.json");
    expect(pkg.exports["."].default).toBe("./src/index.ts");
    expect(pkg.scripts.typecheck).toBe("tsc -p tsconfig.typecheck.json && pnpm run typecheck:consumer");
    // The preset is CommonJS for `tailwind.config.js`, with its own declarations.
    expect(pkg.exports["./tailwind-preset"]).toEqual({
      types: "./src/tailwind-preset.d.cts",
      require: "./src/tailwind-preset.cjs",
      default: "./src/tailwind-preset.cjs",
    });
    for (const file of Object.values(pkg.exports["./tailwind-preset"]) as string[]) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
    for (const peer of [
      "react-native-svg",
      "expo-blur",
      "expo-haptics",
      "expo-linear-gradient",
      "@clerk/clerk-expo",
      "convex",
      "expo-auth-session",
      "expo-web-browser",
    ]) {
      expect(pkg.peerDependencies[peer], peer).toBe("*");
      expect(pkg.peerDependenciesMeta[peer], peer).toEqual({ optional: true });
    }
    expect(pkg.dependencies).toBeUndefined();
  });

  it("has the 0.8.0 More from Project V names", () => {
    for (const name of [
      "MoreFromProjectV",
      "MoreFromProjectVProps",
      "FromProjectV",
      "FromProjectVProps",
      "PROJECT_V_MOBILE_APPS",
      "projectVMobileApp",
      "otherProjectVMobileApps",
      "openProjectVApp",
      "projectVAppOpenSteps",
      "VSTORE_HOME_URL",
      "androidIntentUrl",
      "ProjectVMobileApp",
      "ProjectVMobileAppId",
      "ProjectVOpenTarget",
      "ProjectVOpenStep",
      "ProjectVLinking",
    ]) {
      expect(names.has(name), name).toBe(true);
    }
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

  it("exports the 0.6.0 Button shape type", () => {
    expect(names.has("ButtonShape")).toBe(true);
  });

  it("adds no dependency, and only optional peers since 0.7.0 (auth, then markdown, then highlighting)", () => {
    expect(pkg.dependencies).toBeUndefined();
    expect(Object.keys(pkg.peerDependencies).sort()).toEqual([
      "@clerk/clerk-expo",
      "@expo/vector-icons",
      "@gorhom/bottom-sheet",
      "@react-native-community/datetimepicker",
      "@rn-primitives/select",
      "@rn-primitives/slot",
      "@rn-primitives/switch",
      "@tabler/icons-react-native",
      "class-variance-authority",
      "clsx",
      "convex",
      "dayjs",
      "expo-auth-session",
      "expo-blur",
      "expo-constants",
      "expo-device",
      "expo-haptics",
      "expo-linear-gradient",
      "expo-notifications",
      "expo-router",
      "expo-web-browser",
      "lucide-react-native",
      "nativewind",
      "prism-react-renderer",
      "react",
      "react-native",
      "react-native-marked",
      "react-native-reanimated",
      "react-native-safe-area-context",
      "react-native-screens",
      "react-native-svg",
      "tailwind-merge",
    ]);
    expect(Object.keys(pkg.peerDependenciesMeta).sort()).toEqual([
      "@clerk/clerk-expo",
      "@gorhom/bottom-sheet",
      "@react-native-community/datetimepicker",
      "convex",
      "dayjs",
      "expo-auth-session",
      "expo-blur",
      "expo-constants",
      "expo-device",
      "expo-haptics",
      "expo-linear-gradient",
      "expo-notifications",
      "expo-router",
      "expo-web-browser",
      "prism-react-renderer",
      "react-native-marked",
      "react-native-svg",
    ]);
    // No tailwindcss-animate (or Tailwind itself): apps that want it keep it in their config.
    expect(Object.keys(pkg.peerDependencies)).not.toContain("tailwindcss-animate");
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(["@clerk/clerk-expo", "@types/react", "react", "typescript", "vitest"]);
  });

  it("keeps auth, the Expo web root and the Tailwind preset off the root entry", () => {
    expect(index).not.toMatch(/from "\.\/auth"/);
    expect(index).not.toMatch(/ExpoWebRoot|tailwind-preset/);
    for (const name of ["AuthProviders", "SignInScreen", "SignUpScreen", "GoogleSignInButton", "OrDivider", "SecondFactorScreen", "useSecondFactor", "submitTotpSecondFactor", "submitSecondFactor", "prepareSecondFactorIfNeeded", "prepareFirstFactorIfNeeded", "submitFirstFactor", "pickFirstFactorStrategy", "TOTP_MESSAGES", "ExpoWebRoot"]) {
      expect(names.has(name), name).toBe(false);
    }
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

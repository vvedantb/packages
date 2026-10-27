import { expect, test } from "vitest";
import * as artifacts from "./artifacts";
import * as client from "./client";
import * as root from "./index";

// The root exports that @vvedantb/ui/client leaves out, besides the artifact viewers.
const CONVEX_OR_CLERK = [
  "ConvexClerkProvider",
  "createUseStableAuth",
  "resetStableAuthSession",
  "useEnsureUser",
  "useStableAuth",
];

test("client is the root without the artifact viewers and the convex and Clerk helpers", () => {
  const rootOnly = Object.keys(root).filter((name) => !(name in client));
  expect(rootOnly.sort()).toEqual([...Object.keys(artifacts), ...CONVEX_OR_CLERK].sort());
  for (const [name, value] of Object.entries(client)) {
    expect(value, name).toBe(root[name as keyof typeof root]);
  }
});

test("client has the pieces extension pages use", () => {
  for (const name of [
    "Button", "Card", "CardHeader", "Tabs", "TabsList", "TabsTrigger", "TabsContent", "Spinner",
    "Dialog", "DialogContent", "Select", "Input", "Switch", "Tooltip", "SonnerToaster", "toast",
    "AppWordmark", "AppMark", "APP_ICONS", "IconVibot", "IconVmem", "IconVerve",
    "createThemeProvider", "applyThemeClass", "getSystemTheme", "cn", "tokens",
  ]) {
    expect(client, name).toHaveProperty(name);
  }
});

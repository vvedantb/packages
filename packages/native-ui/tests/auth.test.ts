import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// `@vvedantb/native-ui/auth` (0.7.0). Clerk, Convex, Expo Router and the
// browser-session modules are not installed here: they are stubbed, and the
// checks call the components without hooks and read the sources.

const completeAuthSession = vi.hoisted(() => vi.fn());

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  StyleSheet: { hairlineWidth: 1 },
  KeyboardAvoidingView: "KeyboardAvoidingView",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
}));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/Button", () => ({ Button: "Button" }));
vi.mock("../src/Input", () => ({ Input: "Input" }));
vi.mock("../src/brand/GoogleMark", () => ({ GoogleMark: "GoogleMark" }));
vi.mock("expo-router", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("expo-auth-session", () => ({ makeRedirectUri: vi.fn() }));
vi.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: completeAuthSession,
  warmUpAsync: vi.fn(async () => {}),
  coolDownAsync: vi.fn(async () => {}),
}));
vi.mock("@clerk/clerk-expo", () => ({
  ClerkProvider: "ClerkProvider",
  ClerkLoaded: "ClerkLoaded",
  useAuth: function useAuth() {},
  useSignIn: vi.fn(),
  useSignUp: vi.fn(),
  useSSO: vi.fn(),
  isClerkAPIResponseError: (error: unknown) =>
    typeof error === "object" && error !== null && "clerkError" in error,
}));
vi.mock("convex/react", () => ({ ConvexProvider: "ConvexProvider" }));
vi.mock("convex/react-clerk", () => ({ ConvexProviderWithClerk: "ConvexProviderWithClerk" }));

const auth = await import("../src/entries/auth");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const authDir = join(root, "src/auth");
const files = readdirSync(authDir).filter((file) => /\.tsx?$/.test(file));
const read = (file: string) => readFileSync(join(authDir, file), "utf8");
/** Source without comments or import lines. */
const code = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
    .replace(/^import[\s\S]*?;$/gm, "");

/** Text a user can see: string literals and JSX text, without the bot-protection mount id. */
function userStrings(source: string): string[] {
  const body = code(source).replace(/nativeID="[^"]*"/g, "");
  const literals = [...body.matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? "");
  const jsxText = [...body.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g)].map((m) => m[1]!);
  return [...literals, ...jsxText].filter((s) => /[a-z]/i.test(s));
}

type El = ReactElement<{ children?: unknown; [key: string]: unknown }>;

describe("AuthProviders", () => {
  const client = { url: "convex" } as never;
  const token = { getToken: async () => null, saveToken: async () => {} };

  it("nests Clerk, Convex with Clerk and ClerkLoaded", () => {
    const el = auth.AuthProviders({ publishableKey: "pk", tokenCache: token, convex: client, children: "app" }) as El;
    expect(el.type).toBe("ClerkProvider");
    expect(el.props).toMatchObject({ publishableKey: "pk", tokenCache: token });
    const convex = el.props.children as El;
    expect(convex.type).toBe("ConvexProviderWithClerk");
    expect(convex.props.client).toBe(client);
    expect(typeof convex.props.useAuth).toBe("function");
    const loaded = convex.props.children as El;
    expect(loaded.type).toBe("ClerkLoaded");
    expect(loaded.props.children).toBe("app");
  });

  it("passes the app's useAuth on", () => {
    const useAuth = vi.fn() as never;
    const el = auth.AuthProviders({ convex: client, useAuth, children: "app" }) as El;
    expect((el.props.children as El).props.useAuth).toBe(useAuth);
  });

  it("is Clerk only without convex (vmem), and skips ClerkLoaded with loaded={false}", () => {
    const el = auth.AuthProviders({ publishableKey: "pk", children: "app" }) as El;
    expect(el.type).toBe("ClerkProvider");
    expect((el.props.children as El).type).toBe("ClerkLoaded");
    const bare = auth.AuthProviders({ publishableKey: "pk", loaded: false, children: "app" }) as El;
    expect(bare.props.children).toBe("app");
  });

  it("is a plain ConvexProvider with clerk={false}, for UI preview builds", () => {
    const el = auth.AuthProviders({ clerk: false, convex: client, children: "app" }) as El;
    expect(el.type).toBe("ConvexProvider");
    expect(el.props.client).toBe(client);
    const none = auth.AuthProviders({ clerk: false, children: "app" }) as El;
    expect(none.props.children).toBe("app");
  });

  it("does not read env vars or throw about a missing key", () => {
    const source = code(read("AuthProviders.tsx"));
    expect(source).not.toMatch(/process\.env|EXPO_PUBLIC|throw /);
  });
});

describe("authErrorMessage", () => {
  it("shows the API message, or the fallback for anything else", () => {
    const api = { clerkError: true, errors: [{ code: "x", message: "Short", longMessage: "Password is incorrect." }] };
    expect(auth.authErrorMessage(api, "Sign in failed")).toBe("Password is incorrect.");
    expect(auth.authErrorMessage({ clerkError: true, errors: [{ code: "x", message: "Short" }] }, "F")).toBe("Short");
    expect(auth.authErrorMessage(new Error("TypeError: fetch failed"), "Sign in failed")).toBe("Sign in failed");
    expect(auth.authErrorMessage(undefined, "Sign in failed")).toBe("Sign in failed");
  });

  it("never shows a message that names the provider", () => {
    const api = { clerkError: true, errors: [{ code: "x", message: "Clerk: session_exists" }] };
    expect(auth.authErrorMessage(api, "Sign in failed")).toBe("Sign in failed");
  });
});

describe("auth screens (source contract)", () => {
  it("completes the browser auth session once, at module scope", () => {
    expect(completeAuthSession).toHaveBeenCalledTimes(1);
    const calls = files.flatMap((file) => [...read(file).matchAll(/^.*maybeCompleteAuthSession\(\).*$/gm)].map((m) => m[0]));
    expect(calls).toEqual(["WebBrowser.maybeCompleteAuthSession();"]);
  });

  it("starts Google with the app scheme and redirect path, and warms the browser", () => {
    const google = code(read("GoogleSignInButton.tsx"));
    expect(google).toMatch(/strategy: "oauth_google"/);
    expect(google).toMatch(/AuthSession\.makeRedirectUri\(\{ scheme, path: redirectPath \}\)/);
    expect(google).toMatch(/redirectPath = "sso-callback"/);
    expect(google).toMatch(/afterAuthHref = "\/"/);
    expect(google).toMatch(/router\.replace\(afterAuthHref, replaceOptions\)/);
    expect(google).toMatch(/WebBrowser\.warmUpAsync\(\)/);
    expect(google).toMatch(/WebBrowser\.coolDownAsync\(\)/);
    expect(google).toMatch(/label = "Continue with Google"/);
  });

  it("signs up with an emailed code, then starts the session", () => {
    const screen = code(read("SignInScreen.tsx"));
    expect(screen).toMatch(/prepareEmailAddressVerification\(\{ strategy: "email_code" \}\)/);
    expect(screen).toMatch(/attemptEmailAddressVerification\(\{ code \}\)/);
    expect(screen).toMatch(/setActive\(\{ session: result\.createdSessionId \}\)/);
    expect(screen).toMatch(/signIn\.create\(\{ identifier: email, password \}\)/);
    expect(screen).not.toMatch(/forgot/i);
  });

  it("exports SignUpScreen as the sign-up mode", () => {
    expect(code(read("SignInScreen.tsx"))).toMatch(/<SignInScreen \{\.\.\.props\} mode="sign-up" \/>/);
  });

  it("shows generic messages", () => {
    expect(auth.AUTH_MESSAGES).toMatchObject({
      signInFailed: "Sign in failed",
      invalidCredentials: "Invalid email or password",
    });
    expect(auth.GOOGLE_ERROR_MESSAGE).toBe("Could not continue with Google");
    for (const message of [...Object.values(auth.AUTH_MESSAGES), auth.GOOGLE_ERROR_MESSAGE]) {
      expect(message).not.toMatch(/clerk|convex/i);
    }
  });

  it("names no auth provider and no AI model in any user-visible string", () => {
    for (const file of files) {
      const strings = userStrings(read(file));
      if (file.endsWith(".tsx")) expect(strings.length, file).toBeGreaterThan(0);
      for (const text of strings) {
        expect(text, `${file}: ${text}`).not.toMatch(/clerk/i);
        expect(text, `${file}: ${text}`).not.toMatch(/\b(gpt|claude|gemini|llama|openai|anthropic)\b/i);
      }
    }
  });

  it("sees the screen copy and would catch a provider name in it", () => {
    const strings = userStrings(read("SignInScreen.tsx"));
    for (const text of ["Don't have an account?", "Use a different email", "Verification code", "Welcome back"]) {
      expect(strings, text).toContain(text);
    }
    expect(userStrings('<Text>Sign in with Clerk</Text>; toast.error("Clerk failed")')).toEqual([
      "Clerk failed",
      "Sign in with Clerk",
    ]);
  });

  it("shows no raw exception message", () => {
    for (const file of files) expect(code(read(file)), file).not.toMatch(/error\.message|caught\.message/);
  });

  it("keeps brand chrome out: no Michroma, no pink and no hard-coded app scheme", () => {
    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toMatch(/michroma|PINK_|#db2777|pink-/i);
      expect(source, file).not.toMatch(/scheme: "(vibot|verve|velth|vmem|vstore)"/);
    }
  });
});

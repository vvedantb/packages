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
  Keyboard: { addListener: () => ({ remove() {} }) },
  KeyboardAvoidingView: "KeyboardAvoidingView",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
}));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/Button", () => ({ Button: "Button" }));
vi.mock("../src/Input", () => ({ Input: "Input" }));
vi.mock("../src/PasswordInput", () => ({ PasswordInput: "PasswordInput" }));
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
  const clerk = (code: string, extra: object = {}) => ({ clerkError: true, errors: [{ code, message: "Short", ...extra }] });
  const INVALID = "Invalid email or password";

  it("adds the code to a Clerk message, and gives the fallback for anything else", () => {
    const api = clerk("x", { longMessage: "Password is incorrect." });
    expect(auth.authErrorMessage(api, "Sign in failed")).toBe("Password is incorrect. (code: x)");
    expect(auth.authErrorMessage(clerk("x"), "F")).toBe("Short (code: x)");
    expect(auth.authErrorMessage(new Error("TypeError: fetch failed"), "Sign in failed")).toBe("Sign in failed");
    expect(auth.authErrorMessage(undefined, "Sign in failed")).toBe("Sign in failed");
  });

  it("shows the invalid-credentials fallback only for the two credential codes", () => {
    for (const code of ["form_password_incorrect", "form_identifier_not_found"]) {
      const api = clerk(code, { longMessage: "Something specific." });
      expect(auth.authErrorMessage(api, INVALID, { credentials: true })).toBe(INVALID);
    }
    const format = clerk("form_param_format_invalid", { longMessage: "Enter a valid email." });
    expect(auth.authErrorMessage(format, INVALID, { credentials: true })).toBe(
      "Enter a valid email. (code: form_param_format_invalid)",
    );
    const plain = clerk("form_password_incorrect", { longMessage: "Password is incorrect." });
    expect(auth.authErrorMessage(plain, "F")).toBe("Password is incorrect. (code: form_password_incorrect)");
  });

  it("rephrases provider names, then appends the code", () => {
    const api = clerk("captcha_invalid", { longMessage: "Captcha failed. Clerk could not verify you." });
    expect(auth.authErrorMessage(api, "F", { credentials: true })).toBe(
      "Captcha failed. the sign-in service could not verify you. (code: captcha_invalid)",
    );
    expect(auth.authErrorMessage(clerk("x", { message: "CONVEX and clerk" }), "F")).toBe(
      "the sign-in service and the sign-in service (code: x)",
    );
  });

  it("uses the fallback and still appends the code when there is no message", () => {
    const api = { clerkError: true, errors: [{ code: "session_exists" }] };
    expect(auth.authErrorMessage(api, "Sign in failed")).toBe("Sign in failed (code: session_exists)");
  });

  it("accepts a plain errors object", () => {
    expect(auth.authErrorMessage({ errors: [{ code: "x", message: "Hi" }] }, "F")).toBe("Hi (code: x)");
  });
});

describe("logAuthFailure", () => {
  it("logs one structured error with code, message, longMessage and paramName", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = {
      clerkError: true,
      name: "ClerkAPIResponseError",
      status: 422,
      clerkTraceId: "trace_1",
      errors: [{ code: "form_password_incorrect", message: "Short", longMessage: "Long", meta: { paramName: "password" } }],
    };
    auth.logAuthFailure("create", error);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("[sign-in] failure", {
      stage: "create",
      errorName: "ClerkAPIResponseError",
      status: 422,
      clerkTraceId: "trace_1",
      code: "form_password_incorrect",
      message: "Short",
      longMessage: "Long",
      meta: { paramName: "password" },
    });
    spy.mockRestore();
  });

  it("logs a non-Clerk error without throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    auth.logAuthFailure("create", new TypeError("fetch failed"));
    expect(spy).toHaveBeenCalledWith("[sign-in] failure", expect.objectContaining({ stage: "create", errorName: "TypeError" }));
    spy.mockRestore();
  });
});

describe("SignInScreen create catch (source contract)", () => {
  it("logs the failure and uses the credentials-aware message", () => {
    const source = code(read("SignInScreen.tsx"));
    expect(source).toContain('logAuthFailure("create", caught)');
    expect(source).toContain("authErrorMessage(caught, AUTH_MESSAGES.invalidCredentials, { credentials: true })");
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

  it("shows the second-factor step when sign-in needs one, and goes back to the form", () => {
    const screen = code(read("SignInScreen.tsx"));
    expect(screen).toMatch(/status === "needs_second_factor"/);
    expect(screen).toMatch(/setPendingSecondFactor\(true\)/);
    expect(screen).toMatch(/useSecondFactor\(\)/);
    expect(screen).toMatch(/<SecondFactorScreen/);
    expect(screen).toMatch(/if \(result\.ok\) done\(\)/);
    expect(screen).toMatch(/setPendingSecondFactor\(false\)/);
    expect(auth.AUTH_MESSAGES.secondFactorTitle).toBe("Two-step verification");
  });

  it("widens the status before comparing, so a strict Clerk SignInStatus still typechecks", () => {
    const screen = code(read("SignInScreen.tsx"));
    expect(screen).toMatch(/const status: string \| null = attempt\.status;/);
    expect(screen).toMatch(/status === "needs_second_factor" \|\| status === "needs_client_trust"/);
    expect(screen).toMatch(/startSecondFactor\(attempt, status === "needs_client_trust"\)/);
    expect(screen).not.toMatch(/attempt\.status === "needs_client_trust"/);
    // No source compares a raw `.status` to the value Clerk's union omits.
    for (const file of files) {
      expect(code(read(file)), file).not.toMatch(/\.status\s*[!=]==?\s*"needs_client_trust"/);
    }
  });

  it("shows a strict Clerk-like union compared safely after the widen", () => {
    type StrictStatus = "complete" | "needs_second_factor" | "needs_new_password";
    const attempt: { status: StrictStatus | null } = { status: "needs_second_factor" };
    // `attempt.status === "needs_client_trust"` would be a TS2367 error here.
    const status: string | null = attempt.status;
    expect(status === "needs_client_trust").toBe(false);
    expect(status === "needs_second_factor" || status === "needs_client_trust").toBe(true);
  });

  it("runs needs_first_factor with email_code or phone_code through SecondFactorScreen", () => {
    const screen = code(read("SignInScreen.tsx"));
    expect(screen).toMatch(/status === "needs_first_factor" && afterCreate/);
    expect(screen).toMatch(/attempt\.supportedFirstFactors \?\? \[\]/);
    expect(screen).toMatch(/pickFirstFactorStrategy\(list\)/);
    expect(screen).toMatch(/prepareFirstFactorIfNeeded\(/);
    expect(screen).toMatch(/submitFirstFactor\(\{ signIn, code: firstCode, strategy: firstStrategy \}\)/);
    expect(screen).toMatch(/routeAttempt\(result\.attempt, false\)/);
    expect(screen).toMatch(/routeAttempt\(attempt, true\)/);
    expect(screen).toMatch(/secondFactorCopy\(firstStrategy, false\)/);
    expect(screen).toMatch(/testIDPrefix=\{id\("first-factor"\)\}/);
    expect(screen).toMatch(/id\("first-factor-switch"\)/);
    const totp = code(read("totp.ts"));
    expect(totp).toMatch(/prepareFirstFactor\(\{ strategy, emailAddressId: factor\.emailAddressId \}\)/);
    expect(totp).toMatch(/prepareFirstFactor\(\{ strategy, phoneNumberId: factor\.phoneNumberId \}\)/);
    expect(totp).toMatch(/attemptFirstFactor\(\{ strategy: args\.strategy, code: args\.code \}\)/);
    expect(auth.AUTH_MESSAGES.emailCodeTitle).toBe("Check your email");
    expect(auth.AUTH_MESSAGES.phoneCodeTitle).toBe("Check your phone");
  });

  it("handles every incomplete status and falls back with a console.warn", () => {
    const screen = code(read("SignInScreen.tsx"));
    expect(screen).toMatch(/status === "needs_new_password"/);
    expect(screen).toMatch(/signIn\.resetPassword\(\{ password: newPassword \}\)/);
    expect(screen).toMatch(/pickSecondFactorStrategy\(list\)/);
    expect(screen).toMatch(/secondFactor\.prepare\(/);
    expect(screen).toMatch(/console\.warn\(/);
    expect(screen).toMatch(/supportedSecondFactors/);
  });

  it("runs the built-in first-factor, new-password and second-factor steps first and hands only unhandled statuses to onIncomplete", () => {
    const screen = code(read("SignInScreen.tsx"));
    expect(screen).toMatch(/onIncomplete\?: \(signIn: IncompleteSignIn\) => void/);
    const route = screen.indexOf("const routeAttempt");
    const order = [
      "needs_new_password",
      "needs_second_factor",
      "startSecondFactor(attempt",
      "needs_first_factor",
      "startFirstFactor(attempt)",
      "unhandled(attempt)",
    ].map((text) => screen.indexOf(text, route));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // onIncomplete is reached only through `unhandled`, never before the built-in branches.
    const routed = screen.slice(route);
    expect(routed.slice(0, routed.indexOf("unhandled(attempt)"))).not.toMatch(/onIncomplete/);
    expect(screen).toMatch(/signIn\.create\(\{ identifier: email, password \}\)/);
    expect(screen).toMatch(/if \(!strategy\) return unhandled\(attempt\)/);
    expect(screen).toMatch(/if \(onIncomplete\) return onIncomplete\(attempt\)/);
    expect(screen.indexOf("warnIncomplete(attempt)", screen.indexOf("const unhandled"))).toBeGreaterThan(
      screen.indexOf("if (onIncomplete) return onIncomplete(attempt)"),
    );
  });

  it("offers a backup-code switch through the SecondFactorScreen footer", () => {
    const screen = code(read("SignInScreen.tsx"));
    expect(screen).toMatch(/footer=\{/);
    expect(screen).toMatch(/digitsOnly=\{!backup\}/);
    expect(screen).toMatch(/key=\{active\}/);
    expect(auth.AUTH_MESSAGES.useBackupCode).toBe("Use a backup code");
    expect(auth.AUTH_MESSAGES.useAuthenticator).toBe("Use authenticator app");
    const body = code(read("SecondFactorScreen.tsx"));
    expect(body).toMatch(/footer=\{footer\}/);
    expect(body).toMatch(/digitsOnly = true/);
    expect(body).toMatch(/digitsOnly \? text\.replace/);
  });

  it("uses PasswordInput for every password field and no bare secureTextEntry", () => {
    const source = read("SignInScreen.tsx");
    const screen = code(source);
    expect(source).toMatch(/import \{ Input \} from "\.\.\/Input"/);
    expect(source).toMatch(/import \{ PasswordInput \} from "\.\.\/PasswordInput"/);
    expect(screen).not.toMatch(/secureTextEntry/);
    for (const field of ["password", "new-password", "confirm-password"]) {
      expect(screen).toMatch(new RegExp(`<PasswordInput\\s+testID=\\{id\\("${field}"\\)\\}`));
    }
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

describe("SecondFactorScreen (source contract)", () => {
  const source = read("SecondFactorScreen.tsx");
  const body = code(source);

  it("is Clerk-free and imports relatively", () => {
    expect(source.replace(/\/\/.*$/gm, "")).not.toMatch(/clerk|@vvedantb\/native-ui|\beva\b/i);
    expect(source).toMatch(/from "\.\/AuthScreen"/);
    expect(source).toMatch(/import \{ Button \} from "\.\.\/Button"/);
    expect(source).toMatch(/import \{ Input \} from "\.\.\/Input"/);
  });

  it("renders the title through AuthScreen with no title typography of its own", () => {
    expect(body).toMatch(/<AuthScreen testID=\{`\$\{testIDPrefix\}-screen`\} title=\{title\} subtitle=\{description\}/);
    expect(source).not.toMatch(/typeStyle|fontWeight|font-light|font-normal/);
  });

  it("has the documented defaults", () => {
    expect(body).toMatch(/codeLength = 6/);
    expect(body).toMatch(/backLabel = "Back"/);
    expect(body).toMatch(/testIDPrefix = "second-factor"/);
    expect(body).toMatch(/loading = false/);
  });

  it("takes digits only, up to codeLength, and waits for the full code", () => {
    expect(body).toMatch(/digitsOnly \? text\.replace\(\/\\D\/g, ""\)/);
    expect(body).toMatch(/maxLength=\{codeLength\}/);
    expect(body).toMatch(/keyboardType=\{digitsOnly \? "number-pad" : "default"\}/);
    expect(body).toMatch(/textContentType="oneTimeCode"/);
    expect(body).toMatch(/const ready = code\.length === codeLength && !loading/);
    expect(body).toMatch(/disabled=\{!ready\}/);
    expect(body).toMatch(/if \(ready\) void onSubmit\(code\)/);
  });

  it("has -screen, -code, -error, -verify and -back test IDs, and Back only with onBack", () => {
    for (const name of ["screen", "code", "error", "verify", "back"]) {
      expect(body, name).toContain(`\`\${testIDPrefix}-${name}\``);
    }
    expect(body).toMatch(/onBack \? \(/);
  });

  it("exports the screen and its props from /auth, and the helper names", () => {
    expect(typeof auth.SecondFactorScreen).toBe("function");
    expect(typeof auth.useSecondFactor).toBe("function");
    expect(typeof auth.submitTotpSecondFactor).toBe("function");
    expect(auth.TOTP_MESSAGES.invalidCode).toMatch(/Incorrect code/);
  });
});

describe("AuthScreen keyboard (source contract)", () => {
  const body = code(read("AuthScreen.tsx"));

  it("pads on both platforms: no Android-only height, no undefined behavior", () => {
    expect(body).toMatch(/behavior="padding"/);
    expect(body).not.toMatch(/"height"|Platform/);
  });

  it("keeps taps working and pads the scroll content by the keyboard height", () => {
    expect(body).toMatch(/keyboardShouldPersistTaps="handled"/);
    expect(body).toMatch(/paddingBottom: keyboardHeight \+ KEYBOARD_EXTRA/);
    for (const event of ["keyboardWillShow", "keyboardDidShow", "keyboardWillHide", "keyboardDidHide"]) {
      expect(body).toContain(`"${event}"`);
    }
    expect(body).toMatch(/endCoordinates\.height/);
  });

  it("stops centring while the keyboard is open", () => {
    expect(body).toMatch(/keyboardOpen \? "justify-start" : "justify-center"/);
    expect(body).not.toMatch(/"grow justify-center/);
  });
});

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// `@vvedantb/native-ui/auth` (0.7.0). Clerk, Convex, Expo Router and the
// browser-session modules are not installed here: they are stubbed, and the
// checks call the components without hooks.

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

describe("auth screens", () => {
  it("shows a strict Clerk-like union compared safely after the widen", () => {
    type StrictStatus = "complete" | "needs_second_factor" | "needs_new_password";
    const attempt: { status: StrictStatus | null } = { status: "needs_second_factor" };
    // `attempt.status === "needs_client_trust"` would be a TS2367 error here.
    const status: string | null = attempt.status;
    expect(status === "needs_client_trust").toBe(false);
    expect(status === "needs_second_factor" || status === "needs_client_trust").toBe(true);
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
});

describe("SecondFactorScreen", () => {
  it("exports the screen and its props from /auth, and the helper names", () => {
    expect(typeof auth.SecondFactorScreen).toBe("function");
    expect(typeof auth.useSecondFactor).toBe("function");
    expect(typeof auth.submitTotpSecondFactor).toBe("function");
    expect(auth.TOTP_MESSAGES.invalidCode).toMatch(/Incorrect code/);
  });
});

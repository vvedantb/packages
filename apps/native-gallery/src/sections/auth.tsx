// Auth screens on a mocked Clerk (`src/mocks/clerk.tsx`): no keys, no network.
import { useState } from "react";
import { View } from "react-native";
import {
  AUTH_MESSAGES,
  AuthProviders,
  AuthScreen,
  AuthTimeoutError,
  FieldError,
  GoogleSignInButton,
  OrDivider,
  SecondFactorScreen,
  SignInScreen,
  SignUpScreen,
} from "@vvedantb/native-ui/auth";
import { Button } from "@vvedantb/native-ui/button";
import { Input } from "@vvedantb/native-ui/primitives";
import { GText } from "../ui";

type Mode = "sign-in" | "sign-up" | "second-factor" | "frame";

const MODES: { id: Mode; label: string }[] = [
  { id: "sign-in", label: "Sign in" },
  { id: "sign-up", label: "Sign up" },
  { id: "second-factor", label: "Second factor" },
  { id: "frame", label: "Frame parts" },
];

/** Full-screen auth gallery: a mode switcher over the screen. Used by the `/auth` route. */
export function AuthSection({ initial = "sign-in" }: { initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [code, setCode] = useState("none");
  return (
    <AuthProviders publishableKey="pk_test_mock">
      <View style={{ flex: 1 }}>
        <View className="flex-row flex-wrap gap-2 px-3 pt-12">
          {MODES.map((item) => (
            <Button key={item.id} testID={`auth-mode-${item.id}`} size="sm" fullWidth={false} variant={item.id === mode ? "default" : "outline"} onPress={() => setMode(item.id)}>
              {item.label}
            </Button>
          ))}
        </View>
        {mode === "sign-in" ? <SignInScreen scheme="nativegallery" errorDisplay="inline" minPasswordLength={8} /> : null}
        {mode === "sign-up" ? <SignUpScreen scheme="nativegallery" errorDisplay="inline" minPasswordLength={8} /> : null}
        {mode === "second-factor" ? (
          <SecondFactorScreen title={AUTH_MESSAGES.secondFactorTitle} description={AUTH_MESSAGES.secondFactorDescription} onSubmit={setCode} onBack={() => setMode("sign-in")} />
        ) : null}
        {mode === "frame" ? (
          <AuthScreen title="Frame" subtitle="AuthScreen, OrDivider, FieldError and the Google button">
            <Input placeholder="Email" />
            <FieldError message={new AuthTimeoutError("sign-in", 20000).message} />
            <OrDivider />
            <GoogleSignInButton scheme="nativegallery" />
          </AuthScreen>
        ) : null}
        <GText testID="auth-code" style={{ position: "absolute", bottom: 4, left: 12, fontSize: 11 }}>{`code:${code}`}</GText>
      </View>
    </AuthProviders>
  );
}

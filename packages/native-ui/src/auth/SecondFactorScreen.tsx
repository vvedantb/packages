// Clerk-free: a one-time code step. The caller owns the verification call and
// its errors (`useSecondFactor` does both for Clerk).
import { useState, type ReactNode } from "react";
import { Button } from "../Button";
import { Input } from "../Input";
import { AuthScreen, FieldError } from "./AuthScreen";

export type SecondFactorScreenProps = {
  title: string;
  description?: string;
  /** Digits in the code. Default 6. */
  codeLength?: number;
  /** Called with the full code. A rejected promise is the caller's to handle. */
  onSubmit: (code: string) => Promise<void> | void;
  /** Inline error under the field, such as "Incorrect code". */
  error?: string;
  /** Shows the Verify spinner and blocks a second submit. */
  loading?: boolean;
  /** Shows a ghost back button when set. */
  onBack?: () => void;
  /** Default "Back". */
  backLabel?: string;
  /** Above the title. App brand chrome goes here. */
  header?: ReactNode;
  /** Prefix for every `testID`. Default "second-factor". */
  testIDPrefix?: string;
  /** Below the buttons, such as a "Use a backup code" switch. Passed to `AuthScreen`. */
  footer?: ReactNode;
  /** Default `true`: digits only, number pad. `false` takes any characters (backup codes). */
  digitsOnly?: boolean;
  /** Placeholder when `digitsOnly` is `false`. Default "Code". */
  placeholder?: string;
};

/** A one-time code step: digits only, a Verify button, an inline error and a back link. */
export function SecondFactorScreen({
  title,
  description,
  codeLength = 6,
  onSubmit,
  error,
  loading = false,
  onBack,
  backLabel = "Back",
  header,
  testIDPrefix = "second-factor",
  footer,
  digitsOnly = true,
  placeholder,
}: SecondFactorScreenProps) {
  const [code, setCode] = useState("");
  const ready = code.length === codeLength && !loading;

  const submit = () => {
    if (ready) void onSubmit(code);
  };

  return (
    <AuthScreen testID={`${testIDPrefix}-screen`} title={title} subtitle={description} header={header} footer={footer}>
      <Input
        testID={`${testIDPrefix}-code`}
        accessibilityLabel="Verification code"
        value={code}
        placeholder={digitsOnly ? "0".repeat(codeLength) : (placeholder ?? "Code")}
        keyboardType={digitsOnly ? "number-pad" : "default"}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={codeLength}
        autoFocus
        returnKeyType="go"
        onChangeText={(text) => setCode(digitsOnly ? text.replace(/\D/g, "") : text.trim())}
        onSubmitEditing={submit}
      />
      <FieldError testID={`${testIDPrefix}-error`} message={error} />
      <Button testID={`${testIDPrefix}-verify`} loading={loading} disabled={!ready} onPress={submit}>
        Verify
      </Button>
      {onBack ? (
        <Button testID={`${testIDPrefix}-back`} variant="ghost" onPress={onBack}>
          {backLabel}
        </Button>
      ) : null}
    </AuthScreen>
  );
}

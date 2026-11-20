import { useRef, useState, type ReactNode } from "react";
import type { TextInput } from "react-native";
import { useUser } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { Button } from "../Button";
import { Input } from "../Input";
import { PasswordInput } from "../PasswordInput";
import { AuthScreen, FieldError } from "./AuthScreen";
import {
  authErrorMessage,
  DEFAULT_STAGE_TIMEOUT_MS,
  isAuthTimeoutError,
  logAuthFailure,
  withAuthTimeout,
} from "./authErrors";

/** The messages the account screens can show. Generic: none names a provider. */
export const ACCOUNT_MESSAGES = {
  changePasswordTitle: "Change password",
  changePasswordSubtitle: "Enter your current password, then a new one.",
  setPasswordTitle: "Set a password",
  setPasswordSubtitle: "Your account has no password yet. Choose one.",
  currentPasswordLabel: "Current password",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm new password",
  missingCurrentPassword: "Enter your current password",
  missingNewPassword: "Enter a new password",
  passwordMismatch: "The passwords do not match",
  changePasswordFailed: "Could not change the password",
  changePassword: "Change password",
  setPassword: "Set password",
  deleteTitle: "Delete account",
  deleteSubtitle: "This deletes your account and its data. It cannot be undone.",
  deleteConfirmMismatch: "Type the word exactly to confirm",
  deleteFailed: "Could not delete the account",
  deleteAccount: "Delete account",
  cancel: "Cancel",
  notReady: "Your account is not ready yet. Try again in a moment.",
} as const;

type AccountScreenBase = {
  title?: string;
  subtitle?: string;
  /** Above the title. App brand chrome goes here. */
  header?: ReactNode;
  /** Below the form. */
  footer?: ReactNode;
  /** Shows a "Cancel" button that calls it. No button without it. */
  onCancel?: () => void;
  /** Time for the call, in milliseconds. A longer call fails with code `auth_timeout`. Default 20000. */
  stageTimeoutMs?: number;
};

export type ChangePasswordScreenProps = AccountScreenBase & {
  /** Rejects a shorter new password before sending it. Default: no check. */
  minPasswordLength?: number;
  /** Ends the user's other sessions after the change. Default `true`. */
  signOutOfOtherSessions?: boolean;
  /** Called after the password changed. Default: `router.back()`. */
  onSuccess?: () => void;
  /** Prefix for every `testID`. Default `"change-password"`. */
  testIDPrefix?: string;
};

/**
 * Changes the signed-in user's password with `user.updatePassword`: the
 * current password, then the new one typed twice. An account with no password
 * (Google only) gets no current-password field and the "Set a password" copy.
 * Errors show under the fields. Render it under `ClerkProvider`, signed in.
 */
export function ChangePasswordScreen({
  title,
  subtitle,
  header,
  footer,
  onCancel,
  stageTimeoutMs = DEFAULT_STAGE_TIMEOUT_MS,
  minPasswordLength,
  signOutOfOtherSessions = true,
  onSuccess,
  testIDPrefix = "change-password",
}: ChangePasswordScreenProps) {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nextField = useRef<TextInput>(null);
  const confirmField = useRef<TextInput>(null);
  const id = (name: string) => `${testIDPrefix}-${name}`;
  // Until the user loads, show the current-password field: most accounts have one.
  const hasPassword = user ? user.passwordEnabled : true;

  const submit = async () => {
    if (submitting) return;
    if (!isLoaded || !user) return setError(ACCOUNT_MESSAGES.notReady);
    if (hasPassword && !current) return setError(ACCOUNT_MESSAGES.missingCurrentPassword);
    if (!next) return setError(ACCOUNT_MESSAGES.missingNewPassword);
    if (minPasswordLength && next.length < minPasswordLength) {
      return setError(`Use at least ${minPasswordLength} characters for the password`);
    }
    if (next !== confirm) return setError(ACCOUNT_MESSAGES.passwordMismatch);
    setSubmitting(true);
    setError("");
    try {
      await withAuthTimeout(
        user.updatePassword({
          newPassword: next,
          signOutOfOtherSessions,
          ...(hasPassword ? { currentPassword: current } : {}),
        }),
        "update-password",
        stageTimeoutMs,
      );
      setCurrent("");
      setNext("");
      setConfirm("");
      if (onSuccess) onSuccess();
      else router.back();
    } catch (caught) {
      logAuthFailure("update-password", caught);
      setError(authErrorMessage(caught, ACCOUNT_MESSAGES.changePasswordFailed));
    }
    // No `finally`: React Compiler does not memoise a component with one.
    setSubmitting(false);
  };

  return (
    <AuthScreen
      testID={id("screen")}
      title={title ?? (hasPassword ? ACCOUNT_MESSAGES.changePasswordTitle : ACCOUNT_MESSAGES.setPasswordTitle)}
      subtitle={subtitle ?? (hasPassword ? ACCOUNT_MESSAGES.changePasswordSubtitle : ACCOUNT_MESSAGES.setPasswordSubtitle)}
      header={header}
      footer={footer}
    >
      {hasPassword ? (
        <PasswordInput
          testID={id("current")}
          accessibilityLabel={ACCOUNT_MESSAGES.currentPasswordLabel}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => nextField.current?.focus()}
          value={current}
          placeholder={ACCOUNT_MESSAGES.currentPasswordLabel}
          onChangeText={setCurrent}
        />
      ) : null}
      <PasswordInput
        testID={id("new")}
        ref={nextField}
        accessibilityLabel={ACCOUNT_MESSAGES.newPasswordLabel}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmField.current?.focus()}
        value={next}
        placeholder={ACCOUNT_MESSAGES.newPasswordLabel}
        onChangeText={setNext}
      />
      <PasswordInput
        testID={id("confirm")}
        ref={confirmField}
        accessibilityLabel={ACCOUNT_MESSAGES.confirmPasswordLabel}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        value={confirm}
        placeholder={ACCOUNT_MESSAGES.confirmPasswordLabel}
        onChangeText={setConfirm}
        onSubmitEditing={() => void submit()}
      />
      <FieldError testID={id("error")} message={error} />
      <Button testID={id("submit")} loading={submitting} onPress={() => void submit()}>
        {hasPassword ? ACCOUNT_MESSAGES.changePassword : ACCOUNT_MESSAGES.setPassword}
      </Button>
      {onCancel ? (
        <Button testID={id("cancel")} variant="ghost" disabled={submitting} onPress={onCancel}>
          {ACCOUNT_MESSAGES.cancel}
        </Button>
      ) : null}
    </AuthScreen>
  );
}

export type DeleteAccountScreenProps = AccountScreenBase & {
  /** The word the user types to confirm. Compared without case. Default `"DELETE"`. */
  confirmWord?: string;
  /** Called after the account is deleted, in place of `router.replace`. */
  onDeleted?: () => void;
  /** Where to go after the account is deleted. Default `"/"`. */
  afterDeleteHref?: Href;
  /** Prefix for every `testID`. Default `"delete-account"`. */
  testIDPrefix?: string;
};

/**
 * Deletes the signed-in user's account with `user.delete()`. The user types
 * `confirmWord` first; the delete button stays off until it matches. Needs
 * "Allow users to delete their accounts" turned on for the instance. Errors
 * show under the field. Render it under `ClerkProvider`, signed in.
 */
export function DeleteAccountScreen({
  title,
  subtitle,
  header,
  footer,
  onCancel,
  stageTimeoutMs = DEFAULT_STAGE_TIMEOUT_MS,
  confirmWord = "DELETE",
  onDeleted,
  afterDeleteHref = "/",
  testIDPrefix = "delete-account",
}: DeleteAccountScreenProps) {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const id = (name: string) => `${testIDPrefix}-${name}`;
  const matches = typed.trim().toLowerCase() === confirmWord.toLowerCase();

  const submit = async () => {
    if (submitting) return;
    if (!matches) return setError(ACCOUNT_MESSAGES.deleteConfirmMismatch);
    if (!isLoaded || !user) return setError(ACCOUNT_MESSAGES.notReady);
    setSubmitting(true);
    setError("");
    try {
      await withAuthTimeout(user.delete(), "delete-account", stageTimeoutMs);
      if (onDeleted) onDeleted();
      else router.replace(afterDeleteHref);
    } catch (caught) {
      if (isAuthTimeoutError(caught)) logAuthFailure("delete-account", caught);
      setError(authErrorMessage(caught, ACCOUNT_MESSAGES.deleteFailed));
    }
    // No `finally`: React Compiler does not memoise a component with one.
    setSubmitting(false);
  };

  const label = `Type ${confirmWord} to confirm`;
  return (
    <AuthScreen
      testID={id("screen")}
      title={title ?? ACCOUNT_MESSAGES.deleteTitle}
      subtitle={subtitle ?? ACCOUNT_MESSAGES.deleteSubtitle}
      header={header}
      footer={footer}
    >
      <Input
        testID={id("confirm")}
        accessibilityLabel={label}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        value={typed}
        placeholder={label}
        onChangeText={(text) => {
          setTyped(text);
          setError("");
        }}
      />
      <FieldError testID={id("error")} message={error} />
      <Button
        testID={id("submit")}
        variant="destructive"
        loading={submitting}
        disabled={!matches}
        onPress={() => void submit()}
      >
        {ACCOUNT_MESSAGES.deleteAccount}
      </Button>
      {onCancel ? (
        <Button testID={id("cancel")} variant="ghost" disabled={submitting} onPress={onCancel}>
          {ACCOUNT_MESSAGES.cancel}
        </Button>
      ) : null}
    </AuthScreen>
  );
}

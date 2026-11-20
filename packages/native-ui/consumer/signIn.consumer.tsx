/**
 * Consumer-style type test. Compiled by `tsconfig.consumer.json` against the
 * real `@clerk/expo` types (not `types/peers.d.ts`), with `strict` and
 * `strictFunctionTypes`. It never runs.
 */
import { useSignIn } from "@clerk/expo";
import {
  prepareFirstFactorIfNeeded,
  prepareSecondFactorIfNeeded,
  SignInScreen,
  submitFirstFactor,
  submitSecondFactor,
  type SignInScreenProps,
} from "../src/auth";
import { signInCalls } from "../src/auth/clerkCore3";

/** Clerk's real sign-in resource, as the root `useSignIn` returns it. */
type SignInResource = ReturnType<typeof useSignIn>["signIn"];

declare const resource: SignInResource;

export async function helpers(): Promise<void> {
  const signIn = signInCalls(resource);
  await prepareFirstFactorIfNeeded({ signIn, strategy: "email_code" });
  await submitFirstFactor({ signIn, code: "123456", strategy: "phone_code" });
  await prepareSecondFactorIfNeeded({ signIn, strategy: "phone_code" });
  await submitSecondFactor({ signIn, setActive: signIn.setActive, code: "123456", strategy: "totp" });
}

export async function fromHook(): Promise<void> {
  const signIn = signInCalls(useSignIn().signIn);
  await prepareFirstFactorIfNeeded({ signIn, strategy: "email_code" });
  await submitFirstFactor({ signIn, code: "123456", strategy: "email_code" });
  await prepareSecondFactorIfNeeded({ signIn, strategy: "email_code" });
  await submitSecondFactor({ signIn, setActive: signIn.setActive, code: "123456", strategy: "backup_code" });
}

const props: SignInScreenProps = { scheme: "app", stageTimeoutMs: 20000 };
export const screen = <SignInScreen {...props} />;

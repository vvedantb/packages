/**
 * Consumer-style type test. Compiled by `tsconfig.consumer.json` against the
 * real `@clerk/clerk-expo` types (not `types/peers.d.ts`), with `strict` and
 * `strictFunctionTypes`. It never runs.
 */
import { useSignIn } from "@clerk/clerk-expo";
import {
  prepareFirstFactorIfNeeded,
  prepareSecondFactorIfNeeded,
  SignInScreen,
  submitFirstFactor,
  submitSecondFactor,
  type SignInScreenProps,
} from "../src/auth";

/** Clerk's real `SignInResource`, as `useSignIn` returns it. */
type SignInResource = NonNullable<ReturnType<typeof useSignIn>["signIn"]>;

declare const resource: SignInResource;

export async function helpers(): Promise<void> {
  await prepareFirstFactorIfNeeded({ signIn: resource, strategy: "email_code" });
  await submitFirstFactor({ signIn: resource, code: "123456", strategy: "phone_code" });
  await prepareSecondFactorIfNeeded({ signIn: resource, strategy: "phone_code" });
  await submitSecondFactor({
    signIn: resource,
    setActive: async () => {},
    code: "123456",
    strategy: "totp",
  });
}

export async function fromHook(): Promise<void> {
  const { signIn, setActive } = useSignIn();
  if (!signIn || !setActive) return;
  await prepareFirstFactorIfNeeded({ signIn, strategy: "email_code" });
  await submitFirstFactor({ signIn, code: "123456", strategy: "email_code" });
  await prepareSecondFactorIfNeeded({ signIn, strategy: "email_code" });
  await submitSecondFactor({ signIn, setActive, code: "123456", strategy: "backup_code" });
}

const props: SignInScreenProps = { scheme: "app", stageTimeoutMs: 20000 };
export const screen = <SignInScreen {...props} />;

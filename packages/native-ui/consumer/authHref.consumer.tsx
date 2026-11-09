/**
 * Consumer-style type test for the typed `Href` props of `/auth`. Compiled by
 * `tsconfig.consumer.json` with `strict` and `strictFunctionTypes`. It never
 * runs.
 *
 * expo-router is not a dependency here, so `types/peers.d.ts` stands in for
 * it. With `typedRoutes: true` the real `Href` is a union of the app's route
 * strings and object hrefs. `AppHref` below models that: a narrow union that
 * is assignable to the wide `Href`, and a plain `string` that is not assignable
 * to it. The props take `Href`, so a typed route compiles with no cast.
 */
import type { Href, Router } from "expo-router";
import { GoogleSignInButton, SignInScreen, type SignInScreenProps } from "../src/auth";

/** A typedRoutes-style route union: path strings and object hrefs. */
type AppHref = "/" | "/sign-in" | "/sign-up" | "/(app)/bots" | { pathname: "/bot/[id]"; params: { id: string } };

declare const typedHome: AppHref;
declare const typedSignUp: Extract<AppHref, "/sign-up">;

/** The options of `router.replace`, as the props type them. */
type ReplaceOptions = Parameters<Router["replace"]>[1];
const anchored: ReplaceOptions = { withAnchor: true };

// Typed routes and object hrefs.
export const typedButton = (
  <GoogleSignInButton scheme="app" afterAuthHref={typedHome} replaceOptions={anchored} />
);
export const objectHref = (
  <GoogleSignInButton
    scheme="app"
    afterAuthHref={{ pathname: "/bot/[id]", params: { id: "1" } }}
    replaceOptions={{ withAnchor: true }}
  />
);
export const typedScreen = (
  <SignInScreen
    scheme="app"
    afterAuthHref="/(app)/bots"
    signUpHref={typedSignUp}
    replaceOptions={{ withAnchor: true }}
  />
);

// Plain string literals still compile.
export const literals = (
  <>
    <GoogleSignInButton scheme="app" afterAuthHref="/" />
    <SignInScreen scheme="app" afterAuthHref="/" signUpHref="/sign-up" />
    <SignInScreen scheme="app" mode="sign-up" signInHref="/sign-in" />
  </>
);

const props: SignInScreenProps = { scheme: "app", afterAuthHref: typedHome, signUpHref: "/sign-up" };
export const spread = <SignInScreen {...props} />;

/** The prop types are `Href` and the replace options, not `string` and `object`. */
export const assignable: { afterAuthHref?: Href; replaceOptions?: ReplaceOptions } = props;

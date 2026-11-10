import { useRouter, type Href } from "expo-router";
import { StackPageHeader, type StackPageHeaderProps } from "../StackPageHeader";

export type RouterStackPageHeaderProps = Omit<StackPageHeaderProps, "onBack"> & {
  /** Where the back button goes when there is nothing to go back to, such as after a deep link. Default `"/"`. */
  fallbackHref?: Href;
};

/** Goes back when the stack has a screen below, else replaces the route with `fallbackHref`. */
export function goBackOrReplace(router: Pick<ReturnType<typeof useRouter>, "canGoBack" | "back" | "replace">, fallbackHref: Href = "/") {
  if (router.canGoBack()) router.back();
  else router.replace(fallbackHref);
}

/**
 * `StackPageHeader` with a router-aware back button: `router.canGoBack() ?
 * router.back() : router.replace(fallbackHref)`. Same props as
 * `StackPageHeader` without `onBack`, and `fallbackHref` (default `"/"`).
 * On `@vvedantb/native-ui/expo-router` only, so the other entries never import
 * `expo-router`.
 */
export function RouterStackPageHeader({ fallbackHref = "/", ...props }: RouterStackPageHeaderProps) {
  const router = useRouter();
  return <StackPageHeader {...props} onBack={() => goBackOrReplace(router, fallbackHref)} />;
}

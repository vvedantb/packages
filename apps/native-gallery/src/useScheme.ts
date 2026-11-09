import { useColorScheme } from "nativewind";

/** Active colour scheme as a `tokens` key. `useScheme` is not a public native-ui export. */
export function useScheme(): "light" | "dark" {
  return useColorScheme().colorScheme === "dark" ? "dark" : "light";
}

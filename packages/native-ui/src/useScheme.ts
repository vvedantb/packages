import { useColorScheme } from "nativewind";

/** Active colour scheme as a `tokens` / `palette` key. */
export function useScheme(): "light" | "dark" {
  return useColorScheme().colorScheme === "dark" ? "dark" : "light";
}

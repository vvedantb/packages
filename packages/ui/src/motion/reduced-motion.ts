import { createContext, use } from "react";
import { useMediaQuery } from "../hooks/use-media-query";

/**
 * Whether the package's own motion follows the OS "reduce motion" setting.
 * Set once at the root with `MotionProvider reducedMotion` (the same option as
 * Motion's `MotionConfig` and HeroUI's provider):
 * - `"user"` (default): follow `prefers-reduced-motion`.
 * - `"always"`: always reduce.
 * - `"never"`: always animate; the app owns its own "motion off" switch.
 *
 * `MotionProvider` stamps it on `html[data-reduced-motion]` for CSS and for
 * non-React code, and provides it through context for components.
 */
export type ReducedMotion = "user" | "always" | "never";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const ReducedMotionContext = createContext<ReducedMotion>("user");

function resolve(setting: ReducedMotion, osReduces: boolean): boolean {
  if (setting === "never") return false;
  if (setting === "always") return true;
  return osReduces;
}

function documentSetting(): ReducedMotion {
  const value = document.documentElement.dataset.reducedMotion;
  return value === "always" || value === "never" ? value : "user";
}

/** Outside React (event handlers, DOM helpers): reads `html[data-reduced-motion]`. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return resolve(documentSetting(), window.matchMedia(REDUCED_MOTION_QUERY).matches);
}

/** In a component: the root setting from `MotionProvider`, then the OS query. */
export function useReducedMotionSetting(): boolean {
  const setting = use(ReducedMotionContext);
  const osReduces = useMediaQuery(REDUCED_MOTION_QUERY);
  return resolve(setting, osReduces);
}

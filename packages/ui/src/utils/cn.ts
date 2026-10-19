import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// `rounded-field` and the tokens.css radii (`rounded-surface`,
// `rounded-menu-item`, `rounded-control`) are custom radius tokens — teach
// twMerge they conflict with `rounded-none` / `rounded-md` / etc. so the last
// radius class wins.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      borderRadius: ["field", "surface", "menu-item", "control"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

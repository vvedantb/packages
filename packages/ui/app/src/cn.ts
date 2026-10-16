type ClassPart = string | false | null | undefined;

/** Minimal class join. Drops falsy parts; does not merge conflicting Tailwind classes. */
export function cn(...parts: ClassPart[]): string {
  return parts.filter(Boolean).join(" ");
}

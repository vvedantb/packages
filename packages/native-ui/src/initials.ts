/** Up to `max` uppercase initials from a name: "Ada Lovelace" → "AL", "  cher " → "C". Empty for a blank name. */
export function initials(name: string, max = 2): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((word) => Array.from(word)[0]!.toUpperCase())
    .join("");
}

export type SlashTrigger = {
  query: string;
  startIndex: number;
};

export function isValidSlashTrigger(
  value: string,
  triggerIndex: number,
): boolean {
  const textAfter = value.slice(triggerIndex + 1);
  if (textAfter.includes("\n") || /\s/.test(textAfter)) {
    return false;
  }
  const charBefore = triggerIndex > 0 ? value[triggerIndex - 1] : "";
  return (
    triggerIndex === 0 || (charBefore !== undefined && /\s/.test(charBefore))
  );
}

export function findSlashTrigger(value: string): SlashTrigger | null {
  const slashIndex = value.lastIndexOf("/");
  if (slashIndex === -1 || !isValidSlashTrigger(value, slashIndex)) {
    return null;
  }
  return {
    query: value.slice(slashIndex + 1),
    startIndex: slashIndex,
  };
}

export function stripSlashTrigger(
  value: string,
  startIndex: number,
  query: string,
): string {
  const before = value.slice(0, startIndex);
  const after = value.slice(startIndex + 1 + query.length);
  return `${before}${after}`;
}

export function matchesSlashQuery(
  item: { label: string; description?: string; keywords: string[] },
  query: string,
): boolean {
  const needle = query.toLowerCase();
  if (needle.length === 0) return true;
  const haystack =
    `${item.label} ${item.description ?? ""} ${item.keywords.join(" ")}`.toLowerCase();
  return haystack.includes(needle);
}

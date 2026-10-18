export function optionId(listboxId: string, itemId: string): string {
  return `${toIdToken(listboxId)}-option-${toIdToken(itemId)}`;
}

function toIdToken(value: string): string {
  return value.replaceAll(/[^A-Za-z0-9_-]/g, "-");
}

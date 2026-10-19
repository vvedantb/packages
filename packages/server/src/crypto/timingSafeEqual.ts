/**
 * Compare the UTF-8 bytes of two strings without stopping at the first
 * difference. Returns `false` straight away when the byte lengths differ, so
 * the length is not hidden. Lone surrogates encode as U+FFFD, so two strings
 * that differ only in lone surrogates compare equal.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index++) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

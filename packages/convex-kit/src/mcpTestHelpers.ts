function format(names: readonly string[]): string {
  return names.length === 0 ? "(none)" : names.join(", ");
}

/** Throw unless exactly `expected` tools are listed. The error lists the names. */
export function expectMcpToolCount(
  toolNames: readonly string[],
  expected: number,
): void {
  if (toolNames.length !== expected) {
    throw new Error(
      `Expected ${expected} MCP tools but found ${toolNames.length}: ${format(toolNames)}`,
    );
  }
}

/**
 * Throw unless the sorted, de-duplicated tool names equal the expected set.
 * The error names the missing and unexpected tools.
 */
export function assertMcpTools(
  toolNames: readonly string[],
  expected: readonly string[],
): void {
  const actualSet = new Set(toolNames);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter((n) => !actualSet.has(n)).sort();
  const unexpected = [...actualSet].filter((n) => !expectedSet.has(n)).sort();
  if (missing.length === 0 && unexpected.length === 0) return;
  throw new Error(
    `MCP tools differ. Missing: ${format(missing)}. Unexpected: ${format(unexpected)}. Actual: ${format([...actualSet].sort())}`,
  );
}

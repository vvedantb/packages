/**
 * Accessibility and test props for a `Select` option. On web
 * `@rn-primitives/select` passes the props of its `Item` through a `Slot` to
 * the Radix `Select.Item`, a DOM `<div>`. React Native Web never sees them, so
 * React logs `accessibilityLabel` and `testID` there as unknown DOM props. Web
 * gets `aria-label` and `data-testid`; iOS and Android keep the native props.
 * No React Native import, so the tests can load this file.
 */

export type SelectItemA11yProps =
  | { "aria-label": string; "data-testid"?: string }
  | { accessibilityLabel: string; testID?: string };

/**
 * Spread on the `SelectItem`. Pass `Platform.OS` as `os`. Without `testID` the
 * result has no test id key, not one set to `undefined`.
 */
export function selectItemA11yProps(
  { label, testID }: { label: string; testID?: string },
  os: string,
): SelectItemA11yProps {
  if (os === "web") {
    return testID === undefined ? { "aria-label": label } : { "aria-label": label, "data-testid": testID };
  }
  return testID === undefined ? { accessibilityLabel: label } : { accessibilityLabel: label, testID };
}

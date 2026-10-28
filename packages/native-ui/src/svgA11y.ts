/**
 * Accessibility and test props for a `react-native-svg` `Svg`. React Native
 * Web maps `accessible`, the `accessibility*` props and `testID` on `View`
 * and `Text`, but on web `Svg` is a DOM `<svg>` that takes its props as they
 * are, so React logs each one as an unknown DOM prop. Web gets ARIA and
 * `data-testid`; iOS and Android keep the native props. No React Native
 * import, so the tests can load this file.
 */

export type SvgA11yProps =
  | { role: "img"; "aria-label": string; "data-testid"?: string }
  | { "aria-hidden": true; "data-testid"?: string }
  | { accessible: true; accessibilityRole: "image"; accessibilityLabel: string; testID?: string }
  | {
      accessible: false;
      accessibilityElementsHidden: true;
      importantForAccessibility: "no-hide-descendants";
      testID?: string;
    };

/**
 * Spread on the `Svg`. With `title` it is an image with that name; without it,
 * it is hidden from assistive tech. Pass `Platform.OS` as `os`.
 */
export function svgA11yProps(
  { title, testID }: { title?: string; testID?: string },
  os: string,
): SvgA11yProps {
  if (os === "web") {
    return title
      ? { role: "img", "aria-label": title, "data-testid": testID }
      : { "aria-hidden": true, "data-testid": testID };
  }
  return title
    ? { accessible: true, accessibilityRole: "image", accessibilityLabel: title, testID }
    : {
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants",
        testID,
      };
}

import * as React from "react";
import type { IconProps as TablerIconProps } from "@tabler/icons-react-native";

// Tabler, not Lucide: a Lucide icon always sets `testID` on its `Svg`, which
// on web is a DOM `<svg>`, so React logs it as an unknown DOM prop.
type IconProps = TablerIconProps & {
  as: React.ComponentType<TablerIconProps>;
  className?: string;
};

function Icon({ as: Component, className: _className, ...props }: IconProps) {
  return <Component {...props} />;
}

export { Icon };
export type { IconProps };

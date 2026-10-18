// Stands in for the app `@vv/ui` wrapper: the package plus the app adapters the original JSX imports.
import type { ComponentProps } from "react";
import {
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../../../src/ui/dropdown-menu";

export * from "../../../../src";
export { FadePresence } from "../../../../src/composer/input-area/FadePresence";
export {
  DropdownMenu as Dropdown,
  DropdownMenuItem as DropdownItem,
  DropdownMenuSeparator as DropdownSeparator,
} from "../../../../src/ui/dropdown-menu";
export { DropdownMenuContent as DropdownMenu };
export function DropdownTrigger(props: ComponentProps<typeof DropdownMenuTrigger>) {
  return <DropdownMenuTrigger asChild {...props} />;
}

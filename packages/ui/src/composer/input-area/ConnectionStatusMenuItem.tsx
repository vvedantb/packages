import type { ReactNode } from "react";
import { DropdownMenuItem } from "../../ui/dropdown-menu";

export type ConnectionStatusMenuItemProps = {
  /** Brand mark with its own status dot. The app owns it. */
  icon: ReactNode;
  label: ReactNode;
  /** Shown under the label while `connected` is true. */
  description?: ReactNode;
  connected: boolean;
  onClick?: () => void;
  title?: string;
};

/** Menu row that shows a connection state, for example an external tool hub. */
export function ConnectionStatusMenuItem({
  icon,
  label,
  description,
  connected,
  onClick,
  title,
}: ConnectionStatusMenuItemProps) {
  return (
    <DropdownMenuItem
      startContent={icon}
      description={connected ? description : undefined}
      title={title}
      onClick={onClick}
    >
      {label}
    </DropdownMenuItem>
  );
}

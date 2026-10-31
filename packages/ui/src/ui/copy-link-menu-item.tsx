import { IconLink } from "@tabler/icons-react";
import { DropdownMenuItem } from "./dropdown-menu";

/**
 * A "Copy link" item for a More menu: copies the current page URL. Pass `path`
 * when the current URL is not the link to share (a per-user route that shows
 * different content to each person, say); it resolves against the origin.
 */
export function CopyLinkMenuItem({
  iconSize = 14,
  path,
  label = "Copy link",
}: {
  iconSize?: number;
  path?: string;
  label?: string;
}) {
  return (
    <DropdownMenuItem
      onClick={() => {
        const href = path ? new URL(path, window.location.origin).href : window.location.href;
        void navigator.clipboard.writeText(href);
      }}
    >
      <IconLink size={iconSize} />
      {label}
    </DropdownMenuItem>
  );
}

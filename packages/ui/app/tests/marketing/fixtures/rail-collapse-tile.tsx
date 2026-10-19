// The collapse tile from the `footer` of app-a's, app-b's and app-e's
// SidebarRail.tsx. The three copies are identical apart from the names of the
// two props (app-b: `isPanelCollapsed` / `onToggle`).
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpandFilled,
} from "@tabler/icons-react";
import { RailTile } from "../../../../src/index";

export function CollapseTileCopy({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const collapseLabel = isCollapsed ? "Show sidebar" : "Hide sidebar";
  return (
    <RailTile label={collapseLabel} onClick={onToggleCollapse}>
      {isCollapsed ? (
        <IconLayoutSidebarLeftExpandFilled className="size-[22px]" />
      ) : (
        <IconLayoutSidebarLeftCollapse className="size-[22px]" />
      )}
    </RailTile>
  );
}

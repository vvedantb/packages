// Stand-in for the app connection row: same props the package component takes.
import { DropdownItem } from "@vv/ui";
import { BrandMarkMock, CONNECTION_TITLE } from "../shared";

export function ConnectionMenuItem() {
  return (
    <DropdownItem
      startContent={<BrandMarkMock />}
      description="12 tools"
      title={CONNECTION_TITLE}
    >
      Connections
    </DropdownItem>
  );
}

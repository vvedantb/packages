import type { ReactNode } from "react";
import { IconChevronDown, IconFilter, IconLayoutGrid, IconList } from "@tabler/icons-react";
import { ARTIFACT_TYPES, type ArtifactType } from "@vvedantb/server";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SearchInput } from "../ui/search-input";
import { cn } from "../utils/cn";
import type { ArtifactLayout } from "./artifact-card";
import { ARTIFACT_TYPE_LABELS, ArtifactTypeIcon } from "./artifact-type-icon";

const ALL = "all";
const LAYOUTS: readonly ArtifactLayout[] = ["grid", "list"];

export type ArtifactListToolbarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  /** Selected type; `undefined` is "All types". */
  type?: ArtifactType;
  /** Omit to hide the type filter. */
  onTypeChange?: (type: ArtifactType | undefined) => void;
  /** Types offered in the filter. Default every `ARTIFACT_TYPES` entry. */
  types?: readonly ArtifactType[];
  layout?: ArtifactLayout;
  /** Omit to hide the grid and list toggle. */
  onLayoutChange?: (layout: ArtifactLayout) => void;
  /** Default "Search artifacts...". */
  searchPlaceholder?: string;
  /** Extra controls at the end, e.g. a create button. */
  children?: ReactNode;
  className?: string;
};

/** Search field, type filter and grid or list toggle above an `ArtifactList`. Controlled: it holds no state. */
export function ArtifactListToolbar({
  query,
  onQueryChange,
  type,
  onTypeChange,
  types = ARTIFACT_TYPES,
  layout = "grid",
  onLayoutChange,
  searchPlaceholder = "Search artifacts...",
  children,
  className,
}: ArtifactListToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <SearchInput
        variant="toolbar"
        value={query}
        onChange={onQueryChange}
        placeholder={searchPlaceholder}
        label="Search artifacts"
      />
      {onTypeChange ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label="Filter by type"
              startContent={type ? <ArtifactTypeIcon type={type} /> : <IconFilter size={16} />}
              endContent={<IconChevronDown size={14} className="text-muted-foreground" />}
            >
              {type ? ARTIFACT_TYPE_LABELS[type] : "All types"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent fitViewport suppressAltKey restoreScrollLockOnClose align="start">
            <DropdownMenuRadioGroup
              value={type ?? ALL}
              onValueChange={(value) => onTypeChange(types.find((candidate) => candidate === value))}
            >
              <DropdownMenuRadioItem value={ALL}>All types</DropdownMenuRadioItem>
              <DropdownMenuSeparator />
              {types.map((candidate) => (
                <DropdownMenuRadioItem key={candidate} value={candidate}>
                  {ARTIFACT_TYPE_LABELS[candidate]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {onLayoutChange ? (
        <div className="flex items-center gap-1">
          {LAYOUTS.map((option) => (
            <Button
              key={option}
              size="icon-sm"
              variant="ghost"
              aria-label={option === "grid" ? "Grid view" : "List view"}
              aria-pressed={layout === option}
              className={layout === option ? "bg-default text-foreground" : undefined}
              onClick={() => onLayoutChange(option)}
            >
              {option === "grid" ? <IconLayoutGrid size={16} /> : <IconList size={16} />}
            </Button>
          ))}
        </div>
      ) : null}
      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

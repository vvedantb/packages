import { IconCheck, IconChevronDown, IconHistory, IconRestore } from "@tabler/icons-react";
import { toast } from "sonner";
import { formatCompactRelativeTime } from "../../app/src/time/compactRelativeTime";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { ArtifactVersionSummary } from "./types";

export type ArtifactVersionsMenuProps = {
  versions: readonly ArtifactVersionSummary[];
  currentVersion: number;
  /** The version on screen. Default `currentVersion`. */
  viewingVersion?: number;
  /** Show a version. Without it, picking an older version restores it. */
  onViewVersion?: (version: number) => void;
  /** Make a version current. With `onViewVersion`, offered as "Restore vN" while an older version is on screen. */
  onRestoreVersion?: (version: number) => void | Promise<void>;
  className?: string;
};

/** "vN" menu listing the kept versions, newest first, to view or restore one. */
export function ArtifactVersionsMenu({
  versions,
  currentVersion,
  viewingVersion = currentVersion,
  onViewVersion,
  onRestoreVersion,
  className,
}: ArtifactVersionsMenuProps) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  const restore = async (version: number) => {
    try {
      await onRestoreVersion?.(version);
    } catch {
      toast.error("Couldn't restore version");
    }
  };

  const pick = (version: number) => {
    if (onViewVersion) onViewVersion(version);
    else if (version !== currentVersion) void restore(version);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Versions"
          className={className}
          startContent={<IconHistory size={16} />}
          endContent={<IconChevronDown size={14} />}
        >
          v{viewingVersion}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent fitViewport suppressAltKey restoreScrollLockOnClose align="end" className="min-w-52">
        <DropdownMenuLabel>Versions</DropdownMenuLabel>
        {sorted.map((entry) => {
          const current = entry.version === currentVersion;
          const time = formatCompactRelativeTime(entry.createdAt);
          return (
            <DropdownMenuItem
              key={entry.version}
              data-version={entry.version}
              disabled={!onViewVersion && (current || !onRestoreVersion)}
              startContent={
                entry.version === viewingVersion ? <IconCheck size={16} /> : <span aria-hidden className="size-4" />
              }
              description={entry.title ? `${time} · ${entry.title}` : time}
              endContent={
                current ? (
                  <span className="text-xs text-muted-foreground">Current</span>
                ) : !onViewVersion && onRestoreVersion ? (
                  <span className="text-xs text-muted-foreground">Restore</span>
                ) : undefined
              }
              onClick={() => pick(entry.version)}
            >
              v{entry.version}
            </DropdownMenuItem>
          );
        })}
        {onViewVersion && onRestoreVersion && viewingVersion !== currentVersion ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem startContent={<IconRestore size={16} />} onClick={() => void restore(viewingVersion)}>
              Restore v{viewingVersion}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

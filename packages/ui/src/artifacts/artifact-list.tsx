import type { ReactNode } from "react";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { EmptyState } from "../ui/empty-state";
import { cn } from "../utils/cn";
import { ArtifactCard, type ArtifactCardActions, type ArtifactLayout } from "./artifact-card";
import type { ArtifactSummary } from "./types";

export type ArtifactListProps = ArtifactCardActions & {
  artifacts: readonly ArtifactSummary[];
  /** `"grid"` (default): tiles in up to three columns. `"list"`: compact rows. */
  layout?: ArtifactLayout;
  /** Default "No artifacts yet". */
  emptyTitle?: ReactNode;
  /** Default "Artifacts you save show up here." */
  emptyDescription?: ReactNode;
  /** Buttons under the empty message, e.g. a create button. */
  emptyActions?: ReactNode;
  className?: string;
};

/** Artifacts as a grid or a list of `ArtifactCard`s, or an empty state when there are none. */
export function ArtifactList({
  artifacts,
  layout = "grid",
  emptyTitle = "No artifacts yet",
  emptyDescription = "Artifacts you save show up here.",
  emptyActions,
  className,
  ...actions
}: ArtifactListProps) {
  if (artifacts.length === 0) {
    return (
      <EmptyState.Root className={cn("min-h-80 flex-1", className)}>
        <EmptyState.Icon icon={IconLayoutDashboard} size={28} className="opacity-50" />
        <EmptyState.Title>{emptyTitle}</EmptyState.Title>
        <EmptyState.Description className="max-w-sm text-xs leading-relaxed">{emptyDescription}</EmptyState.Description>
        {emptyActions ? <EmptyState.Actions>{emptyActions}</EmptyState.Actions> : null}
      </EmptyState.Root>
    );
  }

  return (
    <div
      className={cn(
        layout === "list" ? "flex flex-col gap-0.5" : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.id} artifact={artifact} layout={layout} {...actions} />
      ))}
    </div>
  );
}

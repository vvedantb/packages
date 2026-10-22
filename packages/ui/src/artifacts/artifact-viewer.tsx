import type { ReactNode } from "react";
import { IconCopy, IconDownload, IconExternalLink, IconPencil, IconTrash } from "@tabler/icons-react";
import { ARTIFACT_FORMAT_FILES } from "@vvedantb/server";
import { skipConfirmTitle } from "../../app/src/confirm/ConfirmSkipHint";
import { Artifact, ArtifactAction, ArtifactActions, ArtifactHeader, ArtifactTitle } from "../ai-elements/artifact";
import { TooltipProvider } from "../ui/tooltip";
import { cn } from "../utils/cn";
import { useArtifactEditDialogs, type ArtifactEditCallbacks } from "./artifact-dialogs";
import { copyArtifactBody, downloadArtifactBody, openArtifactInNewTab } from "./artifact-file";
import { ArtifactRender, type ArtifactRenderProps } from "./artifact-render";
import { ArtifactTypeIcon } from "./artifact-type-icon";
import { ArtifactVersionsMenu, type ArtifactVersionsMenuProps } from "./artifact-versions-menu";
import type { ArtifactDocument, ArtifactVersionSummary } from "./types";

export type ArtifactViewerProps = ArtifactEditCallbacks &
  Pick<ArtifactRenderProps, "store" | "stateGlobalAliases"> &
  Pick<ArtifactVersionsMenuProps, "viewingVersion" | "onViewVersion" | "onRestoreVersion"> & {
    /** The artifact, with the body of the version on screen. */
    artifact: ArtifactDocument;
    /** Kept versions for the versions menu. Omit to hide the menu. */
    versions?: readonly ArtifactVersionSummary[];
    /** The artifact's own page, for "Open in new tab". Omit to hide the button. */
    href?: string;
    /** Before the title, e.g. a back link from the app's router. */
    headerStart?: ReactNode;
    /** Extra header actions, before Delete. */
    actions?: ReactNode;
    className?: string;
  };

/**
 * One artifact: a header with the title and its actions (versions, rename,
 * copy, download as the format's file, open in new tab, delete) above the
 * rendered body. Rename and delete go through confirm dialogs; Alt-click on
 * Delete skips the dialog.
 */
export function ArtifactViewer({
  artifact,
  store,
  stateGlobalAliases,
  versions,
  viewingVersion,
  onViewVersion,
  onRestoreVersion,
  href,
  onRename,
  onDelete,
  headerStart,
  actions,
  className,
}: ArtifactViewerProps) {
  const edit = useArtifactEditDialogs({ title: artifact.title, onRename, onDelete });
  const extension = ARTIFACT_FORMAT_FILES[artifact.format].extension;
  const actionClass = "h-8 min-w-8";

  return (
    <TooltipProvider>
      <Artifact className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
        <ArtifactHeader className="items-center">
          <div className="flex min-w-0 items-center gap-2">
            {headerStart}
            <ArtifactTypeIcon type={artifact.type} />
            <ArtifactTitle className="truncate">{artifact.title}</ArtifactTitle>
          </div>
          <ArtifactActions className="shrink-0">
            {versions ? (
              <ArtifactVersionsMenu
                versions={versions}
                currentVersion={artifact.currentVersion}
                viewingVersion={viewingVersion}
                onViewVersion={onViewVersion}
                onRestoreVersion={onRestoreVersion}
              />
            ) : null}
            {onRename ? (
              <ArtifactAction
                tooltip="Rename"
                size="icon-sm"
                className={actionClass}
                icon={<IconPencil size={16} />}
                onClick={edit.startRename}
              />
            ) : null}
            <ArtifactAction
              tooltip="Copy"
              size="icon-sm"
              className={actionClass}
              icon={<IconCopy size={16} />}
              onClick={() => void copyArtifactBody(artifact.body)}
            />
            <ArtifactAction
              tooltip={`Download .${extension}`}
              label="Download"
              size="icon-sm"
              className={actionClass}
              icon={<IconDownload size={16} />}
              onClick={() => downloadArtifactBody(artifact.title, artifact.format, artifact.body)}
            />
            {href !== undefined ? (
              <ArtifactAction
                tooltip="Open in new tab"
                size="icon-sm"
                className={actionClass}
                icon={<IconExternalLink size={16} />}
                onClick={() => openArtifactInNewTab(href)}
              />
            ) : null}
            {actions}
            {onDelete ? (
              <ArtifactAction
                tooltip={skipConfirmTitle("Delete")}
                label="Delete"
                size="icon-sm"
                className={cn(actionClass, "text-danger hover:text-danger")}
                icon={<IconTrash size={16} />}
                onClick={(event) => edit.requestDelete(event)}
              />
            ) : null}
          </ArtifactActions>
        </ArtifactHeader>
        <div className="min-h-0 flex-1 overflow-hidden bg-surface-secondary">
          <ArtifactRender
            artifact={artifact}
            store={store}
            stateGlobalAliases={stateGlobalAliases}
            className="h-full min-h-64"
          />
        </div>
      </Artifact>
      {edit.dialogs}
    </TooltipProvider>
  );
}

import type { MouseEvent, ReactNode } from "react";
import {
  IconCopy,
  IconDots,
  IconDownload,
  IconExternalLink,
  IconLayoutDashboard,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { ConfirmSkipHint, skipConfirmTitle } from "../../app/src/confirm/ConfirmSkipHint";
import { formatCompactRelativeTime } from "../../app/src/time/compactRelativeTime";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { cn } from "../utils/cn";
import { useArtifactEditDialogs } from "./artifact-dialogs";
import { copyArtifactBody, downloadArtifactBody, openArtifactInNewTab } from "./artifact-file";
import { ArtifactTypeIcon } from "./artifact-type-icon";
import type { ArtifactSummary } from "./types";

export type ArtifactLayout = "grid" | "list";

/** Callbacks shared by `ArtifactCard` and `ArtifactList`. Each menu action shows only when its callback is set. */
export type ArtifactCardActions = {
  /** Open the artifact. With `getHref`, a plain left click calls this instead of following the link. */
  onOpen?: (artifact: ArtifactSummary) => void;
  /** Link target: the card becomes an `<a>` and the menu gains "Open in new tab". */
  getHref?: (artifact: ArtifactSummary) => string;
  /** Loads the body for Copy and Download (list rows carry no body). */
  getBody?: (artifact: ArtifactSummary) => Promise<string>;
  /** Called with the trimmed new title from the rename dialog. */
  onRename?: (artifact: ArtifactSummary, title: string) => void | Promise<void>;
  /** Called after the delete dialog, or straight away on an Alt-click. */
  onDelete?: (artifact: ArtifactSummary) => void | Promise<void>;
};

export type ArtifactCardProps = ArtifactCardActions & {
  artifact: ArtifactSummary;
  /** `"grid"` (default): a tile with the description. `"list"`: one compact row. */
  layout?: ArtifactLayout;
  className?: string;
};

type MenuAction = {
  label: string;
  icon: ReactNode;
  onSelect: (event: MouseEvent) => void;
  destructive?: boolean;
};

function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

const menuTriggerClass =
  "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring data-[state=open]:bg-surface-tertiary";

/**
 * One artifact as a grid tile or a list row, with an actions menu (also on
 * right-click) and the rename and delete dialogs. Data comes in through props
 * and leaves through callbacks; the card makes no requests of its own.
 */
export function ArtifactCard({
  artifact,
  layout = "grid",
  onOpen,
  getHref,
  getBody,
  onRename,
  onDelete,
  className,
}: ArtifactCardProps) {
  const edit = useArtifactEditDialogs({
    title: artifact.title,
    onRename: onRename && ((title) => onRename(artifact, title)),
    onDelete: onDelete && (() => onDelete(artifact)),
  });
  const href = getHref?.(artifact);

  const withBody = (use: (body: string) => void | Promise<void>) => {
    if (!getBody) return;
    void getBody(artifact).then(use, () => toast.error("Couldn't load artifact"));
  };

  const actions: MenuAction[] = [];
  if (onOpen) actions.push({ label: "Open", icon: <IconLayoutDashboard size={16} />, onSelect: () => onOpen(artifact) });
  if (href !== undefined) {
    actions.push({ label: "Open in new tab", icon: <IconExternalLink size={16} />, onSelect: () => openArtifactInNewTab(href) });
  }
  if (onRename) actions.push({ label: "Rename", icon: <IconPencil size={16} />, onSelect: edit.startRename });
  if (getBody) {
    actions.push({ label: "Copy", icon: <IconCopy size={16} />, onSelect: () => withBody(copyArtifactBody) });
    actions.push({
      label: "Download",
      icon: <IconDownload size={16} />,
      onSelect: () => withBody((body) => downloadArtifactBody(artifact.title, artifact.format, body)),
    });
  }
  if (onDelete) {
    actions.push({ label: "Delete", icon: <IconTrash size={16} />, onSelect: edit.requestDelete, destructive: true });
  }

  const itemProps = (action: MenuAction) => ({
    className: action.destructive ? "text-danger" : undefined,
    startContent: action.icon,
    title: action.destructive ? skipConfirmTitle(action.label) : undefined,
    endContent: action.destructive ? <ConfirmSkipHint /> : undefined,
    onClick: action.onSelect,
  });

  const list = layout === "list";
  const openClass = cn(
    "transition-[background-color,transform] duration-200 ease-smooth active:scale-[0.99] active:duration-100",
    list
      ? "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-secondary"
      : "flex h-full w-full flex-col gap-2 rounded-surface bg-surface-secondary p-4 text-left hover:bg-surface-tertiary",
  );
  const updated = <span className="shrink-0 text-xs text-muted-foreground">{formatCompactRelativeTime(artifact.updatedAt)}</span>;
  const content = list ? (
    <>
      <ArtifactTypeIcon type={artifact.type} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{artifact.title}</span>
      {updated}
    </>
  ) : (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <ArtifactTypeIcon type={artifact.type} size={18} />
        <span className="truncate text-sm font-medium text-foreground">{artifact.title}</span>
      </span>
      {artifact.description ? (
        <span className="line-clamp-2 text-sm text-muted-foreground">{artifact.description}</span>
      ) : null}
      <span className="mt-auto pr-8">{updated}</span>
    </>
  );

  const openTarget =
    href !== undefined ? (
      <a
        href={href}
        className={openClass}
        onClick={(event) => {
          if (!onOpen || !isPlainClick(event)) return;
          event.preventDefault();
          onOpen(artifact);
        }}
      >
        {content}
      </a>
    ) : onOpen ? (
      <button type="button" className={openClass} onClick={() => onOpen(artifact)}>
        {content}
      </button>
    ) : (
      <div className={openClass}>{content}</div>
    );

  const menu =
    actions.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Artifact actions"
            className={cn(menuTriggerClass, list ? "shrink-0" : "absolute bottom-3 right-2")}
          >
            <IconDots className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent fitViewport suppressAltKey restoreScrollLockOnClose align="end">
          {actions.map((action) => (
            <DropdownMenuItem key={action.label} {...itemProps(action)}>
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const card = (
    <div
      data-artifact-id={artifact.id}
      className={cn("relative", list ? "flex items-center gap-2" : "h-full", className)}
    >
      {openTarget}
      {menu}
    </div>
  );

  return (
    <>
      {actions.length > 0 ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
          <ContextMenuContent suppressAltKey>
            {actions.map((action) => (
              <ContextMenuItem key={action.label} {...itemProps(action)}>
                {action.label}
              </ContextMenuItem>
            ))}
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        card
      )}
      {edit.dialogs}
    </>
  );
}

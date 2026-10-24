"use client";
import type { FileUIPart, SourceDocumentUIPart } from "ai";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { Button } from "../ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { cn } from "../utils/cn";
import {
  flatElevatedSurfaceHoverClass,
  flatPanelSubtleClass,
} from "../ui/surface-classes";
import { useCn, useUiConfig } from "../ui/ui-config";
import {
  IconFileText,
  IconMusic,
  IconPaperclip,
  IconPhoto,
  IconVideo,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { createContext, useContext } from "react";
// ============================================================================
// Types
// ============================================================================
export type AttachmentData =
  | (FileUIPart & {
      id: string;
    })
  | (SourceDocumentUIPart & {
      id: string;
    });
export type AttachmentMediaCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "source"
  | "unknown";
export type AttachmentVariant = "grid" | "inline" | "list";
/**
 * `UiConfig.Attachments`: per-variant classes that replace the variant part
 * of an `Attachment`, its `AttachmentPreview` and its `AttachmentRemove`.
 * The shared base classes stay.
 */
export interface AttachmentsConfig {
  classes?: {
    item?: Partial<Record<AttachmentVariant, string>>;
    preview?: Partial<Record<AttachmentVariant, string>>;
    remove?: Partial<Record<AttachmentVariant, string>>;
  };
}
const mediaCategoryIcons: Record<AttachmentMediaCategory, typeof IconPhoto> = {
  audio: IconMusic,
  document: IconFileText,
  image: IconPhoto,
  source: IconWorld,
  unknown: IconPaperclip,
  video: IconVideo,
};
// ============================================================================
// Utility Functions
// ============================================================================
export const getMediaCategory = (
  data: AttachmentData,
): AttachmentMediaCategory => {
  if (data.type === "source-document") {
    return "source";
  }
  const mediaType = data.mediaType ?? "";
  if (mediaType.startsWith("image/")) {
    return "image";
  }
  if (mediaType.startsWith("video/")) {
    return "video";
  }
  if (mediaType.startsWith("audio/")) {
    return "audio";
  }
  if (mediaType.startsWith("application/") || mediaType.startsWith("text/")) {
    return "document";
  }
  return "unknown";
};
export const getAttachmentLabel = (data: AttachmentData): string => {
  if (data.type === "source-document") {
    return data.title || data.filename || "Source";
  }
  const category = getMediaCategory(data);
  return data.filename || (category === "image" ? "Image" : "Attachment");
};
const renderAttachmentImage = (
  url: string,
  filename: string | undefined,
  isGrid: boolean,
) =>
  isGrid ? (
    <img
      alt={filename || "Image"}
      className="size-full object-cover"
      height={96}
      src={url}
      width={96}
    />
  ) : (
    <img
      alt={filename || "Image"}
      className="size-full rounded object-cover"
      height={20}
      src={url}
      width={20}
    />
  );
// ============================================================================
// Contexts
// ============================================================================
interface AttachmentsContextValue {
  variant: AttachmentVariant;
}
const AttachmentsContext = createContext<AttachmentsContextValue | null>(null);
interface AttachmentContextValue {
  data: AttachmentData;
  mediaCategory: AttachmentMediaCategory;
  onRemove?: () => void;
  variant: AttachmentVariant;
}
const AttachmentContext = createContext<AttachmentContextValue | null>(null);
// ============================================================================
// Hooks
// ============================================================================
export const useAttachmentsContext = () =>
  useContext(AttachmentsContext) ?? { variant: "grid" as const };
export const useAttachmentContext = () => {
  const ctx = useContext(AttachmentContext);
  if (!ctx) {
    throw new Error("Attachment components must be used within <Attachment>");
  }
  return ctx;
};
// ============================================================================
// Attachments - Container
// ============================================================================
export type AttachmentsProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AttachmentVariant;
};
export const Attachments = ({
  variant = "grid",
  className,
  children,
  ...props
}: AttachmentsProps) => {
  const merge = useCn();
  const contextValue = { variant };
  return (
    <AttachmentsContext.Provider value={contextValue}>
      <div
        className={merge(
          "flex items-start",
          variant === "list" ? "flex-col gap-2" : "flex-wrap gap-2",
          variant === "grid" && "ml-auto w-fit",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentsContext.Provider>
  );
};
// ============================================================================
// Attachment - Item
// ============================================================================
export type AttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: AttachmentData;
  onRemove?: () => void;
};
export const Attachment = ({
  data,
  onRemove,
  className,
  children,
  ...props
}: AttachmentProps) => {
  const { variant } = useAttachmentsContext();
  const item = useUiConfig("Attachments")?.classes?.item?.[variant];
  const merge = useCn();
  const mediaCategory = getMediaCategory(data);
  const contextValue = { data, mediaCategory, onRemove, variant };
  return (
    <AttachmentContext.Provider value={contextValue}>
      <div
        className={merge(
          "group relative",
          item,
          item === undefined && variant === "grid" && "size-24 overflow-hidden rounded-lg",
          item === undefined && variant === "inline" && [
            "flex h-8 cursor-pointer select-none items-center gap-1.5",
            "rounded-md px-1.5",
            "font-medium text-sm transition-[background-color,color,transform] duration-150 ease-out",
            "active:scale-[0.97] hover:bg-surface-secondary hover:text-foreground",
          ],
          item === undefined && variant === "list" && [
            "flex w-full items-center gap-3 rounded-lg p-3",
            "transition-[background-color,transform] duration-150 ease-out active:scale-[0.99] hover:bg-surface-secondary",
          ],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentContext.Provider>
  );
};
// ============================================================================
// AttachmentPreview - Media preview
// ============================================================================
export type AttachmentPreviewProps = HTMLAttributes<HTMLDivElement> & {
  fallbackIcon?: ReactNode;
};
export const AttachmentPreview = ({
  fallbackIcon,
  className,
  ...props
}: AttachmentPreviewProps) => {
  const { data, mediaCategory, variant } = useAttachmentContext();
  const preview = useUiConfig("Attachments")?.classes?.preview?.[variant];
  const merge = useCn();
  const iconSize = variant === "inline" ? "size-3" : "size-4";
  const renderIcon = (Icon: typeof IconPhoto) => (
    <Icon className={cn(iconSize, "text-muted-foreground")} />
  );
  const renderContent = () => {
    if (mediaCategory === "image" && data.type === "file" && data.url) {
      return renderAttachmentImage(data.url, data.filename, variant === "grid");
    }
    if (mediaCategory === "video" && data.type === "file" && data.url) {
      return <video className="size-full object-cover" muted src={data.url} />;
    }
    const Icon = mediaCategoryIcons[mediaCategory];
    return fallbackIcon ?? renderIcon(Icon);
  };
  return (
    <div
      className={merge(
        "flex shrink-0 items-center justify-center overflow-hidden",
        preview,
        preview === undefined && variant === "grid" && cn("size-full", flatPanelSubtleClass),
        preview === undefined && variant === "inline" && cn("size-5 rounded", flatPanelSubtleClass),
        preview === undefined && variant === "list" && cn("size-12 rounded", flatPanelSubtleClass),
        className,
      )}
      {...props}
    >
      {renderContent()}
    </div>
  );
};
// ============================================================================
// AttachmentInfo - Name and type display
// ============================================================================
export type AttachmentInfoProps = HTMLAttributes<HTMLDivElement> & {
  showMediaType?: boolean;
};
export const AttachmentInfo = ({
  showMediaType = false,
  className,
  ...props
}: AttachmentInfoProps) => {
  const { data, variant } = useAttachmentContext();
  const merge = useCn();
  const label = getAttachmentLabel(data);
  if (variant === "grid") {
    return null;
  }
  return (
    <div className={merge("min-w-0 flex-1", className)} {...props}>
      <span className="block truncate">{label}</span>
      {showMediaType && data.mediaType && (
        <span className="block truncate text-muted-foreground text-xs">
          {data.mediaType}
        </span>
      )}
    </div>
  );
};
// ============================================================================
// AttachmentRemove - Remove button
// ============================================================================
export type AttachmentRemoveProps = ComponentProps<typeof Button> & {
  label?: string;
};
export const AttachmentRemove = ({
  label = "Remove",
  className,
  children,
  ...props
}: AttachmentRemoveProps) => {
  const { onRemove, variant } = useAttachmentContext();
  const remove = useUiConfig("Attachments")?.classes?.remove?.[variant];
  const merge = useCn();
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };
  if (!onRemove) {
    return null;
  }
  return (
    <Button
      aria-label={label}
      className={merge(
        remove,
        remove === undefined && variant === "grid" && [
          "absolute top-2 right-2 size-6 rounded-full p-0",
          cn(flatPanelSubtleClass, flatElevatedSurfaceHoverClass),
          "opacity-0 transition-opacity group-hover:opacity-100",
          "[&>svg]:size-3",
        ],
        remove === undefined && variant === "inline" && [
          "size-5 rounded p-0",
          "opacity-0 transition-opacity group-hover:opacity-100",
          "[&>svg]:size-2.5",
        ],
        remove === undefined && variant === "list" && ["size-8 shrink-0 rounded p-0", "[&>svg]:size-4"],
        className,
      )}
      onClick={handleClick}
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <IconX />}
      <span className="sr-only">{label}</span>
    </Button>
  );
};
// ============================================================================
// AttachmentHoverCard - Hover preview
// ============================================================================
export type AttachmentHoverCardProps = ComponentProps<typeof HoverCard>;
export const AttachmentHoverCard = ({
  openDelay = 0,
  closeDelay = 0,
  ...props
}: AttachmentHoverCardProps) => (
  <HoverCard closeDelay={closeDelay} openDelay={openDelay} {...props} />
);
export type AttachmentHoverCardTriggerProps = ComponentProps<
  typeof HoverCardTrigger
>;
export const AttachmentHoverCardTrigger = (
  props: AttachmentHoverCardTriggerProps,
) => <HoverCardTrigger {...props} />;
export type AttachmentHoverCardContentProps = ComponentProps<
  typeof HoverCardContent
>;
export const AttachmentHoverCardContent = ({
  align = "start",
  className,
  ...props
}: AttachmentHoverCardContentProps) => {
  const merge = useCn();
  return (
    <HoverCardContent
      align={align}
      className={merge("w-auto p-2", className)}
      {...props}
    />
  );
};
// ============================================================================
// AttachmentEmpty - Empty state
// ============================================================================
export type AttachmentEmptyProps = HTMLAttributes<HTMLDivElement>;
export const AttachmentEmpty = ({
  className,
  children,
  ...props
}: AttachmentEmptyProps) => {
  const merge = useCn();
  return (
    <div
      className={merge(
        "flex items-center justify-center p-4 text-muted-foreground text-sm",
        className,
      )}
      {...props}
    >
      {children ?? "No attachments"}
    </div>
  );
};

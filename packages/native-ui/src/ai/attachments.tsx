import { createContext, useContext, type ComponentType } from "react";
import { Image, Pressable, View, type ViewProps } from "react-native";
import {
  IconFileText,
  IconMusic,
  IconPaperclip,
  IconPhoto,
  IconVideo,
  IconWorld,
  IconX,
  type IconProps,
} from "@tabler/icons-react-native";
import { cn } from "../cn";
import { touchSlop } from "../controlStyles";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { ResponseText } from "./response-text";

/**
 * A file or source attached to a prompt or message. The fields the web reads
 * from the `ai` SDK `FileUIPart` and `SourceDocumentUIPart`, without the SDK.
 */
export type AttachmentData = {
  id: string;
  /** `"source-document"` for a referenced source. Default a file. */
  type?: "file" | "source-document";
  filename?: string;
  /** MIME type, such as `image/png`. */
  mediaType?: string;
  /** A local or remote URI. An image with one shows a thumbnail. */
  url?: string;
  /** A source document's title. */
  title?: string;
};

export type AttachmentMediaCategory = "image" | "video" | "audio" | "document" | "source" | "unknown";

const MEDIA_ICONS: Record<AttachmentMediaCategory, ComponentType<IconProps>> = {
  audio: IconMusic,
  document: IconFileText,
  image: IconPhoto,
  source: IconWorld,
  unknown: IconPaperclip,
  video: IconVideo,
};

/** The kind of attachment, from its type and MIME type, as on the web. */
export function getMediaCategory(data: AttachmentData): AttachmentMediaCategory {
  if (data.type === "source-document") return "source";
  const mediaType = data.mediaType ?? "";
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType.startsWith("video/")) return "video";
  if (mediaType.startsWith("audio/")) return "audio";
  if (mediaType.startsWith("application/") || mediaType.startsWith("text/")) return "document";
  return "unknown";
}

/** The name to show and read, as on the web: the title or file name, else "Source", "Image" or "Attachment". */
export function getAttachmentLabel(data: AttachmentData): string {
  if (data.type === "source-document") return data.title || data.filename || "Source";
  return data.filename || (getMediaCategory(data) === "image" ? "Image" : "Attachment");
}

/** `inline` (default) wraps chips in rows; `list` stacks them full width. The web `grid` previews are not ported. */
export type AttachmentVariant = "inline" | "list";

const AttachmentsContext = createContext<AttachmentVariant>("inline");

export type AttachmentsProps = ViewProps & {
  variant?: AttachmentVariant;
  className?: string;
};

/** The attachments of a prompt or message. */
export function Attachments({ variant = "inline", className, ...props }: AttachmentsProps) {
  return (
    <AttachmentsContext.Provider value={variant}>
      <View
        className={cn(variant === "list" ? "gap-2" : "flex-row flex-wrap items-start gap-2", className)}
        {...props}
      />
    </AttachmentsContext.Provider>
  );
}

export type AttachmentProps = {
  data: AttachmentData;
  /** Shows a remove button, labelled "Remove" and the attachment name. */
  onRemove?: () => void;
  testID?: string;
};

/** A remove cross of 20 in a 32 row: the slop brings it to 44. */
const REMOVE_SIZE = 20;

/**
 * One attachment as a chip: a 20 thumbnail for an image with a `url`, else
 * its media icon, then the name and an optional remove button. Flat, on the
 * web `flatPanelSubtle` fill (`bg-surface-secondary`). No hover card.
 */
export function Attachment({ data, onRemove, testID }: AttachmentProps) {
  const variant = useContext(AttachmentsContext);
  const scheme = useScheme();
  const largerText = useLargerText();
  const category = getMediaCategory(data);
  const label = getAttachmentLabel(data);
  const Icon = MEDIA_ICONS[category];
  const iconSize = largerText ? 20 : 16;
  const muted = tokens.color.muted[scheme];
  return (
    <View
      testID={testID}
      className={cn(
        "min-w-0 flex-row items-center gap-1.5 px-2",
        largerText ? "min-h-11" : "min-h-8",
        variant === "list" ? "w-full" : "max-w-full",
      )}
      style={{ borderRadius: tokens.radius.sm, backgroundColor: tokens.color.surfaceSecondary[scheme] }}
    >
      {category === "image" && data.url ? (
        <Image
          source={{ uri: data.url }}
          resizeMode="cover"
          style={{ width: 20, height: 20, borderRadius: 4 }}
        />
      ) : (
        <Icon size={iconSize} color={muted} />
      )}
      <ResponseText
        size="small"
        selectable={false}
        numberOfLines={1}
        ellipsizeMode="middle"
        className={variant === "list" ? "flex-1" : "shrink"}
      >
        {label}
      </ResponseText>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          hitSlop={touchSlop(REMOVE_SIZE)}
          onPress={onRemove}
          className="items-center justify-center rounded-full active:opacity-70"
          style={{ width: REMOVE_SIZE, height: REMOVE_SIZE }}
        >
          <IconX size={largerText ? 16 : 14} color={muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

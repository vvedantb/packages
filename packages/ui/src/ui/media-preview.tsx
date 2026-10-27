import { useState } from "react";
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerFullscreenButton,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerPlaybackRateButton,
  VideoPlayerSeekBackwardButton,
  VideoPlayerSeekForwardButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
} from "../kibo/video-player";
import { ImageLightbox, type GalleryImage } from "./image-lightbox";
import { useCn } from "./ui-config";

/** Hairline ring that separates media from any surface, in light and dark. */
const MEDIA_OUTLINE = "ring-1 ring-black/10 dark:ring-white/10";

/**
 * Twitter-style image gallery: up to a 2x2 grid of cropped
 * tiles (a "+N" overlay on the fourth when more exist) instead of a long
 * stack, opening `ImageLightbox`. Videos are rendered separately
 * (VideoPreview) — this is images only.
 */
export function ImageGalleryPreview({ images }: { images: GalleryImage[] }) {
  const cn = useCn();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const count = images.length;
  if (count === 0) return null;

  const tiles = images.slice(0, 4);
  const overflow = count - tiles.length;

  return (
    <>
      {count === 1 ? (
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="block max-w-lg motion-press active:scale-[0.99]"
        >
          <img
            src={images[0]?.url}
            alt={images[0]?.alt ?? "Image"}
            loading="lazy"
            className={`${MEDIA_OUTLINE} rounded-surface max-h-96 max-w-full cursor-pointer transition-opacity hover:opacity-90`}
          />
        </button>
      ) : (
        <div
          className={cn(
            MEDIA_OUTLINE,
            "rounded-surface grid max-w-lg gap-0.5 overflow-hidden",
            "grid-cols-2",
          )}
        >
          {tiles.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className={cn(
                "relative block cursor-pointer motion-press active:scale-[0.99]",
                // Three images: first tile spans the left column, Twitter-style.
                count === 3 && index === 0 ? "row-span-2 h-full" : undefined,
              )}
            >
              <img
                src={image.url}
                alt={image.alt ?? `Image ${index + 1}`}
                loading="lazy"
                className={cn(
                  "h-full w-full object-cover transition-opacity hover:opacity-90",
                  count === 3 && index === 0 ? "min-h-full" : "aspect-4/3",
                )}
              />
              {overflow > 0 && index === tiles.length - 1 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-semibold text-white">
                  +{overflow}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}

/** Video with the full control bar; rate and volume drop out below `sm`. */
export function VideoPreview({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const cn = useCn();
  return (
    <VideoPlayer className={cn("max-w-full", className)}>
      <VideoPlayerContent
        src={url}
        playsInline
        preload="metadata"
        slot="media"
      />
      {/* Nine controls do not fit a phone-width bar. Playback rate and the
          volume slider drop out below `sm` — a phone has hardware volume keys,
          and everything essential (play, scrub, time, mute, fullscreen) stays. */}
      <VideoPlayerControlBar>
        <VideoPlayerPlayButton />
        <VideoPlayerSeekBackwardButton />
        <VideoPlayerSeekForwardButton />
        <VideoPlayerTimeRange />
        <VideoPlayerTimeDisplay showDuration />
        <VideoPlayerPlaybackRateButton
          rates={[1, 3, 5, 8]}
          className="max-sm:hidden"
        />
        <VideoPlayerMuteButton />
        <VideoPlayerVolumeRange className="max-sm:hidden" />
        <VideoPlayerFullscreenButton />
      </VideoPlayerControlBar>
    </VideoPlayer>
  );
}

/** One image that opens `ImageLightbox` on click. */
export function ScreenshotPreview({
  url,
  alt = "Screenshot",
  className,
}: {
  url: string;
  alt?: string;
  className?: string;
}) {
  const cn = useCn();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block">
        <img
          src={url}
          alt={alt}
          className={cn(
            MEDIA_OUTLINE,
            "rounded-surface max-w-full cursor-pointer transition-opacity hover:opacity-90",
            className,
          )}
        />
      </button>
      <ImageLightbox
        images={[{ url, alt }]}
        index={open ? 0 : null}
        onIndexChange={() => undefined}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

import { tokens } from "../tokens";

/** One image in a gallery or the full-screen viewer. */
export type GalleryImage = { url: string; alt?: string };

/**
 * The web `ImageGalleryPreview` metrics: the surface radius, a 2 gap between
 * tiles (`gap-0.5`), 4:3 tiles, a lone image at most 384 high (`max-h-96`) and
 * the hairline ring (`ring-black/10`, `dark:ring-white/10`).
 */
export const MEDIA = {
  radius: tokens.radius.lg,
  gap: 2,
  tileAspect: 4 / 3,
  singleMaxHeight: 384,
  outline: { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.1)" },
} as const;

/** One tile of the grid: which image, whether it fills the left column, and the "+N" it carries. */
export type ImageGridTile = { index: number; spansColumn: boolean; overflow: number };

/**
 * The web gallery grid for `count` images: up to four tiles in two columns.
 * With three, the first fills the left column. Past four, the fourth carries
 * "+N" for the rest. One image is not a grid (see `ImageGallery`).
 */
export function imageGridTiles(count: number): ImageGridTile[] {
  const shown = Math.min(count, 4);
  const overflow = count - shown;
  return Array.from({ length: shown }, (_, index) => ({
    index,
    spansColumn: count === 3 && index === 0,
    overflow: index === shown - 1 ? overflow : 0,
  }));
}

/**
 * Width over height of a lone image, from its own size once loaded, kept
 * between 1:2 and 3:1 so a very tall or wide capture still reads. 4:3 until
 * the size is known.
 */
export function imageAspect(size: { width: number; height: number } | null): number {
  if (!size || size.width <= 0 || size.height <= 0) return MEDIA.tileAspect;
  return Math.min(3, Math.max(0.5, size.width / size.height));
}

/** The viewer's page for a scroll offset, kept in range. */
export function imageViewerPage(offsetX: number, pageWidth: number, count: number): number {
  if (pageWidth <= 0 || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offsetX / pageWidth)));
}

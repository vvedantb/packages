import { createContext, type ComponentType, type ReactNode } from "react";
import type { GalleryImage } from "./imageGrid";

// The seam between `ImageViewer` and its optional zoom (`zoom-image-gesture`),
// kept apart from both so the gesture provider does not load the viewer.

export type ZoomImageProps = {
  image: GalleryImage;
  /** The page's size: the image fits it at zoom 1. */
  width: number;
  height: number;
  /** Called as the image zooms in past fitted size, and back: while zoomed, a drag pans it instead of turning the page. */
  onZoomChange: (zoomed: boolean) => void;
};

/** The zoomable page and the root its gestures need inside the viewer's `Modal`. */
export type ZoomImageParts = {
  Root: ComponentType<{ children: ReactNode }>;
  Image: ComponentType<ZoomImageProps>;
};

/**
 * Pinch, pan and double-tap zoom for `ImageViewer`, from
 * `GestureHandlerProvider` (`@vvedantb/native-ui/gesture-handler`). Without
 * it the viewer shows each image fitted, with no zoom.
 */
export const ZoomImageContext = createContext<ZoomImageParts | null>(null);


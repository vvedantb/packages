import { useState } from "react";
import { FlatList, Image, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconExternalLink, IconX } from "@tabler/icons-react-native";
import { typeStyle } from "../controlStyles";
import { IconButton } from "../IconButton";
import { withAlpha } from "../palette";
import { tokens } from "../tokens";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import { imageAspect, imageGridTiles, imageViewerPage, MEDIA, type GalleryImage, type ImageGridTile } from "./imageGrid";

export type ImageGalleryProps = {
  images: GalleryImage[];
  /** With it, the viewer has an "Open in browser" button that hands it the image's URL. */
  onOpenImage?: (url: string) => void;
  testID?: string;
};

/**
 * The web `ImageGalleryPreview`: one image at its own shape (as wide as the
 * column, at most 384 high), or up to a 2 x 2 grid of 4:3 tiles with "+N" on
 * the fourth. A tap opens `ImageViewer` at that image. Images only; draw
 * videos apart.
 */
export function ImageGallery({ images, onOpenImage, testID }: ImageGalleryProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const first = images[0];
  if (!first) return null;
  return (
    <View testID={testID} className="w-full">
      {images.length === 1 ? (
        <SingleImage image={first} onOpen={() => setViewerIndex(0)} />
      ) : (
        <ImageGrid images={images} onOpen={setViewerIndex} />
      )}
      <ImageViewer
        images={images}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        onOpenImage={onOpenImage}
      />
    </View>
  );
}

/** The hairline-ringed, rounded frame of a gallery image or grid. */
function useMediaFrame() {
  const scheme = useScheme();
  return {
    borderRadius: MEDIA.radius,
    borderWidth: 1,
    borderColor: MEDIA.outline[scheme],
    overflow: "hidden" as const,
    backgroundColor: tokens.color.surfaceSecondary[scheme],
  };
}

/**
 * A lone image, sized from the column and the image's own shape and capped
 * at 384 high, so a tall capture keeps its shape instead of being cropped.
 * Until both are known it holds a full-width 4:3 box.
 */
function SingleImage({ image, onOpen }: { image: GalleryImage; onOpen: () => void }) {
  const frame = useMediaFrame();
  const [columnWidth, setColumnWidth] = useState(0);
  const [loadedSize, setLoadedSize] = useState<{ width: number; height: number } | null>(null);
  const aspect = imageAspect(loadedSize);
  const width = columnWidth > 0 ? Math.min(columnWidth, MEDIA.singleMaxHeight * aspect) : undefined;
  return (
    <View className="w-full" onLayout={(event) => setColumnWidth(event.nativeEvent.layout.width)}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={image.alt ?? "Image"}
        accessibilityHint="Opens full screen"
        onPress={onOpen}
        className="active:opacity-90"
        style={[frame, width === undefined ? { width: "100%", aspectRatio: aspect } : { width, height: width / aspect }]}
      >
        <Image
          source={{ uri: image.url }}
          resizeMode="cover"
          style={{ width: "100%", height: "100%" }}
          onLoad={(event) => setLoadedSize(event.nativeEvent.source)}
        />
      </Pressable>
    </View>
  );
}

/**
 * Two columns of 4:3 tiles, filled as the web grid's rows are: tiles 0 and 2
 * on the left, 1 and 3 on the right. With three, the first fills the left
 * column, as tall as the two on the right.
 */
function ImageGrid({ images, onOpen }: { images: GalleryImage[]; onOpen: (index: number) => void }) {
  const frame = useMediaFrame();
  const tiles = imageGridTiles(images.length);
  const spans = tiles[0]?.spansColumn === true;
  const left = spans ? tiles.slice(0, 1) : tiles.filter((tile) => tile.index % 2 === 0);
  const right = spans ? tiles.slice(1) : tiles.filter((tile) => tile.index % 2 === 1);
  const tileStyle = { width: "100%" as const, aspectRatio: MEDIA.tileAspect };
  const cell = (tile: ImageGridTile) => {
    const image = images[tile.index];
    if (!image) return null;
    const name = image.alt ?? `Image ${tile.index + 1}`;
    return (
      <Pressable
        key={tile.index}
        accessibilityRole="imagebutton"
        accessibilityLabel={tile.overflow > 0 ? `${name}, ${tile.overflow} more` : name}
        accessibilityHint="Opens full screen"
        onPress={() => onOpen(tile.index)}
        className="active:opacity-90"
        style={tile.spansColumn ? { width: "100%", flex: 1 } : tileStyle}
      >
        <Image source={{ uri: image.url }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
        {tile.overflow > 0 ? (
          <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: withAlpha(tokens.color.black, 0.6) }}>
            <Text className="font-instrument-sans-semibold text-xl" style={[{ color: tokens.color.white }, typeStyle("semibold")]}>
              {`+${tile.overflow}`}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };
  return (
    <View style={[frame, { flexDirection: "row", gap: MEDIA.gap }]}>
      <View style={{ flex: 1, gap: MEDIA.gap }}>{left.map(cell)}</View>
      <View style={{ flex: 1, gap: MEDIA.gap }}>{right.map(cell)}</View>
    </View>
  );
}

export type ImageViewerProps = {
  images: GalleryImage[];
  /** The image on screen; `null` while closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** With it, an "Open in browser" button hands it the image's URL. */
  onOpenImage?: (url: string) => void;
};

/**
 * The web `ImageLightbox` on a phone: the images full screen on black, one
 * page each, swiped sideways (TalkBack and VoiceOver step with the adjustable
 * actions). Close (X, or Android back) and "Open in browser" sit at the top,
 * "2 / 5" at the bottom when there is more than one. No pinch zoom. It fades
 * in, or appears at once with Reduce Motion.
 */
export function ImageViewer({ images, index, onIndexChange, onClose, onOpenImage }: ImageViewerProps) {
  const reduceMotion = useReduceMotion();
  if (index === null) return null;
  return (
    <Modal visible transparent statusBarTranslucent animationType={reduceMotion ? "none" : "fade"} onRequestClose={onClose}>
      <ViewerPages images={images} index={index} onIndexChange={onIndexChange} onClose={onClose} onOpenImage={onOpenImage} />
    </Modal>
  );
}

function ViewerPages({ images, index, onIndexChange, onClose, onOpenImage }: Omit<ImageViewerProps, "index"> & { index: number }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const count = images.length;
  const current = images[index];
  const white = tokens.color.white;
  return (
    <View className="flex-1" style={{ backgroundColor: withAlpha(tokens.color.black, 0.92) }}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={index}
        getItemLayout={(_, item) => ({ length: width, offset: width * item, index: item })}
        keyExtractor={(image, item) => `${item}:${image.url}`}
        onMomentumScrollEnd={(event) => onIndexChange(imageViewerPage(event.nativeEvent.contentOffset.x, width, count))}
        renderItem={({ item }) => (
          <View style={{ width, height }} className="items-center justify-center">
            <Image source={{ uri: item.url }} resizeMode="contain" style={{ width: "100%", height: "100%" }} accessibilityLabel={item.alt ?? "Image"} />
          </View>
        )}
        accessibilityRole="adjustable"
        accessibilityLabel={current?.alt ?? "Image"}
        accessibilityValue={count > 1 ? { text: `${index + 1} of ${count}` } : undefined}
        accessibilityActions={count > 1 ? [{ name: "increment" }, { name: "decrement" }] : undefined}
        onAccessibilityAction={(event) => {
          const next = event.nativeEvent.actionName === "increment" ? index + 1 : index - 1;
          if (next >= 0 && next < count) onIndexChange(next);
        }}
      />
      <View className="absolute left-0 right-0 flex-row items-center justify-between px-3" style={{ top: insets.top + 8 }}>
        {onOpenImage && current ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => onOpenImage(current.url)}
            className="min-h-11 flex-row items-center gap-1.5 rounded-full px-3 active:opacity-70"
            style={{ backgroundColor: withAlpha(tokens.color.black, 0.6) }}
          >
            <IconExternalLink size={16} color={white} />
            <Text className="font-instrument-sans text-sm" style={{ color: white }}>
              Open in browser
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        <IconButton icon={IconX} label="Close" variant="overlay" size="lg" onPress={onClose} />
      </View>
      {count > 1 ? (
        <View className="absolute left-0 right-0 items-center" style={{ bottom: insets.bottom + 16 }} pointerEvents="none">
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: withAlpha(tokens.color.black, 0.6) }}>
            <Text className="font-instrument-sans text-sm" style={{ color: white, fontVariant: ["tabular-nums"] }}>
              {`${index + 1} / ${count}`}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

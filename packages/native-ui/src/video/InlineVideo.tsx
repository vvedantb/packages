import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { IconPlayerPlayFilled } from "@tabler/icons-react-native";
import { MEDIA } from "../media/imageGrid";
import { withAlpha } from "../palette";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";

/** The box before playback: 16:9 unless the caller knows the video's shape. */
export const INLINE_VIDEO_ASPECT = 16 / 9;

export type InlineVideoProps = {
  /** An http(s) or local video URL. */
  url: string;
  /** Width over height of the box, fixed so nothing moves when the video loads. Default 16:9. */
  aspectRatio?: number;
  /** An image to show before playback. Without it the box is black with the play button. */
  posterUrl?: string;
  /** Names the play button. Default "Play video". */
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * An inline video on `expo-video`, as the web `VideoPreview`: no autoplay and
 * sound on. Until the play button is pressed it is a still box (the poster,
 * or black), so a list of replies holds no players; pressing it mounts the
 * player, starts playback and shows the platform controls (play and pause,
 * scrub, full screen). The box keeps one size throughout, letterboxing the
 * video (`contain`). Nothing plays or moves on its own, so it needs no Reduce
 * Motion branch.
 *
 * `@vvedantb/native-ui/video` is the only entry that imports `expo-video` (an
 * optional peer).
 */
export function InlineVideo({ url, aspectRatio = INLINE_VIDEO_ASPECT, posterUrl, accessibilityLabel = "Play video", testID }: InlineVideoProps) {
  const scheme = useScheme();
  const [started, setStarted] = useState(false);
  return (
    <View
      testID={testID}
      style={{
        width: "100%",
        aspectRatio,
        borderRadius: MEDIA.radius,
        borderWidth: 1,
        borderColor: MEDIA.outline[scheme],
        overflow: "hidden",
        backgroundColor: tokens.color.black,
      }}
    >
      {started ? (
        <Player url={url} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => setStarted(true)}
          className="flex-1 items-center justify-center active:opacity-80"
        >
          {posterUrl ? <Image source={{ uri: posterUrl }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
          <View
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: withAlpha(tokens.color.black, 0.5), borderWidth: 1, borderColor: withAlpha(tokens.color.white, 0.2) }}
          >
            <IconPlayerPlayFilled size={24} color={tokens.color.white} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

/** Mounted on the first press: one player per pressed video, released when the row unmounts. */
function Player({ url }: { url: string }) {
  const player = useVideoPlayer(url, (created) => {
    created.loop = false;
    created.play();
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture={false}
      style={StyleSheet.absoluteFill}
    />
  );
}

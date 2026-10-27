import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { useColorScheme } from "nativewind";
import { glassMode, loadBlur } from "./blur";
import { cn } from "./cn";
import {
  floatingFill,
  floatingHairline,
  floatingShadow,
  floatingSolidFill,
  FLOATING_RADIUS,
} from "./floating";
import { useGlassBlurTarget } from "./glassBlur";
import { useReduceTransparency } from "./useReduceTransparency";

type FloatingSurfaceProps = ViewProps & {
  className?: string;
  radius?: number;
  blur?: boolean;
  elevated?: boolean;
};

export function FloatingSurface({
  className,
  style,
  children,
  radius = FLOATING_RADIUS,
  blur = true,
  elevated = true,
  ...props
}: FloatingSurfaceProps) {
  const { colorScheme } = useColorScheme();
  const reduceTransparency = useReduceTransparency();
  const blurTarget = useGlassBlurTarget();
  const BlurView = loadBlur()?.BlurView;
  const mode = glassMode({
    os: Platform.OS,
    blur,
    reduceTransparency,
    hasBlurView: BlurView != null,
  });
  const isDark = colorScheme === "dark";
  const opaqueFill = isDark ? floatingSolidFill.dark : floatingSolidFill.light;
  const translucentFill = isDark ? floatingFill.dark : floatingFill.light;
  const border = isDark ? floatingHairline.dark : floatingHairline.light;
  const fill = mode === "solid" ? opaqueFill : translucentFill;

  return (
    <View
      className={cn(className)}
      {...props}
      style={[
        { borderRadius: radius },
        elevated ? floatingShadow : null,
        style,
        { backgroundColor: fill },
      ]}
    >
      <View
        style={[
          styles.clip,
          {
            borderRadius: radius,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: border,
            backgroundColor: mode === "blur" ? "transparent" : fill,
          },
          Platform.OS === "ios" ? styles.continuous : null,
          style != null ? styles.fill : null,
        ]}
      >
        {mode === "blur" && BlurView ? (
          // Android: dimezis blur of the `GlassBlurTarget` content (without
          // one, expo-blur draws only the tint). `experimentalBlurMethod` is
          // the pre-SDK 55 name and logs a deprecation warning, so iOS skips it.
          <BlurView
            pointerEvents="none"
            tint={isDark ? "systemMaterialDark" : "systemMaterialLight"}
            intensity={70}
            experimentalBlurMethod={
              Platform.OS === "android" ? "dimezisBlurView" : undefined
            }
            blurMethod="dimezisBlurView"
            blurReductionFactor={3}
            blurTarget={blurTarget ?? undefined}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {mode === "blur" && Platform.OS === "android" ? (
          // The iOS backdrop includes the outer fill; dimezis samples only the
          // target, so Android lays the same fill over the blur.
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: translucentFill }]}
          />
        ) : null}
        {mode === "backdrop" ? (
          <View
            pointerEvents="none"
            className="absolute inset-0 backdrop-blur-xl"
            style={{ backgroundColor: translucentFill }}
          />
        ) : null}
        {children}
      </View>
    </View>
  );
}

export function GlassSheetBackground({
  style,
  pointerEvents,
}: {
  style?: ViewProps["style"];
  pointerEvents?: ViewProps["pointerEvents"];
}) {
  return (
    <FloatingSurface
      style={style}
      pointerEvents={pointerEvents}
      radius={20}
      className="rounded-t-[20px]"
    />
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  fill: {
    flex: 1,
  },
  continuous: {
    borderCurve: "continuous",
  },
});

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageProps,
  type ViewProps,
} from "react-native";
import { cn } from "./cn";
import { typeStyle } from "./controlStyles";
import { palette } from "./palette";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

type ImageStatus = "idle" | "loaded" | "error";

const AvatarContext = createContext<{
  size: number;
  status: ImageStatus;
  setStatus: (status: ImageStatus) => void;
} | null>(null);

function useAvatar(part: string) {
  const context = useContext(AvatarContext);
  if (!context) throw new Error(`${part} must be inside an Avatar.`);
  return context;
}

export type AvatarProps = ViewProps & {
  /** Diameter in points. Default 40 (the web `h-10 w-10`). */
  size?: number;
  className?: string;
};

/** Round frame for `AvatarImage` and `AvatarFallback`, as the web `Avatar`. The fallback shows until the image loads, and stays if it fails. */
export function Avatar({ size = 40, className, style, children, ...props }: AvatarProps) {
  const scheme = useScheme();
  const [status, setStatus] = useState<ImageStatus>("idle");
  return (
    <AvatarContext.Provider value={{ size, status, setStatus }}>
      <View
        className={cn("relative shrink-0 overflow-hidden border", className)}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: tokens.color.border[scheme],
            backgroundColor: tokens.color.surfaceSecondary[scheme],
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </AvatarContext.Provider>
  );
}

export type AvatarImageProps = Omit<ImageProps, "style"> & {
  className?: string;
};

export function AvatarImage({ onLoad, onError, className, ...props }: AvatarImageProps) {
  const { status, setStatus } = useAvatar("AvatarImage");
  // A new source gets a fresh try: back to the fallback until it loads.
  const sourceKey = JSON.stringify(props.source);
  const previousSource = useRef(sourceKey);
  useEffect(() => {
    if (previousSource.current === sourceKey) return;
    previousSource.current = sourceKey;
    setStatus("idle");
  }, [sourceKey, setStatus]);
  if (status === "error") return null;
  return (
    <Image
      resizeMode="cover"
      className={className}
      style={StyleSheet.absoluteFill}
      onLoad={(event) => {
        setStatus("loaded");
        onLoad?.(event);
      }}
      onError={(event) => {
        setStatus("error");
        onError?.(event);
      }}
      {...props}
    />
  );
}

export type AvatarFallbackProps = ViewProps & {
  /** Usually initials (see `initials()`). A string is centred in Instrument Sans at 40% of the avatar size. */
  children?: ReactNode;
  className?: string;
  textClassName?: string;
};

export function AvatarFallback({
  children,
  className,
  textClassName,
  style,
  ...props
}: AvatarFallbackProps) {
  const { size, status } = useAvatar("AvatarFallback");
  const scheme = useScheme();
  if (status === "loaded") return null;
  return (
    <View
      className={cn("absolute inset-0 items-center justify-center", className)}
      style={[{ backgroundColor: palette.default[scheme] }, style]}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          numberOfLines={1}
          className={cn("font-instrument-sans-semibold", textClassName)}
          style={[
            { fontSize: Math.round(size * 0.4), color: palette.defaultForeground[scheme] },
            typeStyle("semibold"),
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

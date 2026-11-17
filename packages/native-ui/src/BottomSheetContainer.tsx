import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import type { ModalDetent } from "@swmansion/react-native-bottom-sheet";
import { IconX } from "@tabler/icons-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "./colors";
import { textStyle, typeStyle } from "./controlStyles";
import { floatingSolidFill } from "./floating";
import { withAlpha } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

const SHEET_RADIUS = 20;

// A single open detent at 40% by default. A caller can pass several detents for
// multi-detent sizing. The closed detent (0) is added by the component.
const DEFAULT_DETENTS: readonly ModalDetent[] = ["40%"];

// A dimming scrim. The library scales this alpha to 0 at the closed detent and to
// full at an open one.
const SCRIM_COLOR = "rgba(0, 0, 0, 0.5)";

/**
 * A controlled bottom sheet over the screen, driven by `visible` and `onClose`,
 * with a title and a close button.
 *
 * It is built on `ModalBottomSheet` from Software Mansion's
 * `@swmansion/react-native-bottom-sheet` in `windowOverlay` mode, so it needs no
 * root provider. The library needs the New Architecture, React Native 0.82 or
 * later and a native build (no Expo Go).
 *
 * `detents` sets the open detents, shortest first. The default is a single 40%
 * detent. The closed detent is added by the component.
 */
export function BottomSheetContainer({
  visible,
  onClose,
  title,
  children,
  closeTestID,
  detents = DEFAULT_DETENTS,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeTestID?: string;
  /** Open detents, shortest first. The closed detent is added automatically. */
  detents?: readonly ModalDetent[];
}) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const isDark = scheme === "dark";

  // The library sheet is controlled by a detent index. The first detent is the
  // closed state (0); the open detents follow.
  const detentList = useMemo<ModalDetent[]>(() => [0, ...detents], [detents]);
  const [index, setIndex] = useState(0);

  // Keep the index in step with `visible`: open to the first detent, close to 0.
  useEffect(() => {
    setIndex((current) => (visible ? (current === 0 ? 1 : current) : 0));
  }, [visible]);

  // A user-driven drag to the closed detent reports here; tell the parent.
  const handleIndexChange = useCallback(
    (next: number) => {
      setIndex(next);
      if (next === 0) onClose();
    },
    [onClose],
  );

  // A scrim tap or system Back asks the sheet to close; close it and tell the parent.
  const handleCloseRequest = useCallback(() => {
    setIndex(0);
    onClose();
  }, [onClose]);

  const surface = (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: floatingSolidFill[scheme] }]}
    />
  );

  return (
    <ModalBottomSheet
      index={index}
      detents={detentList}
      // Unmount the content once the sheet settles closed.
      lazy
      windowOverlay
      scrimColor={SCRIM_COLOR}
      scrimAccessibilityLabel="Close"
      surface={surface}
      surfaceStyle={{
        borderTopLeftRadius: SHEET_RADIUS,
        borderTopRightRadius: SHEET_RADIUS,
      }}
      onIndexChange={handleIndexChange}
      onCloseRequest={handleCloseRequest}
    >
      <View style={{ flex: 1, paddingTop: 12 }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            alignSelf: "center",
            height: 6,
            width: 40,
            borderRadius: 999,
            backgroundColor: withAlpha(tokens.color.muted[scheme], 0.4),
          }}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingHorizontal: 20,
            marginTop: 16,
            marginBottom: 16,
          }}
        >
          <Text
            accessibilityRole="header"
            style={[
              { flex: 1, fontSize: largerText ? 24 : 20 },
              textStyle("foreground", scheme),
              typeStyle("semibold"),
            ]}
          >
            {title}
          </Text>
          <TouchableOpacity
            testID={closeTestID}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={handleCloseRequest}
            style={{ marginRight: -8, height: 48, width: 48, alignItems: "center", justifyContent: "center" }}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <IconX size={largerText ? 32 : 28} color={isDark ? Colors.white : Colors.black} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 48 }}>
          {children}
        </View>
      </View>
    </ModalBottomSheet>
  );
}

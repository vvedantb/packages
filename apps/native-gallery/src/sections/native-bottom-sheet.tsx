// Bottom sheet comparison: the gorhom `BottomSheetContainer` next to the experimental
// Software Mansion `NativeBottomSheetContainer`, with the same content in each. The
// native sheet also shows multiple detents. The native sheet needs a native build
// (New Architecture), so it is blank in Expo Go.
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetContainer, Input, tokens } from "@vvedantb/native-ui";
import { Button } from "@vvedantb/native-ui/button";
import { NativeBottomSheetContainer } from "@vvedantb/native-ui/native-bottom-sheet";
import { useScheme } from "../useScheme";
import { GText } from "../ui";

const ROWS = Array.from({ length: 16 }, (_, i) => `Visit ${i + 1}`);

type Scheme = "light" | "dark";

/** The same content for both sheets: a short case, a text input and a long list. */
function SheetContent({ prefix, scheme }: { prefix: string; scheme: Scheme }) {
  return (
    <View style={{ gap: 12 }}>
      <GText testID={`${prefix}-body`}>
        Reschedule the 3pm visit, or reassign it to another nurse on the round.
      </GText>
      <Input testID={`${prefix}-input`} placeholder="Add a note for the team" />
      <ScrollView
        testID={`${prefix}-list`}
        style={{ maxHeight: 200 }}
        keyboardShouldPersistTaps="handled"
      >
        {ROWS.map((label, i) => (
          <View
            key={label}
            testID={i === 0 ? `${prefix}-row-0` : undefined}
            style={{
              minHeight: 48,
              justifyContent: "center",
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: tokens.color.border[scheme],
            }}
          >
            <GText>{label}</GText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function NativeBottomSheetSection() {
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  const [gorhomOpen, setGorhomOpen] = useState(false);
  const [nativeOpen, setNativeOpen] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.background[scheme] }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, gap: 12 }}>
        <GText accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700" }}>
          Bottom sheet comparison
        </GText>
        <GText style={{ fontSize: 13 }}>
          The gorhom sheet and the Software Mansion native sheet, with the same
          content. The native sheet uses three detents.
        </GText>
        <Button testID="gorhom-sheet-open" onPress={() => setGorhomOpen(true)}>
          Open gorhom sheet
        </Button>
        <Button testID="native-sheet-open" onPress={() => setNativeOpen(true)}>
          Open native sheet (SWM)
        </Button>
      </View>

      {/* A box-none full-screen layer: the closed gorhom sheet lays out an
          absolute host, so it must not cover the open buttons. */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      >
        <BottomSheetContainer
          visible={gorhomOpen}
          onClose={() => setGorhomOpen(false)}
          title="Gorhom sheet"
          closeTestID="gorhom-sheet-close"
        >
          <SheetContent prefix="gorhom-sheet" scheme={scheme} />
        </BottomSheetContainer>
      </View>

      {/* The native sheet presents itself in a window overlay, so it needs no
          wrapper layer and no root provider. */}
      <NativeBottomSheetContainer
        visible={nativeOpen}
        onClose={() => setNativeOpen(false)}
        title="Native sheet (SWM)"
        closeTestID="native-sheet-close"
        detents={["30%", "60%", "92%"]}
      >
        <SheetContent prefix="native-sheet" scheme={scheme} />
      </NativeBottomSheetContainer>
    </View>
  );
}

// Bottom sheet demo: `BottomSheetContainer` with its default 40% detent, and with
// three detents (30, 60 and 92%) holding a text input and a scrolling list. The
// sheet needs a native build (New Architecture), so it is blank in Expo Go.
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetContainer, Input, tokens } from "@vvedantb/native-ui";
import { Button } from "@vvedantb/native-ui/button";
import { useScheme } from "../useScheme";
import { GText } from "../ui";

const ROWS = Array.from({ length: 16 }, (_, i) => `Visit ${i + 1}`);

type Scheme = "light" | "dark";

/** Sheet content: a short case, a text input and a long list. */
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

export function BottomSheetSection() {
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [multiOpen, setMultiOpen] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.background[scheme] }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, gap: 12 }}>
        <GText accessibilityRole="header" style={{ fontSize: 22, fontWeight: "500" }}>
          Bottom sheet
        </GText>
        <GText style={{ fontSize: 13 }}>
          One sheet with the default 40% detent, and one with three detents
          (30, 60 and 92%).
        </GText>
        <Button testID="default-sheet-open" onPress={() => setDefaultOpen(true)}>
          Open default sheet
        </Button>
        <Button testID="native-sheet-open" onPress={() => setMultiOpen(true)}>
          Open multi-detent sheet
        </Button>
      </View>

      {/* The sheet presents itself in a window overlay, so it needs no wrapper
          layer and no root provider. */}
      <BottomSheetContainer
        visible={defaultOpen}
        onClose={() => setDefaultOpen(false)}
        title="Default sheet"
        closeTestID="default-sheet-close"
      >
        <SheetContent prefix="default-sheet" scheme={scheme} />
      </BottomSheetContainer>
      <BottomSheetContainer
        visible={multiOpen}
        onClose={() => setMultiOpen(false)}
        title="Multi-detent sheet"
        closeTestID="native-sheet-close"
        detents={["30%", "60%", "92%"]}
      >
        <SheetContent prefix="native-sheet" scheme={scheme} />
      </BottomSheetContainer>
    </View>
  );
}

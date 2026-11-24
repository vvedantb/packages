// Shared element transition demo: a list-to-detail move with the kit helper only.
// `/shared-transition` is the list, `/shared-transition/<id>` the detail. A row and its
// detail card share a tag, and so do the two titles. The list holds a long title, and a
// switch shows the empty state. Reduce Motion (system setting) turns the move off.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { EmptyState, SharedTransitionText, SharedTransitionView, Switch, tokens } from "@vvedantb/native-ui";
import { RouterStackPageHeaderBack } from "../Back";
import { useScheme } from "../useScheme";
import { Block, GText, LONG_TEXT, Page } from "../ui";

type Visit = { id: string; title: string; detail: string };

export const VISITS: Visit[] = [
  { id: "1", title: "Morning medication round", detail: "Three residents, with a review of the new dosage chart." },
  { id: "2", title: LONG_TEXT, detail: "A long title wraps on the list and in full on the detail card." },
  { id: "3", title: "Review", detail: "A one-word title." },
];

function Row({ visit }: { visit: Visit }) {
  const scheme = useScheme();
  return (
    <Pressable
      testID={`st-row-${visit.id}`}
      accessibilityRole="button"
      accessibilityLabel={visit.title}
      onPress={() => router.push(`/shared-transition/${visit.id}` as never)}
    >
      <SharedTransitionView
        tag={`card-${visit.id}`}
        testID={`st-card-${visit.id}`}
        style={{
          minHeight: 56,
          justifyContent: "center",
          padding: 14,
          borderRadius: tokens.radius.lg,
          backgroundColor: tokens.color.surface[scheme],
          borderWidth: 1,
          borderColor: tokens.color.border[scheme],
        }}
      >
        <SharedTransitionText
          tag={`title-${visit.id}`}
          numberOfLines={2}
          style={{ color: tokens.color.foreground[scheme], fontSize: 16, fontWeight: "500" }}
        >
          {visit.title}
        </SharedTransitionText>
      </SharedTransitionView>
    </Pressable>
  );
}

/** The list screen. */
export function SharedTransitionSection() {
  const [empty, setEmpty] = useState(false);
  return (
    <Page testID="screen-shared-transition">
      <RouterStackPageHeaderBack title="Shared element transition" />
      <Block title="Visits" id="shared-transition">
        <View className="flex-row items-center justify-between">
          <GText>Show the empty state</GText>
          <Switch testID="st-empty-toggle" accessibilityLabel="Show the empty state" checked={empty} onCheckedChange={setEmpty} />
        </View>
        {empty ? (
          <EmptyState title="No visits" description="Nothing to open." />
        ) : (
          VISITS.map((visit) => <Row key={visit.id} visit={visit} />)
        )}
      </Block>
    </Page>
  );
}

/** The detail screen: the same tags as the row that opened it. */
export function SharedTransitionDetail() {
  const scheme = useScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const visit = VISITS.find((item) => item.id === id) ?? VISITS[0]!;
  return (
    <Page testID="screen-shared-transition-detail">
      <RouterStackPageHeaderBack title="Visit" />
      <SharedTransitionView
        tag={`card-${visit.id}`}
        testID="st-detail-card"
        style={{
          minHeight: 200,
          padding: 20,
          gap: 12,
          borderRadius: tokens.radius.lg,
          backgroundColor: tokens.color.surface[scheme],
          borderWidth: 1,
          borderColor: tokens.color.border[scheme],
        }}
      >
        <SharedTransitionText
          tag={`title-${visit.id}`}
          style={{ color: tokens.color.foreground[scheme], fontSize: 22, fontWeight: "500" }}
        >
          {visit.title}
        </SharedTransitionText>
        <GText testID="st-detail-body">{visit.detail}</GText>
      </SharedTransitionView>
    </Page>
  );
}

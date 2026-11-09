import { useLocalSearchParams } from "expo-router";
import { RouterStackPageHeaderBack } from "../../src/Back";
import { SECTIONS } from "../../src/sections";
import { GText, Page } from "../../src/ui";

export default function SectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const section = SECTIONS.find((item) => item.id === id);
  return (
    <Page testID={`section-${id}`}>
      <RouterStackPageHeaderBack title={section?.title ?? "Unknown section"} />
      {section ? <section.Component /> : <GText>No section named {id}</GText>}
    </Page>
  );
}

// Every entry point and its exports, read from the loaded modules, with the gallery
// section that renders each component (from `galleryRegistry.ts`).
import { View } from "react-native";
import { ENTRY_MODULES } from "../entries";
import { GALLERY_COVERAGE, NON_VISUAL_COMPONENTS } from "../galleryRegistry";
import { Block, GText } from "../ui";

const isComponentName = (name: string) => /^[A-Z][A-Za-z0-9]*$/.test(name) && /[a-z]/.test(name);

export function EntriesSection() {
  const entries = Object.entries(ENTRY_MODULES);
  return (
    <>
      <GText testID="entries-count">{`Entry points loaded: ${entries.length}`}</GText>
      <GText>The tailwind preset is CommonJS. tailwind.config.js loads it.</GText>
      {entries.map(([entry, module]) => {
        const components = Object.keys(module).filter(isComponentName).sort();
        return (
          <Block key={entry} title={`@vvedantb/native-ui${entry === "." ? "" : entry}`} id={`entry${entry.replace(/\W/g, "-")}`}>
            <GText>{`${Object.keys(module).length} exports, ${components.length} components`}</GText>
            <View className="gap-1">
              {components.map((name) => (
                <GText key={name} style={{ fontSize: 12 }}>{`${name}: ${GALLERY_COVERAGE[name] ?? (NON_VISUAL_COMPONENTS[name] ? "non-visual" : "MISSING")}`}</GText>
              ))}
            </View>
          </Block>
        );
      })}
    </>
  );
}

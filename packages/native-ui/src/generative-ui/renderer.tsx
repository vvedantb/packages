import { defineCatalog } from "@json-render/core";
import { createRenderer, schema } from "@json-render/react-native";
import { generativeUiCatalogDefinition } from "@vvedantb/server/generative-ui";
import {
  BadgeElement,
  ButtonElement,
  CalloutElement,
  ChecklistElement,
  CodeElement,
  GridElement,
  HeadingElement,
  ImageElement,
  KeyValueElement,
  MetricElement,
  PanelElement,
  ProgressElement,
  SeparatorElement,
  StackElement,
  TableElement,
  TextElement,
} from "./components";

/** The phone catalog: the shared definitions on json-render's React Native schema. */
export const generativeUiNativeCatalog = defineCatalog(schema, generativeUiCatalogDefinition);

/** Every component in the catalog, as phone UI. A spec can only name these types. */
export const GenerativeUiRenderer = createRenderer(generativeUiNativeCatalog, {
  Stack: StackElement,
  Grid: GridElement,
  Panel: PanelElement,
  Separator: SeparatorElement,
  Heading: HeadingElement,
  Text: TextElement,
  Metric: MetricElement,
  Badge: BadgeElement,
  Callout: CalloutElement,
  Progress: ProgressElement,
  Checklist: ChecklistElement,
  Table: TableElement,
  KeyValue: KeyValueElement,
  Code: CodeElement,
  Image: ImageElement,
  Button: ButtonElement,
});

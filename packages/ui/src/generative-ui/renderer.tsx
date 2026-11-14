import { defineCatalog } from "@json-render/core";
import { createRenderer } from "@json-render/react";
import { schema } from "@json-render/react/schema";
import { generativeUiCatalogDefinition } from "@vvedantb/server/generative-ui";
import {
  BadgeElement,
  ButtonElement,
  CalloutElement,
  ChecklistElement,
  CodeElement,
  HeadingElement,
  ImageElement,
  KeyValueElement,
  MetricElement,
  ProgressElement,
  TableElement,
  TextElement,
} from "./content";
import { GridElement, PanelElement, SeparatorElement, StackElement } from "./layout";

/**
 * The web catalog: the shared definitions (`@vvedantb/server/generative-ui`)
 * on json-render's React schema. A backend that composes or validates specs
 * for this renderer builds the same catalog.
 */
export const generativeUiCatalog = defineCatalog(schema, generativeUiCatalogDefinition);

/** Every component in the catalog, as web UI. A spec can only name these types. */
export const GenerativeUiRenderer = createRenderer(generativeUiCatalog, {
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

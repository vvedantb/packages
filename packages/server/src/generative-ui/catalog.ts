/**
 * The components and actions an agent can build a generative UI panel from.
 *
 * This is the guardrail for generative UI: a composer builds a tree out of
 * these types and nothing else, so a panel can never render arbitrary markup
 * or call anything the app has not wired up. A backend validates composed
 * specs against a catalog made from these definitions; each renderer
 * (`@vvedantb/ui/generative-ui` on the web, `@vvedantb/native-ui/generative-ui`
 * on a phone) registers one component for each entry.
 *
 * The definitions are plain zod objects, so this module has no json-render
 * runtime: pass them to json-render's `defineCatalog` with the renderer's
 * schema (`defineGenerativeUiCatalog` in each renderer package).
 *
 * The prop schemas are closed sets of strings: the agent supplies every value
 * as a content block, and the composer never invents copy.
 */

import { z } from "zod";

/** Sentiment shared by metrics, badges and callouts. */
export const GENERATIVE_UI_TONES = ["neutral", "positive", "warning", "danger"] as const;
export type GenerativeUiTone = (typeof GENERATIVE_UI_TONES)[number];

/** Text styles: `Text.variant`, and a text block's emphasis. */
export const GENERATIVE_UI_TEXT_STYLES = ["body", "muted", "lead"] as const;
export type GenerativeUiTextStyle = (typeof GENERATIVE_UI_TEXT_STYLES)[number];

/** Button styles. */
export const GENERATIVE_UI_BUTTON_VARIANTS = ["primary", "secondary", "ghost"] as const;
export type GenerativeUiButtonVariant = (typeof GENERATIVE_UI_BUTTON_VARIANTS)[number];

const tone = z.enum(GENERATIVE_UI_TONES);
const nullableText = z.string().nullable();

/** Component definitions, keyed by the type name a spec uses. */
export const generativeUiComponents = {
  Stack: {
    props: z.object({
      direction: z.enum(["vertical", "horizontal"]),
      gap: z.enum(["sm", "md", "lg"]),
      align: z.enum(["start", "center", "stretch"]),
    }),
    slots: ["default"],
    description: "Layout row or column that holds other elements.",
  },
  Grid: {
    props: z.object({
      columns: z.number().int().min(2).max(3),
      gap: z.enum(["sm", "md"]),
    }),
    slots: ["default"],
    description: "Equal-width columns, e.g. a row of metrics.",
  },
  Panel: {
    props: z.object({ title: nullableText, description: nullableText }),
    slots: ["default"],
    description: "Bordered container grouping related content.",
  },
  Heading: {
    props: z.object({ text: z.string(), level: z.enum(["h2", "h3"]) }),
    description: "Section title.",
  },
  Text: {
    props: z.object({ text: z.string(), variant: z.enum(GENERATIVE_UI_TEXT_STYLES) }),
    description: "A paragraph of read-only prose.",
  },
  Metric: {
    props: z.object({ label: z.string(), value: z.string(), delta: nullableText, tone }),
    description: "One labelled number or short value.",
  },
  Badge: {
    props: z.object({ text: z.string(), tone }),
    description: "Small status pill.",
  },
  Callout: {
    props: z.object({ title: nullableText, text: z.string(), tone }),
    description: "Highlighted note, warning or result.",
  },
  Progress: {
    props: z.object({ label: nullableText, value: z.number().min(0).max(100) }),
    description: "Completion bar from 0 to 100.",
  },
  Checklist: {
    props: z.object({ items: z.array(z.object({ text: z.string(), done: z.boolean() })) }),
    description: "List of done / not-done items.",
  },
  Table: {
    props: z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.string())) }),
    description: "Small table of rows and columns.",
  },
  KeyValue: {
    props: z.object({ items: z.array(z.object({ label: z.string(), value: z.string() })) }),
    description: "Label / value pairs, e.g. a summary of settings.",
  },
  Code: {
    props: z.object({ code: z.string(), language: nullableText }),
    description: "Preformatted code or command output.",
  },
  Image: {
    props: z.object({ url: z.string(), alt: nullableText }),
    description: "A screenshot or diagram already hosted at a URL.",
  },
  Button: {
    props: z.object({ label: z.string(), variant: z.enum(GENERATIVE_UI_BUTTON_VARIANTS) }),
    events: ["press"],
    description: "Clickable button that replies in the chat or opens a link.",
  },
  Separator: {
    props: z.object({}),
    description: "Horizontal rule between sections.",
  },
};

/** Every component type a spec may name. */
export type GenerativeUiComponentName = keyof typeof generativeUiComponents;

/** Props of component `T`, as the renderer receives them. */
export type GenerativeUiProps<T extends GenerativeUiComponentName> = z.infer<
  (typeof generativeUiComponents)[T]["props"]
>;

/** Actions a Button can trigger; the app handles both (`onReply`, `onOpenUrl`). */
export const generativeUiActions = {
  reply: {
    params: z.object({ message: z.string() }),
    description: "Send the given text back to the agent as a chat message.",
  },
  open_url: {
    params: z.object({ url: z.string() }),
    description: "Open a link in a new tab.",
  },
};

/** The catalog input for json-render's `defineCatalog(schema, …)`. */
export const generativeUiCatalogDefinition = {
  components: generativeUiComponents,
  actions: generativeUiActions,
};

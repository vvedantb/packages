// Generative UI on the web: agent-composed panels from the shared catalog
// (`@vvedantb/server/generative-ui`). Needs `@json-render/core` and
// `@json-render/react`; a separate subpath, so the root export does not.
export { GenerativeUiPanel, type GenerativeUiPanelProps } from "./GenerativeUiPanel";
export { GenerativeUiRenderer, generativeUiCatalog } from "./renderer";

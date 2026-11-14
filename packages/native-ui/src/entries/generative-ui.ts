// `@vvedantb/native-ui/generative-ui`: agent-composed panels from the shared
// catalog (`@vvedantb/server/generative-ui`), as the web
// `@vvedantb/ui/generative-ui`. Imports `@json-render/react-native` (an
// optional peer): the only entry that does, so an app without it bundles none.
export { GenerativeUiPanel } from "../generative-ui/GenerativeUiPanel";
export type { GenerativeUiPanelProps } from "../generative-ui/GenerativeUiPanel";
export { generativeUiNativeCatalog } from "../generative-ui/renderer";

// `@vvedantb/native-ui/expo-web-root`: `ExpoWebRoot` for `app/+html.tsx`. Not on
// the root entry: it imports `expo-router/html`, and Metro does not tree-shake.
export { ExpoWebRoot, EXPO_WEB_VIEWPORT, expoWebBackgroundCss } from "../ExpoWebRoot";
export type { ExpoWebRootProps, ExpoWebRootViewport } from "../ExpoWebRoot";

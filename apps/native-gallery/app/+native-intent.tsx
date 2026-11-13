// Expo Router calls this for every incoming URL. Agent deep links
// (`nativegallery://agent/...`) are handled by the bridge and then dropped, so they
// never navigate. Outside agent builds this is a pass-through.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  if (process.env.EXPO_PUBLIC_NATIVE_UI_AGENT === "1") {
    const { handleAgentUrl } = require("../src/agent/install") as typeof import("../src/agent/install");
    if (handleAgentUrl(path)) return null;
  }
  return path;
}

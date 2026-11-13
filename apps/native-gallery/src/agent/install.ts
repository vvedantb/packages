// Entry for agent builds. Import this only behind
// `process.env.EXPO_PUBLIC_NATIVE_UI_AGENT === "1"`, so that Metro drops it from
// default bundles. See app/_layout.tsx and app/+native-intent.tsx.
import { installAgentClock } from "./clock";
import { handleAgentUrl as handle, setAgentRoute } from "./bridge";

export { setAgentRoute };

export function installAgent() {
  const clock = installAgentClock(globalThis as Record<string, any>);
  console.log(`NATIVE_UI_AGENT_READY ${JSON.stringify({ clock: clock.state() })}`);
  return clock;
}

export function handleAgentUrl(url: string): boolean {
  return handle(url, installAgent());
}

// Host-to-app bridge for agent builds. The host driver (scripts/agent.mjs) sends a
// deep link such as `nativegallery://agent/clock?cmd=%2B100&id=ab12`; the app answers
// with one logcat line: `NATIVE_UI_AGENT_RESULT {"ok":true,"id":"ab12",...}`.
import type { AgentClock } from "./clock";

export const RESULT_MARKER = "NATIVE_UI_AGENT_RESULT";

let route = "";
export const setAgentRoute = (path: string) => {
  route = path;
};

export function reply(payload: Record<string, unknown>) {
  console.log(`${RESULT_MARKER} ${JSON.stringify(payload)}`);
}

/** Parse `scheme://agent/<op>?a=b` or `/agent/<op>?a=b`. Returns null for any other URL. */
export function parseAgentUrl(url: string): { op: string; params: Record<string, string> } | null {
  const m = /^(?:[a-zA-Z][\w+.-]*:\/\/)?\/?agent\/([\w-]+)(?:\?(.*))?$/.exec(url.replace(/#.*$/, ""));
  if (!m) return null;
  const params: Record<string, string> = {};
  for (const pair of (m[2] ?? "").split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const k = decodeURIComponent(eq < 0 ? pair : pair.slice(0, eq));
    const v = eq < 0 ? "" : decodeURIComponent(pair.slice(eq + 1));
    params[k] = v;
  }
  return { op: m[1], params };
}

/** Normalise `+100`, ` 100` (an unescaped `+` decodes to a space) and `100` to `+100`. */
export function normaliseCmd(raw: string): string {
  const c = raw.trim();
  return /^\+?\d+$/.test(c) ? `+${c.replace(/^\+/, "")}` : c;
}

export function runClockCommand(clock: AgentClock, rawCmd: string) {
  const cmd = normaliseCmd(rawCmd);
  if (cmd === "freeze") clock.freeze();
  else if (cmd === "resume") clock.resume();
  else if (cmd === "status") return { cmd, state: clock.state() };
  else if (cmd === "settle") {
    const r = clock.settle();
    return { cmd, state: r, idle: r.idle };
  } else if (/^\+\d+$/.test(cmd)) {
    if (!clock.state().frozen) throw new Error("clock is running: freeze it before advancing");
    clock.advance(Number(cmd.slice(1)));
  } else throw new Error(`unknown clock command "${rawCmd}"`);
  return { cmd, state: clock.state() };
}

/** Handle an agent URL. Returns true when the URL was an agent URL, so the caller can swallow it. */
export function handleAgentUrl(url: string, clock: AgentClock): boolean {
  const parsed = parseAgentUrl(url);
  if (!parsed) return false;
  const { op, params } = parsed;
  const base = { op, id: params.id };
  try {
    if (op === "clock") reply({ ok: true, ...base, ...runClockCommand(clock, params.cmd ?? "") });
    else if (op === "state") reply({ ok: true, ...base, route, clock: clock.state() });
    else if (op === "ping") reply({ ok: true, ...base });
    else reply({ ok: false, ...base, error: `unknown agent op "${op}"` });
  } catch (e) {
    reply({ ok: false, ...base, error: e instanceof Error ? e.message : String(e) });
  }
  return true;
}

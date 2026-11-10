#!/usr/bin/env node
// Android agent driver. Every command prints one JSON object to stdout.
// Usage: node scripts/agent.mjs <command> [args]. See apps/native-gallery/README.md.
// Env: ANDROID_SERIAL, AGENT_APP_ID (dev.vvedantb.nativegallery), AGENT_SCHEME (nativegallery).
import { AgentError, tree, screenshot, tap, typeText, state, logs, clock, launch, key, back, swipe, waitFor, config } from "./agent/adb.mjs";

const USAGE = `commands:
  tree                          UI hierarchy as JSON
  screenshot <path>             save a PNG
  tap <testID|label|x,y>        tap the centre of a node (id=, text=, desc= prefixes narrow the match)
  type <text> [target]          type into the focused field, or tap target first
  state                         foreground app, focused node, route and clock from the bridge
  logs [--grep re] [--lines N]  recent logcat
  clock freeze|+N|settle|resume|status
  launch [--clear]              start the app
  key <KEYCODE_...|n>           send a key event
  back                          press back
  swipe x1 y1 x2 y2 [ms]
  wait <target> [--gone] [--timeout ms]`;

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const name = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[name] = true;
      else {
        flags[name] = next;
        i++;
      }
    } else pos.push(a);
  }
  return { pos, flags };
}

async function run(cmd, { pos, flags }) {
  switch (cmd) {
    case "tree": return { nodes: tree() };
    case "screenshot":
      if (!pos[0]) throw new AgentError("usage: screenshot <path>");
      return screenshot(pos[0]);
    case "tap":
      if (!pos[0]) throw new AgentError("usage: tap <testID|label|x,y>");
      return { tapped: tap(pos[0]) };
    case "type":
      if (pos[0] === undefined) throw new AgentError("usage: type <text> [target]");
      return typeText(pos[0], pos[1]);
    case "state": return await state();
    case "logs": return { lines: logs({ grep: flags.grep === true ? undefined : flags.grep, lines: Number(flags.lines) || 200 }) };
    case "clock":
      if (!pos[0]) throw new AgentError("usage: clock freeze|+N|settle|resume|status");
      return await clock(pos[0], { timeout: Number(flags.timeout) || 10000 });
    case "launch": return launch({ clear: Boolean(flags.clear) });
    case "key":
      if (!pos[0]) throw new AgentError("usage: key <KEYCODE_...|n>");
      key(pos[0]);
      return { key: pos[0] };
    case "back": back(); return { key: "KEYCODE_BACK" };
    case "swipe": {
      const [x1, y1, x2, y2, ms] = pos.map(Number);
      if ([x1, y1, x2, y2].some((n) => !Number.isFinite(n))) throw new AgentError("usage: swipe x1 y1 x2 y2 [ms]");
      swipe(x1, y1, x2, y2, ms);
      return { swiped: [x1, y1, x2, y2] };
    }
    case "wait":
      if (!pos[0]) throw new AgentError("usage: wait <target> [--gone] [--timeout ms]");
      return { matched: (await waitFor(pos[0], { gone: Boolean(flags.gone), timeout: Number(flags.timeout) || 8000 })).tier };
    default:
      throw new AgentError(cmd ? `unknown command "${cmd}"` : "no command given", { usage: USAGE });
  }
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  const result = await run(cmd, parseArgs(rest));
  process.stdout.write(`${JSON.stringify({ ok: true, op: cmd, app: config().appId, ...result })}\n`);
} catch (e) {
  process.stdout.write(`${JSON.stringify({ ok: false, op: cmd ?? null, error: e.message, ...(e.extra ?? {}) })}\n`);
  process.exitCode = 1;
}

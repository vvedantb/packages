// The I/O layer: adb, uiautomator and the app bridge. Used by scripts/agent.mjs
// and by apps/native-gallery/e2e/run.mjs. Node stdlib only.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import {
  parseHierarchy, compactTree, resolveTarget, focusedNode, inputTextChunks, shellQuote,
  normaliseClockCmd, agentUrl, parseAgentResult, parseForeground,
} from "./lib.mjs";

export class AgentError extends Error {
  constructor(message, extra = {}) {
    super(message);
    this.extra = extra;
  }
}

export const config = () => ({
  serial: process.env.ANDROID_SERIAL || "",
  appId: process.env.AGENT_APP_ID || "dev.vvedantb.nativegallery",
  scheme: process.env.AGENT_SCHEME || "nativegallery",
});

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run adb. Returns stdout as a string, or a Buffer with `binary`. Throws AgentError on failure. */
export function adb(args, { binary = false, timeout = 30000, allowFail = false } = {}) {
  const { serial } = config();
  const full = serial ? ["-s", serial, ...args] : args;
  const r = spawnSync("adb", full, { encoding: binary ? "buffer" : "utf8", timeout, maxBuffer: 256 * 1024 * 1024 });
  if (r.error) {
    const hint = r.error.code === "ENOENT" ? "adb not found on PATH" : r.error.message;
    throw new AgentError(`adb failed: ${hint}`, { args: full });
  }
  if (r.status !== 0 && !allowFail) {
    const err = String(binary ? r.stderr : r.stderr || r.stdout).trim();
    throw new AgentError(`adb ${args[0]} exited ${r.status}: ${err}`, { args: full });
  }
  return r.stdout;
}

/** Run a command string through the device shell. */
export const shell = (cmd, opts) => adb(["shell", cmd], opts);

export function dumpNodes({ retries = 4 } = {}) {
  let last = "";
  for (let i = 0; i < retries; i++) {
    const out = shell("uiautomator dump /sdcard/native-ui-agent.xml", { allowFail: true, timeout: 30000 });
    last = String(out);
    if (/dumped to/i.test(last)) {
      const xml = String(adb(["exec-out", "cat", "/sdcard/native-ui-agent.xml"]));
      if (xml.includes("<hierarchy")) return parseHierarchy(xml);
    }
    // uiautomator refuses to dump while the screen animates. Retry.
    spawnSync("sleep", ["0.4"]);
  }
  throw new AgentError("uiautomator dump failed", { output: last.trim().slice(0, 300) });
}

export const tree = () => compactTree(dumpNodes());

export function screenshot(path) {
  const png = adb(["exec-out", "screencap", "-p"], { binary: true });
  if (!png.length || png[0] !== 0x89) throw new AgentError("screencap returned no PNG data");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  return { path, bytes: png.length };
}

export function tap(target, nodes = dumpNodes()) {
  const r = resolveTarget(nodes, target);
  if (!r.ok) throw new AgentError(r.error, { target });
  shell(`input tap ${r.x} ${r.y}`);
  return { x: r.x, y: r.y, tier: r.tier, matches: r.matches, id: r.node?.id || undefined, label: r.node ? r.node.text || r.node.desc || undefined : undefined };
}

export function typeText(text, into) {
  const tapped = into ? tap(into) : undefined;
  for (const c of inputTextChunks(text)) {
    shell(c.key ? `input keyevent ${c.key}` : `input text ${c.text}`);
  }
  return { typed: text.length, into: tapped };
}

export const key = (code) => shell(`input keyevent ${code}`);
export const back = () => key("KEYCODE_BACK");
export const swipe = (x1, y1, x2, y2, ms = 300) => shell(`input swipe ${x1} ${y1} ${x2} ${y2} ${ms}`);

export function launch({ clear = false } = {}) {
  const { appId } = config();
  if (clear) shell(`pm clear ${appId}`, { allowFail: true });
  shell(`am force-stop ${appId}`, { allowFail: true });
  const out = shell(`monkey -p ${appId} -c android.intent.category.LAUNCHER 1`);
  if (/No activities found|monkey aborted/i.test(String(out))) throw new AgentError(`could not launch ${appId}`, { output: String(out).trim() });
  return { appId };
}

export function foreground() {
  return parseForeground(String(shell("dumpsys activity activities", { allowFail: true })));
}

export function logs({ grep, lines = 200 } = {}) {
  const text = String(adb(["logcat", "-d", "-t", String(lines)]));
  let out = text.split("\n").filter(Boolean);
  if (grep) {
    const re = new RegExp(grep, "i");
    out = out.filter((l) => re.test(l));
  }
  return out;
}

/**
 * Send an agent deep link and wait for the NATIVE_UI_AGENT_RESULT line with the same id.
 * The link goes to the app with `-p`, so no chooser appears.
 */
export async function bridge(op, params = {}, { timeout = 10000 } = {}) {
  const { appId, scheme } = config();
  const id = randomBytes(4).toString("hex");
  const url = agentUrl(scheme, op, { ...params, id });
  shell(`am start -W -a android.intent.action.VIEW -p ${appId} -d ${shellQuote(url)}`);
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const hit = parseAgentResult(String(adb(["logcat", "-d", "-t", "400"])), id);
    if (hit) return hit;
    await sleep(150);
  }
  throw new AgentError(`no NATIVE_UI_AGENT_RESULT within ${timeout} ms. Is the app built with EXPO_PUBLIC_NATIVE_UI_AGENT=1?`, { url });
}

export async function clock(arg, opts) {
  const result = await bridge("clock", { cmd: normaliseClockCmd(arg) }, opts);
  if (!result.ok) throw new AgentError(result.error || "clock command failed", { result });
  return result;
}

export async function state() {
  const nodes = dumpNodes();
  const f = focusedNode(nodes);
  const out = {
    foreground: foreground(),
    focused: f ? { id: f.id || undefined, text: f.text || undefined, desc: f.desc || undefined, role: f.role, bounds: f.bounds } : null,
    bridge: null,
  };
  try {
    const r = await bridge("state", {}, { timeout: 3000 });
    out.bridge = { route: r.route, clock: r.clock };
  } catch (e) {
    out.bridge = { error: e.message };
  }
  return out;
}

/** Poll until `target` resolves in a fresh dump. Returns the resolution. */
export async function waitFor(target, { timeout = 8000, gone = false } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      last = resolveTarget(dumpNodes({ retries: 1 }), target);
      if (last.ok !== gone) return last;
    } catch (e) {
      last = { ok: false, error: e.message };
    }
    await sleep(250);
  }
  throw new AgentError(gone ? `"${target}" still visible after ${timeout} ms` : `"${target}" not found within ${timeout} ms`, { target });
}

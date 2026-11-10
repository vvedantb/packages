// Pure helpers for scripts/agent.mjs: parse uiautomator XML, resolve targets,
// escape text for `adb shell input text`, parse bridge replies. No I/O here, so
// the unit tests can run without an emulator.

export const RESULT_MARKER = "NATIVE_UI_AGENT_RESULT";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === "#") {
      const code = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

/** Parse "[l,t][r,b]" into [l, t, r, b], or null. */
export function parseBounds(s) {
  const m = /^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/.exec(s ?? "");
  return m ? m.slice(1, 5).map(Number) : null;
}

function parseAttrs(src) {
  const attrs = {};
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1]] = decodeEntities(m[2]);
  return attrs;
}

/** Tokenise the tags of an XML document. Quote-aware, so `>` inside a value is safe. */
function* tags(xml) {
  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    if (lt < 0) return;
    if (xml.startsWith("<?", lt) || xml.startsWith("<!", lt)) {
      const end = xml.indexOf(">", lt);
      if (end < 0) return;
      i = end + 1;
      continue;
    }
    let j = lt + 1;
    let quote = null;
    while (j < xml.length) {
      const c = xml[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
      j++;
    }
    const body = xml.slice(lt + 1, j);
    i = j + 1;
    if (body.startsWith("/")) yield { kind: "close", name: body.slice(1).trim() };
    else {
      const selfClosing = body.endsWith("/");
      const inner = selfClosing ? body.slice(0, -1) : body;
      const name = /^[\w:.-]+/.exec(inner)?.[0] ?? "";
      yield { kind: selfClosing ? "self" : "open", name, attrs: parseAttrs(inner.slice(name.length)) };
    }
  }
}

/**
 * Parse a uiautomator dump into a flat list of nodes in document order.
 * Each node: { id, text, desc, class, role, pkg, bounds, center, clickable,
 * enabled, focused, scrollable, checked, selected, depth }.
 * `id` is the raw resource-id (React Native writes a testID as the bare id).
 */
export function parseHierarchy(xml) {
  const nodes = [];
  let depth = -1;
  for (const t of tags(String(xml))) {
    if (t.kind === "close") {
      if (t.name === "node") depth--;
      continue;
    }
    if (t.name !== "node") continue;
    const a = t.attrs;
    const bounds = parseBounds(a.bounds);
    const d = t.kind === "open" ? ++depth : depth + 1;
    nodes.push({
      id: a["resource-id"] ?? "",
      text: a.text ?? "",
      desc: a["content-desc"] ?? "",
      class: a.class ?? "",
      role: roleOf(a.class ?? ""),
      pkg: a.package ?? "",
      bounds,
      center: bounds ? [Math.round((bounds[0] + bounds[2]) / 2), Math.round((bounds[1] + bounds[3]) / 2)] : null,
      clickable: a.clickable === "true",
      enabled: a.enabled !== "false",
      focused: a.focused === "true",
      scrollable: a.scrollable === "true",
      checked: a.checked === "true",
      selected: a.selected === "true",
      depth: d,
    });
  }
  return nodes;
}

const ROLES = [
  [/EditText$/, "input"],
  [/Button$/, "button"],
  [/(CheckBox|Switch|ToggleButton)$/, "toggle"],
  [/(ScrollView|RecyclerView|ListView)$/, "scroll"],
  [/ImageView$/, "image"],
  [/TextView$/, "text"],
];
export function roleOf(cls) {
  for (const [re, role] of ROLES) if (re.test(cls)) return role;
  return cls.endsWith("ViewGroup") || cls.endsWith("View") ? "view" : cls.split(".").pop() || "";
}

const hasArea = (n) => n.bounds && n.bounds[2] > n.bounds[0] && n.bounds[3] > n.bounds[1];

/** Compact tree for JSON output: drops empty layout wrappers that carry no label, id or action. */
export function compactTree(nodes) {
  return nodes
    .filter((n) => hasArea(n) && (n.id || n.text || n.desc || n.clickable || n.scrollable || n.focused))
    .map((n) => {
      const o = {};
      if (n.id) o.id = n.id;
      if (n.text) o.text = n.text;
      if (n.desc) o.desc = n.desc;
      o.role = n.role;
      o.bounds = n.bounds;
      if (n.clickable) o.clickable = true;
      if (!n.enabled) o.enabled = false;
      if (n.focused) o.focused = true;
      if (n.checked) o.checked = true;
      if (n.scrollable) o.scrollable = true;
      return o;
    });
}

export const idMatches = (id, target) =>
  id === target || id.endsWith(`/${target}`) || id.endsWith(`:id/${target}`);

/**
 * Resolve a target to a point.
 * Accepts "x,y", "id=..", "text=..", "desc=..", or a bare string. A bare string
 * tries, in order: resource-id (exact or suffix), exact text/desc, then
 * case-insensitive substring of text/desc. Hidden, zero-area nodes never match.
 * Returns { ok, x, y, node, tier, matches } or { ok:false, error }.
 */
export function resolveTarget(nodes, target) {
  const t = String(target ?? "").trim();
  if (!t) return { ok: false, error: "empty target" };
  const xy = /^(-?\d+)\s*,\s*(-?\d+)$/.exec(t);
  if (xy) return { ok: true, x: Number(xy[1]), y: Number(xy[2]), node: null, tier: "point", matches: 1 };

  const prefixed = /^(id|text|desc)=(.*)$/s.exec(t);
  const kind = prefixed?.[1];
  const q = prefixed ? prefixed[2] : t;
  const lq = q.toLowerCase();
  const tiers = [];
  if (!kind || kind === "id") tiers.push(["id", (n) => n.id && idMatches(n.id, q)]);
  if (!kind || kind === "text" || kind === "desc") {
    const f = (n) => (kind === "desc" ? [n.desc] : kind === "text" ? [n.text] : [n.text, n.desc]);
    tiers.push(["label", (n) => f(n).some((s) => s && s === q)]);
    tiers.push(["label-contains", (n) => f(n).some((s) => s && s.toLowerCase().includes(lq))]);
  }
  const visible = nodes.filter(hasArea);
  for (const [tier, pred] of tiers) {
    const hits = visible.filter(pred);
    if (!hits.length) continue;
    // Prefer enabled nodes, then clickable ones; document order breaks ties.
    const best = hits.find((n) => n.enabled && n.clickable) ?? hits.find((n) => n.enabled) ?? hits[0];
    return { ok: true, x: best.center[0], y: best.center[1], node: best, tier, matches: hits.length };
  }
  return { ok: false, error: `no node matches "${t}"` };
}

export const focusedNode = (nodes) => nodes.find((n) => n.focused && hasArea(n)) ?? null;

/**
 * Escape text for `adb shell input text`. Returns an array of chunks:
 * { text } (already escaped and shell-quoted for the device) or { key: 66 } for newlines.
 * `input text` cannot send non-ASCII characters, so those throw.
 */
export function inputTextChunks(text) {
  // eslint-disable-next-line no-control-regex
  if (/[^\x09\x0a\x20-\x7e]/.test(text)) {
    throw new Error("input text supports printable ASCII only");
  }
  const chunks = [];
  for (const [i, line] of String(text).split("\n").entries()) {
    if (i > 0) chunks.push({ key: 66 });
    if (line) chunks.push({ text: shellQuote(line.replace(/%/g, "%25").replace(/ /g, "%s")) });
  }
  return chunks;
}

/** Single-quote a string for the device's sh. */
export function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/** Normalise `clock` arguments to the cmd that the app bridge expects. */
export function normaliseClockCmd(arg) {
  const a = String(arg ?? "").trim();
  if (a === "freeze" || a === "settle" || a === "resume" || a === "status") return a;
  const m = /^\+?(\d+)$/.exec(a);
  if (m) return `+${m[1]}`;
  throw new Error(`unknown clock command "${a}" (use freeze, +N, settle, resume or status)`);
}

export function agentUrl(scheme, path, params) {
  const q = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${scheme}://agent/${path}${q ? `?${q}` : ""}`;
}

/** Find the bridge reply for request `id` in logcat text. Returns the parsed object or null. */
export function parseAgentResult(logText, id) {
  let found = null;
  for (const line of String(logText).split("\n")) {
    const at = line.indexOf(RESULT_MARKER);
    if (at < 0) continue;
    try {
      const obj = JSON.parse(line.slice(at + RESULT_MARKER.length).trim());
      if (id === undefined || obj.id === id) found = obj;
    } catch {
      // A truncated or foreign line. Keep looking.
    }
  }
  return found;
}

export function parseForeground(dumpsysText) {
  const m = /(?:mResumedActivity|topResumedActivity|ResumedActivity)[^\n]*?\s([\w.]+)\/([\w.$]+)/.exec(dumpsysText);
  return m ? { package: m[1], activity: m[2].startsWith(".") ? m[1] + m[2] : m[2] } : null;
}

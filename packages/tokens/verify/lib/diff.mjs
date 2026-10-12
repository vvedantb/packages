// Semantic diff of two compiled (Tailwind --optimize) stylesheets.
//
// Every rule is split per selector and keyed by (at-rule context chain +
// selector). Declarations of one key merge with last-wins per property
// (+ importance), which is the cascade for identical selectors in the same
// context, so splitting or moving a rule within its key does not count as a
// change. A separate check looks for order flips between different keys.
import { resolveParams } from "./migrate.mjs";
import { loadPostcss } from "./css.mjs";
import { scratchImport } from "./env.mjs";

let selectorParser;

const ws = (s) => s.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim();
// lightningcss shortens times (100ms -> .1s) except inside var(); compare in ms
const times = (s) =>
  s.replace(/(^|[\s,(])(\d*\.?\d+)(ms|s)\b/g, (_, pre, n, u) => `${pre}${+(Number(n) * (u === "s" ? 1000 : 1)).toFixed(3)}ms`);
export const normValue = (s) => times(ws(s));

function atLabel(n) {
  return `@${n.name}${n.params ? ` ${ws(n.params)}` : ""}`;
}

function layerOf(ctx) {
  const layers = ctx.filter((c) => c.startsWith("@layer ")).map((c) => c.slice(7));
  return layers.length ? layers.join(".") : "(unlayered)";
}

/** Flattens a stylesheet into ordered items. */
export async function flatten(css, params) {
  const postcss = await loadPostcss();
  selectorParser ??= (await scratchImport("postcss-selector-parser")).default;
  const root = postcss.parse(css);
  const items = [];
  let rawRules = 0;
  root.walk((node) => {
    for (let p = node.parent; p; p = p.parent) if (p.type === "atrule" && /keyframes$/.test(p.name)) return;
    const ctx = [];
    for (let p = node.parent; p && p.type !== "root"; p = p.parent) ctx.unshift(atLabel(p));
    if (node.type === "atrule" && /keyframes$/.test(node.name)) {
      const text = ws(resolveParams(node.nodes.map((n) => n.toString()).join(" "), params));
      items.push({ ctx, sel: `@${node.name} ${node.params}`, decls: new Map([["(text)", text]]), layer: "(keyframes)" });
      return;
    }
    if (node.type === "atrule" && !node.nodes) {
      items.push({ ctx, sel: atLabel(node), decls: new Map([["(stmt)", ""]]), layer: "(statements)" });
      return;
    }
    if (node.type === "atrule" && node.nodes?.some((c) => c.type === "decl")) {
      // @property, @font-face, @page ...
      const decls = new Map();
      for (const d of node.nodes.filter((c) => c.type === "decl")) decls.set(d.prop, ws(d.value));
      items.push({ ctx, sel: atLabel(node), decls, layer: "(at-rule)" });
      return;
    }
    if (node.type !== "rule") return;
    const own = node.nodes.filter((c) => c.type === "decl");
    if (!own.length) return;
    rawRules++;
    const decls = [];
    for (const d of own) {
      const prop = d.prop.startsWith("--") ? d.prop : d.prop.toLowerCase();
      decls.push([`${prop}${d.important ? " !important" : ""}`, normValue(resolveParams(ws(d.value), params))]);
    }
    const sels = [];
    selectorParser((sl) => sl.each((s) => sels.push(ws(s.toString())))).processSync(node.selector);
    for (const sel of sels) items.push({ ctx, sel, decls: new Map(decls), layer: layerOf(ctx), rule: node });
  });
  items.forEach((it, i) => {
    it.index = i;
    it.key = `${it.ctx.join(" > ")} | ${it.sel}`;
  });
  return { items, rawRules };
}

function merged(items) {
  const map = new Map();
  for (const it of items) {
    if (!map.has(it.key)) map.set(it.key, new Map());
    const m = map.get(it.key);
    for (const [p, v] of it.decls) {
      m.delete(p); // keep last-wins insertion order
      m.set(p, v);
    }
  }
  return map;
}

const show = (m) => [...m].map(([p, v]) => `${p}: ${v}`).join("; ");

/** Compares the merged per-key maps. `ignoreProps` drops declarations (e.g. the --tokens-* params). */
export function compare(before, after, ignoreProps = new Set()) {
  const strip = (map) => {
    for (const [k, m] of map) {
      for (const p of [...m.keys()]) if (ignoreProps.has(p.split(" ")[0])) m.delete(p);
      if (!m.size) map.delete(k);
    }
    return map;
  };
  const b = strip(merged(before.items));
  const a = strip(merged(after.items));
  const out = { identical: 0, removed: [], added: [], changed: [] };
  for (const [k, m] of b) {
    if (!a.has(k)) out.removed.push(`${k} { ${show(m)} }`);
    else {
      const n = a.get(k);
      const diffs = [];
      for (const p of new Set([...m.keys(), ...n.keys()])) {
        if (m.get(p) !== n.get(p)) diffs.push(`${p}: ${m.get(p) ?? "(none)"} -> ${n.get(p) ?? "(none)"}`);
      }
      if (diffs.length) out.changed.push(`${k}\n      ${diffs.join("\n      ")}`);
      else out.identical++;
    }
  }
  for (const [k, m] of a) if (!b.has(k)) out.added.push(`${k} { ${show(m)} }`);
  return out;
}

// ---- cascade order -----------------------------------------------------------

const family = (prop) => {
  const p = prop.replace(/^-(webkit|moz|ms)-/, "");
  if (p.startsWith("--")) return p;
  if (["top", "right", "bottom", "left", "inset"].includes(p) || p.startsWith("inset-")) return "inset";
  if (p === "row-gap" || p === "column-gap") return "gap";
  return p.split("-")[0];
};
const overlapProps = (a, b) => {
  const x = a.replace(/^-(webkit|moz|ms)-/, "");
  const y = b.replace(/^-(webkit|moz|ms)-/, "");
  return x === y || x.startsWith(`${y}-`) || y.startsWith(`${x}-`) || family(x) === "inset" && family(y) === "inset" || family(x) === "gap" && family(y) === "gap";
};

function specificity(sel) {
  let spec = [0, 0, 0];
  const add = (s) => (spec = spec.map((v, i) => v + s[i]));
  const max = (list) => list.reduce((m, s) => (s[0] - m[0] || s[1] - m[1] || s[2] - m[2]) > 0 ? s : m, [0, 0, 0]);
  const walk = (container) => {
    const out = [0, 0, 0];
    container.each((n) => {
      if (n.type === "id") out[0]++;
      else if (n.type === "class" || n.type === "attribute") out[1]++;
      else if (n.type === "tag") out[2]++;
      else if (n.type === "pseudo") {
        const name = n.value.toLowerCase();
        if (name === ":where") return;
        if ([":is", ":not", ":has", ":matches"].includes(name)) {
          const s = max(n.nodes.map(walk));
          out[0] += s[0];
          out[1] += s[1];
          out[2] += s[2];
        } else if (name.startsWith("::") || [":before", ":after", ":first-line", ":first-letter"].includes(name)) out[2]++;
        else out[1]++;
      }
    });
    return out;
  };
  selectorParser((sl) => sl.each((s) => add(walk(s)))).processSync(sel);
  return spec.join(",");
}

// Last compound of a selector as a set of simple-selector tokens, plus its
// pseudo-element. `:root` counts as `html`.
function lastCompound(sel) {
  const tokens = new Set();
  let pseudoEl = "";
  selectorParser((sl) =>
    sl.each((s) => {
      const nodes = s.nodes;
      let i = nodes.length - 1;
      while (i >= 0 && nodes[i].type !== "combinator") i--;
      for (const n of nodes.slice(i + 1)) {
        if (n.type === "universal" || n.type === "nesting") continue;
        const t = n.toString().trim();
        if (n.type === "pseudo" && (n.value.startsWith("::") || [":before", ":after"].includes(n.value))) pseudoEl = t.replace(/^:(?!:)/, "::");
        else tokens.add(t === ":root" ? "html" : t);
      }
    }),
  ).processSync(sel);
  return { tokens, pseudoEl };
}

function likelySameElement(a, b) {
  const x = lastCompound(a);
  const y = lastCompound(b);
  if (x.pseudoEl !== y.pseudoEl) return null; // never the same box
  const sub = (p, q) => [...p].every((t) => q.has(t));
  return sub(x.tokens, y.tokens) || sub(y.tokens, x.tokens);
}

// position of the winning declaration for (key, prop) = last item that sets it
function positions(items) {
  const pos = new Map();
  for (const it of items) {
    if (it.layer.startsWith("(")) continue;
    for (const [p, v] of it.decls) pos.set(`${it.key}\u0000${p}`, { it, prop: p, value: v, index: it.index });
  }
  return pos;
}

/**
 * Pairs of (key, property) that compete (same layer, same importance,
 * overlapping property, equal specificity, different value) and whose
 * winner flips between before and after. Fails when the selectors' last
 * compounds can match the same element; warns otherwise.
 */
export function cascadeCheck(before, after, ignoreProps = new Set()) {
  const pb = positions(before.items);
  const pa = positions(after.items);
  const groups = new Map();
  for (const [id, b] of pb) {
    const a = pa.get(id);
    if (!a) continue;
    const [prop, imp = ""] = b.prop.split(" ");
    if (ignoreProps.has(prop)) continue;
    const g = `${b.it.layer}\u0000${imp}\u0000${family(prop)}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ b, a, prop });
  }
  const fails = [];
  const warns = [];
  const specCache = new Map();
  const spec = (s) => specCache.get(s) ?? (specCache.set(s, specificity(s)), specCache.get(s));
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const x = list[i];
        const y = list[j];
        if (x.b.it.key === y.b.it.key) continue;
        if (!overlapProps(x.prop, y.prop)) continue;
        if (x.prop === y.prop && x.b.value === y.b.value) continue;
        if (Math.sign(x.b.index - y.b.index) === Math.sign(x.a.index - y.a.index)) continue;
        if (spec(x.b.it.sel) !== spec(y.b.it.sel)) continue;
        const line = `[${x.b.it.layer}] ${x.b.it.key} { ${x.b.prop}: ${x.b.value} }  <->  ${y.b.it.key} { ${y.b.prop}: ${y.b.value} }`;
        const same = likelySameElement(x.b.it.sel, y.b.it.sel);
        if (same !== null) (same ? fails : warns).push(line);
      }
    }
  }
  return { fails, warns };
}
